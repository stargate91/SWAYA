import logging
from pathlib import Path
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.core.enums import ItemStatus
from app.core.language import LanguageService
from app.modules.organizer.services.strategies.base_organizer import BaseMediaOrganizer
from app.modules.organizer.services.organizer_helper import OrganizerHelper

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
        page: int = 1,
        page_size: int = 40,
        tab: str = "manual",
        sub_tab: Optional[str] = None,
        q: Optional[str] = None,
        sort_by: str = "source",
        sort_dir: str = "asc",
        scan_mode: Optional[str] = None,
        session_mode: Optional[str] = None,
        pref_lang: str = "en"
    ) -> Any:
        """Processes unorganized files and categorizes them into Movies, TV Shows, Extras, and Manual resolution groups with server-side pagination, sorting, and search."""
        items = OrganizerHelper.get_unorganized_media_items(db, scan_mode, session_mode)

        from app.core.user_context import get_current_user_id
        current_uid = get_current_user_id()

        from app.modules.settings.services.formatter_config_service import build_formatter_from_db
        formatter = build_formatter_from_db(db, user_id=current_uid)

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
                from app.core.enums import Provider
                if active_match.provider == Provider.TMDB and target_lang:
                    target_lang_clean = LanguageService.resolve_request_locale(Provider.TMDB, target_lang)
                    if target_lang_clean:
                        has_target_loc = any(
                            LanguageService.resolve_request_locale(Provider.TMDB, localization.locale) == target_lang_clean
                            for localization in active_match.localizations
                        )
                        if not has_target_loc:
                            try:
                                from app.modules.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
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
                logger.error(f"Swallowed exception in get_organizer_groups formatting: {e}", exc_info=True)

        if previews:
            formatter.resolve_collisions(previews)

        all_item_dtos = []
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
                if m.is_adult:
                    resolved_poster = self._resolve_image_with_fallback(m.local_backdrop_path, m.backdrop_path, "scene_stills")
                    if not resolved_poster:
                        resolved_poster = self._resolve_image_with_fallback(m.local_still_path, m.still_path, "stills")
                else:
                    tv_show_match = None
                    curr = m
                    while curr:
                        curr_mtype = curr.media_type.value if hasattr(curr.media_type, "value") else curr.media_type
                        if curr_mtype == "tv":
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
                    "type": m.media_type.value if hasattr(m.media_type, "value") else m.media_type,
                    "title": tv_loc.title if tv_loc else (loc.title if loc else ""),
                    "year": m.release_date.year if m.release_date else None,
                    "poster_path": resolved_poster,
                    "vote_average": m.rating_tmdb,
                    "is_active": m.is_active,
                    "confidence": m.confidence_score,
                    "is_adult": m.is_adult,
                    "provider": m.provider.value if hasattr(m.provider, "value") else m.provider,
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
            
            if item_scan_mode == "scenes":
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

            has_collision = getattr(preview, "has_collision", False) if preview else False
            source_fn = item.filename.split("/")[-1].split("\\")[-1]
            target_fn = planned_path.split("/")[-1] if planned_path else "-"
            
            st_lower = item.status.value.lower()
            if has_collision or st_lower == "error":
                status_tone = "danger"
            elif st_lower in ("new", "uncertain", "no_match", "multiple"):
                status_tone = "warning"
            elif st_lower in ("matched", "renamed", "organized"):
                status_tone = "success"
            else:
                status_tone = "default"
                
            if has_collision:
                display_status = "Collision"
            elif st_lower in ("matched", "renamed", "organized"):
                display_status = "Ready"
            elif st_lower == "no_match":
                display_status = "No Match"
            elif st_lower == "uncertain":
                display_status = "Uncertain"
            elif st_lower == "multiple":
                display_status = "Multiple Matches"
            elif st_lower == "error":
                display_status = "Error"
            else:
                display_status = "Pending"
                
            type_lower = itype.lower()
            if type_lower == "episode":
                display_type = "Episode"
            elif type_lower == "movie":
                display_type = "Movie"
            elif type_lower == "tv":
                display_type = "TV Show"
            elif type_lower == "scene":
                display_type = "Adult Scene"
            elif type_lower == "extra":
                display_type = "Extra"
            else:
                display_type = "Media"

            is_manual_val = item.status in [ItemStatus.NEW, ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH, ItemStatus.MULTIPLE, ItemStatus.ERROR]
            is_movie_val = itype == "movie"
            is_tv_val = itype in ("tv", "season", "episode")
            is_scene_val = itype in ("scene", "video")

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
                "parsed_info": item.parsed_info or {},
                "source_filename": source_fn,
                "target_filename": target_fn,
                "status_tone": status_tone,
                "display_type": display_type,
                "display_status": display_status,
                "has_collision": has_collision,
                "is_manual": is_manual_val,
                "is_movie": is_movie_val,
                "is_tv": is_tv_val,
                "is_scene": is_scene_val
            }
            all_item_dtos.append(item_dto)

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
                if p_scan_mode == "scenes":
                    p_is_adult = True
                else:
                    active_match = next((m for m in parent.matches if m.is_active), None) or next((m for m in parent.matches), None)
                    p_is_adult = active_match.is_adult if active_match else False
                parent_is_adults[parent.id] = p_is_adult

        from app.modules.library.services.formatter.models import RenamePreview
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

        all_extra_dtos = []
        for ex, preview in zip(extras, extra_previews):
            parent_p_path = parent_planned_paths.get(ex.media_item_id) or ""
            parent_name = Path(parent_p_path).stem if parent_p_path else Path(ex.media_item.filename).stem
            all_extra_dtos.append({
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

        # Calculate counts
        manual_movies = [it for it in all_item_dtos if it["is_manual"] and it["is_movie"]]
        manual_episodes = [it for it in all_item_dtos if it["is_manual"] and it["is_tv"]]
        manual_scenes = [it for it in all_item_dtos if it["is_manual"] and it["is_scene"]]

        movies = [it for it in all_item_dtos if not it["is_manual"] and it["is_movie"]]
        episodes = [it for it in all_item_dtos if not it["is_manual"] and it["is_tv"]]
        scenes = [it for it in all_item_dtos if not it["is_manual"] and it["is_scene"]]

        matched_parent_ids = {it["id"] for it in movies + episodes + scenes}
        valid_extras = [ex for ex in all_extra_dtos if ex["parent_id"] in matched_parent_ids]

        tab_counts = {
            "manualCount": len(manual_movies) + len(manual_episodes) + len(manual_scenes),
            "manualMoviesCount": len(manual_movies),
            "manualEpisodesCount": len(manual_episodes),
            "manualScenesCount": len(manual_scenes),
            "moviesCount": len(movies),
            "episodesCount": len(episodes),
            "scenesCount": len(scenes),
            "extrasCount": len(valid_extras),
            "extraBonusCount": len([ex for ex in valid_extras if ex["category"] == "video"]),
            "extraSubtitlesCount": len([ex for ex in valid_extras if ex["category"] == "subtitle"]),
            "extraAudioCount": len([ex for ex in valid_extras if ex["category"] == "audio"]),
            "extraImagesCount": len([ex for ex in valid_extras if ex["category"] == "image"]),
            "extraMetadataCount": len([ex for ex in valid_extras if ex["category"] == "metadata"]),
        }

        # Filter target list
        EXTRA_CATEGORY_BY_TAB = {
            "bonus": "video",
            "subtitles": "subtitle",
            "audio": "audio",
            "images": "image",
            "metadata": "metadata"
        }

        if tab == "manual":
            target_list = [it for it in all_item_dtos if it["is_manual"]]
            if sub_tab == "movies":
                target_list = [it for it in target_list if it["is_movie"]]
            elif sub_tab == "episodes":
                target_list = [it for it in target_list if it["is_tv"]]
            elif sub_tab == "scenes":
                target_list = [it for it in target_list if it["is_scene"]]
        elif tab == "movies":
            target_list = [it for it in all_item_dtos if not it["is_manual"] and it["is_movie"]]
        elif tab == "episodes":
            target_list = [it for it in all_item_dtos if not it["is_manual"] and it["is_tv"]]
        elif tab == "scenes":
            target_list = [it for it in all_item_dtos if not it["is_manual"] and it["is_scene"]]
        elif tab == "extras":
            target_list = valid_extras
            if sub_tab in EXTRA_CATEGORY_BY_TAB:
                target_list = [ex for ex in target_list if ex["category"] == EXTRA_CATEGORY_BY_TAB[sub_tab]]
        else:
            target_list = []

        # Apply search filter q
        if q:
            q_clean = q.lower().strip()
            def matches_query(dto: dict) -> bool:
                fields = [
                    dto.get("source_filename"),
                    dto.get("target_filename"),
                    dto.get("display_type"),
                    dto.get("display_status"),
                    dto.get("target_language"),
                    dto.get("extension")
                ]
                return any(q_clean in str(f).lower() for f in fields if f)

            def matches_query_extra(dto: dict) -> bool:
                fields = [
                    dto.get("filename"),
                    dto.get("planned_path", "").split("/")[-1],
                    dto.get("parent_name"),
                    dto.get("category"),
                    dto.get("subtype"),
                    dto.get("language"),
                    dto.get("extension")
                ]
                return any(q_clean in str(f).lower() for f in fields if f)

            if tab == "extras":
                target_list = [ex for ex in target_list if matches_query_extra(ex)]
            else:
                target_list = [it for it in target_list if matches_query(it)]

        # Apply sorting
        def get_sort_key(x, sort_by):
            if sort_by == "source":
                return str(x.get("source_filename") or x.get("filename") or "").lower()
            if sort_by == "target":
                t_fn = x.get("target_filename")
                if not t_fn and "planned_path" in x:
                    t_fn = x["planned_path"].split("/")[-1]
                return str(t_fn or "").lower()
            if sort_by == "type":
                return str(x.get("display_type") or "extra").lower()
            if sort_by == "status":
                return str(x.get("display_status") or x.get("action") or "").lower()
            if sort_by == "category":
                return str(x.get("category") or "-").lower()
            if sort_by == "language":
                return str(x.get("target_language") or x.get("language") or "-").lower()
            if sort_by == "extension":
                return str(x.get("extension") or "").lower()
            return ""

        reverse_sort = (sort_dir == "desc")
        target_list.sort(key=lambda x: get_sort_key(x, sort_by), reverse=reverse_sort)

        # Slice for pagination
        total_items = len(target_list)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = target_list[start:end]

        return {
            "items": paginated_items,
            "total_items": total_items,
            "tab_counts": tab_counts
        }
