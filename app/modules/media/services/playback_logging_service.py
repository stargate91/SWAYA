import logging
from typing import Any
from sqlalchemy.orm import Session
from app.core.language import LanguageService
from app.modules.media.schemas import WatchedHistoryResponse
from app.core.episode_utils import get_first_int

logger = logging.getLogger(__name__)

class PlaybackLoggingService:
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
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        for log in logs:
            item = log.media_item
            if not item:
                continue

            active_match = next((match for match in item.matches if match.is_active), None)
            loc = LanguageService.get_best_localization(active_match.localizations, ui_lang) if active_match else None
            override = overrides.get_or_create_media_item_override(item.id)

            title = loc.title if loc else item.filename
            
            from app.modules.history.playback.playback_monitor import active_sessions
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

            from app.core.enums import MediaType
            tv_title = None
            episode_title = None
            tv_poster_path = None
            
            if active_match and active_match.media_type == MediaType.EPISODE:
                episode_title = title
                tv_match = active_match.parent_show
                
                if tv_match:
                    from app.modules.users.models import UserOverride
                    tv_override = db.query(UserOverride).filter(
                        UserOverride.metadata_match_id == tv_match.id,
                        UserOverride.user_id == log.user_id
                    ).first()
                    tv_loc = tv_match.localizations[0] if tv_match.localizations else None
                    tv_title = (tv_override.custom_title if (tv_override and tv_override.custom_title) else None) or (tv_loc.title if tv_loc else None)
                    if tv_loc and tv_loc.poster_path:
                        tv_poster_path = resolve_img_fn(tv_loc.poster_path, "posters")


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
