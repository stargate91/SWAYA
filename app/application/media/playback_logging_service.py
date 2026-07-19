import logging
from typing import Any
from sqlalchemy.orm import Session

from app.domains.media.services.playback_domain_service import PlaybackDomainService
from app.shared_kernel.exceptions import NotFoundException
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.language import LanguageService
from app.application.media.schemas import WatchedHistoryResponse
from app.domains.users.models import UserOverride

logger = logging.getLogger(__name__)

class PlaybackLoggingService:
    def add_watch_history_entry_core(self, db: Session, library_port: Any, playback_repo: Any, item_id: int, watched_at_raw: Any = None) -> Any:
        item = library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        watched_at = PlaybackDomainService.parse_watched_at(watched_at_raw)
        playback_repo.create_playback_log(item.id, watched_at)
        db.refresh(item)
        
        # recalculate watch state
        override = db.query(UserOverride).filter(UserOverride.media_item_id == item.id).first()
        if not override:
            override = db.query(UserOverride).filter(
                UserOverride.media_item_id == item.id,
                UserOverride.user_id == 1  # fallback
            ).first()
        
        return item

    def get_watched_history(
        self,
        db: Session,
        playback_repo: Any,
        overrides: Any,
        resolve_img_fn: Any,
        page: int = 1,
        limit: int = 20,
        include_adult: bool = False
    ) -> WatchedHistoryResponse:
        offset = (page - 1) * limit
        logs = playback_repo.get_watched_history_logs(offset, limit + 1, include_adult)
        has_more = len(logs) > limit
        if has_more:
            logs = logs[:limit]

        results = []
        from app.shared_kernel.language_settings import get_user_ui_language
        from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
        settings_port = DbSettingsAdapter(db)
        ui_lang = get_user_ui_language(settings_port)
        for log in logs:
            item = log.media_item
            if not item:
                continue

            active_match = next((match for match in item.matches if match.is_active), None)
            loc = LanguageService.get_best_localization(active_match.localizations, ui_lang) if active_match else None
            override = overrides.get_or_create_media_item_override(item.id)

            title = loc.title if loc else item.filename
            
            from app.infrastructure.playback.playback_monitor import active_sessions
            is_active = item.id in active_sessions
            
            duration = int(item.duration) if item.duration else 0
            log_position = log.position_seconds or 0
            
            latest_log = playback_repo.get_latest_playback_log(item.id)
            is_latest = latest_log and (log.id == latest_log.id)
            if is_latest and override:
                log_position = override.resume_position
                log_is_watched = override.is_watched
                log_is_active = is_active
            else:
                log_is_watched = (duration > 0 and log_position / duration > 0.90)
                log_is_active = False

            log_position = int(log_position) if log_position is not None else 0

            from app.shared_kernel.enums import MediaType
            tv_title = None
            episode_title = None
            tv_poster_path = None
            
            if active_match and active_match.media_type == MediaType.EPISODE:
                episode_title = title
                tv_match = None
                if active_match.parent and active_match.parent.parent:
                    tv_match = active_match.parent.parent
                elif active_match.parent:
                    tv_match = active_match.parent
                
                if tv_match:
                    from app.domains.users.models import UserOverride
                    tv_override = db.query(UserOverride).filter(
                        UserOverride.metadata_match_id == tv_match.id,
                        UserOverride.user_id == log.user_id
                    ).first()
                    tv_loc = tv_match.localizations[0] if tv_match.localizations else None
                    tv_title = (tv_override.custom_title if (tv_override and tv_override.custom_title) else None) or (tv_loc.title if tv_loc else None)
                    if tv_loc and tv_loc.poster_path:
                        tv_poster_path = resolve_img_fn(tv_loc.poster_path, "posters")

            def get_first_int(val):
                if val is None:
                    return None
                if isinstance(val, (int, float)):
                    return int(val)
                if isinstance(val, list):
                    return get_first_int(val[0]) if val else None
                if isinstance(val, str):
                    if val.isdigit():
                        return int(val)
                    import json
                    try:
                        parsed = json.loads(val)
                        if isinstance(parsed, list):
                            return get_first_int(parsed[0]) if parsed else None
                        return int(parsed)
                    except Exception as e:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)
                return None

            results.append({
                "id": log.id,
                "media_item_id": item.id,
                "watched_at": log.watched_at.isoformat(),
                "title": title,
                "type": active_match.media_type.value if (active_match and hasattr(active_match.media_type, "value")) else (str(active_match.media_type) if active_match else "movie"),
                "season_number": get_first_int(active_match.season_number) if active_match else None,
                "episode_number": get_first_int(active_match.episode_number) if active_match else None,
                "poster_path": resolve_img_fn((loc.local_poster_path or loc.poster_path) if loc else None, "posters"),
                "backdrop_path": resolve_img_fn((active_match.local_backdrop_path or active_match.backdrop_path) if active_match else None, "backdrops"),
                "resume_position": log_position,
                "duration": duration,
                "is_watched": log_is_watched,
                "is_active": log_is_active,
                "tv_title": tv_title,
                "episode_title": episode_title,
                "tv_poster_path": tv_poster_path,
            })

        return WatchedHistoryResponse(
            items=results,
            page=page,
            has_more=has_more
        )
