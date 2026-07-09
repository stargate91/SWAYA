import logging
from pathlib import Path
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.shared_kernel.enums import MediaType, ItemStatus
from app.shared_kernel.language import LanguageService
from app.application.organizer.schemas import OrganizerGroupsResponse
from app.application.organizer.strategies.base_organizer import BaseMediaOrganizer
from app.application.organizer.organizer_helper import OrganizerHelper

logger = logging.getLogger(__name__)

class OrganizerGroupsBuilder:
    def __init__(self, img_service: Any):
        self.img_service = img_service

    def _resolve_image_with_fallback(self, local_path: Optional[str], remote_path: Optional[str], subfolder: str) -> Optional[str]:
        resolved = self.img_service.resolve_image_url(local_path, subfolder)
        if resolved:
            return resolved
        return self.img_service.resolve_image_url(remote_path, subfolder)

    def get_organizer_groups(
        self,
        db: Session,
        scan_mode: Optional[str],
        session_mode: Optional[str],
        pref_lang: str
    ) -> OrganizerGroupsResponse:
        """Processes unorganized files and categorizes them into Movies, TV Shows, Extras, and Manual resolution groups."""
        items = OrganizerHelper.get_unorganized_media_items(db, scan_mode, session_mode)

        from app.shared_kernel.user_context import get_current_user_id
        current_uid = get_current_user_id()

        from app.infrastructure.settings.formatter_config_adapter import build_formatter_from_db
        formatter = build_formatter_from_db(db, user_id=current_uid)

        groups = {"manual": [], "movies": [], "tv": [], "extras": [], "collisions": []}
        parent_planned_paths = {}
        parent_types = {}
        parent_statuses = {}
        parent_is_adults = {}

        previews = []
        preview_map = {}
        for item in items:
            active_match = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
            if active_match and not active_match.is_active:
                active_match = None
            
            m_override = active_match.overrides if (active_match and active_match.overrides and active_match.overrides.user_id == current_uid) else None
            overrides = m_override or item.overrides
            target_lang = overrides.custom_language if (overrides and overrides.custom_language) else (formatter.config.default_target_language or pref_lang)
            loc = None
            if active_match:
                from app.shared_kernel.enums import Provider
                if active_match.provider == Provider.TMDB and target_lang:
                    target_lang_clean = LanguageService.resolve_request_locale(Provider.TMDB, target_lang)
                    if target_lang_clean:
                        has_target_loc = any(
                            LanguageService.resolve_request_locale(Provider.TMDB, localization.locale) == target_lang_clean
                            for localization in active_match.localizations
                        )
                        if not has_target_loc:
                            try:
                                from app.infrastructure.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
                                enricher = MainstreamEnricher(db)
                                enricher.enrich_matched_item(item, language=target_lang_clean, commit=True)
                                db.refresh(active_match)
                            except Exception as e:
                                logger.error(f"Failed on-the-fly enrichment for item {item.id} in {target_lang_clean}: {e}")
                loc = LanguageService.get_best_localization(active_match.localizations, target_lang)
            try:
                preview = formatter.format_item(item, active_match, loc)
                previews.append(preview)
                preview_map[item.id] = preview
            except Exception as e:
                logger.debug(f"Swallowed exception in get_organizer_groups formatting: {e}", exc_info=True)

        if previews:
            formatter.resolve_collisions(previews)

        for item in items:
            active_match = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
            if active_match and not active_match.is_active:
                active_match = None
            m_override = active_match.overrides if (active_match and active_match.overrides and active_match.overrides.user_id == current_uid) else None
            overrides = m_override or item.overrides
            target_lang = overrides.custom_language if (overrides and overrides.custom_language) else (formatter.config.default_target_language or pref_lang)
            preview = preview_map.get(item.id)
            if preview:
                planned_path = str(preview.target_path).replace("\\", "/")
                action = getattr(preview, "action", "rename")
            else:
                planned_path = item.planned_path
                action = None

            parent_planned_paths[item.id] = planned_path
            matches_dto = []
            for m in item.matches:
                loc = LanguageService.get_best_localization(m.localizations, pref_lang)
                tv_show_match = None
                tv_loc = None
                
                resolved_poster = None
                if m.media_type.value == "scene":
                    resolved_poster = self._resolve_image_with_fallback(m.local_backdrop_path, m.backdrop_path, "scene_stills")
                    if not resolved_poster:
                        resolved_poster = self._resolve_image_with_fallback(m.local_still_path, m.still_path, "stills")
                else:
                    tv_show_match = None
                    curr = m
                    while curr:
                        if curr.media_type.value == "tv":
                            tv_show_match = curr
                            break
                        curr = curr.parent

                    tv_loc = None
                    if tv_show_match:
                        tv_loc = LanguageService.get_best_localization(tv_show_match.localizations, pref_lang)
                        if tv_loc:
                            resolved_poster = self._resolve_image_with_fallback(tv_loc.local_poster_path, tv_loc.poster_path, "posters")

                    if not resolved_poster and loc:
                        resolved_poster = self._resolve_image_with_fallback(loc.local_poster_path, loc.poster_path, "posters")
                    if not resolved_poster:
                        resolved_poster = self._resolve_image_with_fallback(m.local_backdrop_path, m.backdrop_path, "backdrops")

                matches_dto.append({
                    "id": m.id,
                    "tmdb_id": int(m.external_id) if m.external_id.isdigit() else m.external_id,
                    "type": m.media_type.value,
                    "title": tv_loc.title if tv_loc else (loc.title if loc else ""),
                    "year": m.release_date.year if m.release_date else None,
                    "poster_path": resolved_poster,
                    "vote_average": m.rating_tmdb,
                    "is_active": m.is_active,
                    "confidence": m.confidence_score,
                    "is_adult": m.is_adult,
                    "provider": m.provider.value if m.provider else None,
                    "is_home_video": m.is_home_video,
                    "last_air_date": (tv_show_match.last_air_date.isoformat() if tv_show_match.last_air_date else None) if tv_show_match else (m.last_air_date.isoformat() if m.last_air_date else None),
                    "release_status": tv_show_match.release_status if tv_show_match else m.release_status
                })

            itype = OrganizerHelper.infer_organizer_type(item)
            strategy = BaseMediaOrganizer.get_strategy(itype, db, self.img_service)
            active_m = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
            images_list = strategy.build_images_list(item, active_m, target_lang)

            parent_types[item.id] = itype
            parent_statuses[item.id] = item.status.value
            item_scan_mode = str((item.parsed_info or {}).get("scan_mode") or "").lower()
            parent_scan_modes = getattr(self, "_parent_scan_modes", None)
            if parent_scan_modes is None:
                parent_scan_modes = {}
                self._parent_scan_modes = parent_scan_modes
            parent_scan_modes[item.id] = item_scan_mode
            
            if item_scan_mode in {"scenes", "porndb_movie"}:
                item_is_adult = True
            else:
                active_match = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
                item_is_adult = active_match.is_adult if active_match else False
            parent_is_adults[item.id] = item_is_adult

            parsed = item.parsed_info or {}
            fn_data = parsed.get("fn") or {}
            it_data = parsed.get("it") or {}
            fd_data = parsed.get("fd") or {}
            season_val = parsed.get("season") or fn_data.get("season") or it_data.get("season") or fd_data.get("season")
            if season_val is None and active_match:
                season_val = active_match.season_number
            episode_val = parsed.get("episode") or fn_data.get("episode") or it_data.get("episode") or fd_data.get("episode")
            if episode_val is None and active_match:
                episode_val = active_match.episode_number

            custom_edition_val = item.custom_edition.value if item.custom_edition else (item.edition.value if item.edition else "none")
            custom_audio_type_val = item.custom_audio_type.value if item.custom_audio_type else (item.audio_type.value if item.audio_type else "none")
            custom_source_val = item.custom_source.value if item.custom_source else (item.source.value if item.source else "none")

            item_dto = {
                "id": item.id,
                "filename": item.filename,
                "status": item.status.value,
                "type": itype,
                "title": item.filename,
                "planned_path": planned_path,
                "extension": item.extension,
                "size_mb": round((item.size or 0) / (1024 * 1024), 2),
                "images": images_list,
                "matches": matches_dto,
                "current_path": item.current_path,
                "action": action,
                "target_language": target_lang,
                "scan_mode": item_scan_mode,
                "season": str(season_val) if season_val is not None else None,
                "episode": str(episode_val) if episode_val is not None else None,
                "custom_edition": custom_edition_val,
                "custom_audio_type": custom_audio_type_val,
                "custom_source": custom_source_val,
                "parsed_info": item.parsed_info or {}
            }

            if item.status in [ItemStatus.NEW, ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH, ItemStatus.MULTIPLE, ItemStatus.ERROR]:
                groups["manual"].append(item_dto)
            else:
                is_movie = any(m.media_type == MediaType.MOVIE for m in item.matches)
                if is_movie:
                    groups["movies"].append(item_dto)
                else:
                    groups["tv"].append(item_dto)

        extras = OrganizerHelper.get_unorganized_extra_files(db, scan_mode, session_mode)

        parent_scan_modes = getattr(self, "_parent_scan_modes", {})
        extra_parent_ids = {ex.media_item_id for ex in extras}
        missing_parent_ids = extra_parent_ids - set(parent_planned_paths.keys())
        if missing_parent_ids:
            missing_parents = OrganizerHelper.get_missing_parents(db, missing_parent_ids)
            for parent in missing_parents:
                parent_planned_paths[parent.id] = parent.planned_path or parent.current_path
                parent_types[parent.id] = OrganizerHelper.infer_organizer_type(parent)
                parent_statuses[parent.id] = parent.status.value
                p_scan_mode = str((parent.parsed_info or {}).get("scan_mode") or "").lower()
                parent_scan_modes[parent.id] = p_scan_mode
                if p_scan_mode in {"scenes", "porndb_movie"}:
                    p_is_adult = True
                else:
                    active_match = next((m for m in parent.matches if m.is_active), None) or next((m for m in parent.matches), None)
                    p_is_adult = active_match.is_adult if active_match else False
                parent_is_adults[parent.id] = p_is_adult

        from app.domains.library.services.formatter.models import RenamePreview
        extra_previews = []
        for ex in extras:
            parent_p_path = parent_planned_paths.get(ex.media_item_id) or ""
            parent_name = Path(parent_p_path).stem if parent_p_path else Path(ex.media_item.filename).stem
            extra_ctx = formatter.build_extra_context(ex, parent_name)
            extra_name = formatter.format_extra_filename(extra_ctx)
            extra_subpath = formatter.get_extra_subpath(ex) or ""
            dest_root = str(Path(parent_p_path).parent if parent_p_path else Path(ex.current_path).parent).replace("\\", "/")

            preview = RenamePreview(
                item_id=ex.media_item_id,
                original_path=ex.current_path,
                target_name=extra_name,
                target_subpath=extra_subpath,
                item_type="extra",
                destination_root=dest_root,
                extra_id=ex.id,
            )
            extra_previews.append(preview)

        formatter.resolve_collisions(extra_previews)

        for ex, preview in zip(extras, extra_previews):
            parent_p_path = parent_planned_paths.get(ex.media_item_id) or ""
            parent_name = Path(parent_p_path).stem if parent_p_path else Path(ex.media_item.filename).stem
            groups["extras"].append({
                "id": ex.id,
                "parent_id": ex.media_item_id,
                "parent_type": parent_types.get(ex.media_item_id, "unknown"),
                "parent_status": parent_statuses.get(ex.media_item_id),
                "parent_name": parent_name,
                "filename": ex.filename,
                "extension": ex.extension,
                "category": ex.category.value,
                "subtype": ex.subtype.value if ex.subtype else "other",
                "language": ex.language,
                "path": ex.current_path,
                "planned_path": str(preview.target_path).replace("\\", "/"),
                "action": "rename",
                "parent_scan_mode": parent_scan_modes.get(ex.media_item_id, ""),
                "parent_is_adult": parent_is_adults.get(ex.media_item_id, False)
            })

        return OrganizerGroupsResponse(**groups)
