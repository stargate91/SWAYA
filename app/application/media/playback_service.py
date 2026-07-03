import os
import logging
import platform
import subprocess
import threading
from datetime import datetime, timezone
from app.application.media.playback_logging_service import PlaybackLoggingService
from typing import Optional, Any, List, Dict
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.shared_kernel.enums import Provider, MediaType
from app.domains.media_assets.services.images import image_processing_service
from app.shared_kernel.language import LanguageService
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.exceptions import NotFoundException
from app.application.media.schemas import (
    PlaybackStatusResponse,
    WatchHistoryResponse,
    WatchedHistoryResponse,
)
from app.domains.media.services.playback_domain_service import PlaybackDomainService

logger = logging.getLogger(__name__)


class PlaybackService:
    def __init__(
        self,
        db: Session,
        settings_port: Optional[Any] = None,
        overrides_service: Optional[Any] = None,
        playback_repo: Optional[Any] = None,
        library_port: Optional[Any] = None
    ):
        from app.infrastructure.media.db_media_resolver import DbMediaResolver
        from app.infrastructure.repositories.db_playback_repository import DbPlaybackRepository
        from app.domains.users.services.overrides_service import OverridesService

        resolved_library_port = library_port or DbMediaResolver(db)
        resolved_playback_repo = playback_repo or DbPlaybackRepository(db)
        resolved_overrides = overrides_service or OverridesService(db, resolved_library_port)

        self.db = db
        self.library_port = library_port or DbMediaResolver(db)
        self.playback_repo = playback_repo or DbPlaybackRepository(db)
        self.overrides = overrides_service or OverridesService(db, self.library_port)

        from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
        self.settings = settings_port or DbSettingsAdapter(db)
        self.playback_logging_service = PlaybackLoggingService()

    def track_playback_start(self, item_id: Any) -> Tuple[Any, Any, int]:
        try:
            item_id_int = int(item_id)
        except (ValueError, TypeError):
            item_id_int = self.playback_repo.resolve_item_id_from_external(item_id)
            if not item_id_int:
                raise NotFoundException(f"Media item not found for ID: {item_id}")

        item = self.library_port.get_item_by_id(item_id_int)
        if not item:
            raise NotFoundException("Media item not found")

        file_path = item.current_path
        if not file_path or not os.path.exists(file_path):
            raise NotFoundException(f"Media file not found at: {file_path}")

        override = self.overrides.get_or_create_media_item_override(item_id_int)
        override.last_watched_at = datetime.now(timezone.utc)
        
        existing_log = None
        if not override.is_watched:
            existing_log = self.playback_repo.get_latest_playback_log(item.id)

        if existing_log:
            self.playback_repo.update_playback_log_watched_at(existing_log.id, datetime.now(timezone.utc))
        else:
            self.playback_repo.create_playback_log(item.id, datetime.now(timezone.utc))
            override.watch_count = (override.watch_count or 0) + 1

        override.is_watched = False
        self.db.commit()

        start_seconds = override.resume_position or 0
        from typing import Tuple
        return item, override, start_seconds

    def add_watch_history_entry_core(self, item_id: int, watched_at_raw: Any = None) -> Any:
        item = self.library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        watched_at = PlaybackDomainService.parse_watched_at(watched_at_raw)
        self.playback_repo.create_playback_log(item.id, watched_at)
        self.db.refresh(item)
        self._recalculate_watch_state(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_watch_history_entry_core(self, item_id: int, log_id: int, watched_at_raw: Any = None) -> Any:
        item = self.library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        log = self.playback_repo.get_playback_log_by_id(log_id, item_id)
        if not log:
            raise NotFoundException("Watch history entry not found")

        new_watched_at = PlaybackDomainService.parse_watched_at(watched_at_raw)
        self.playback_repo.update_playback_log_watched_at(log.id, new_watched_at)
        self.db.refresh(item)
        self._recalculate_watch_state(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_watch_history_entry_core(self, item_id: int, log_id: int) -> Any:
        item = self.library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        log = self.playback_repo.get_playback_log_by_id(log_id, item_id)
        if not log:
            raise NotFoundException("Watch history entry not found")

        self.playback_repo.delete_playback_log(log.id)
        self.db.refresh(item)
        self._recalculate_watch_state(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def reset_item_progress_core(self, item_id: int) -> Tuple[int, bool]:
        override = self.overrides.get_or_create_media_item_override(item_id)
        if not override:
            raise NotFoundException("Item not found")

        override.resume_position = 0
        override.is_watched = False
        self.db.commit()
        return 0, False

    def get_watched_history_logs(self, page: int, limit: int, include_adult: bool) -> Tuple[List[Any], bool]:
        offset = (page - 1) * limit
        logs = self.playback_repo.get_watched_history_logs(offset, limit + 1, include_adult)
        has_more = len(logs) > limit
        if has_more:
            logs = logs[:limit]
        return logs, has_more

    def _recalculate_watch_state(self, item) -> None:
        override = self.overrides.get_or_create_media_item_override(item.id)
        PlaybackDomainService.recalculate_watch_state(item.playback_logs, override)

    def _resolve_img(self, path: Optional[str], subfolder: str) -> Optional[str]:
        return image_processing_service.resolve_image_url(path, subfolder)

    def _serialize_playback_logs(self, item) -> list[dict]:
        logs = sorted(item.playback_logs or [], key=lambda x: x.watched_at, reverse=True)
        return [
            {
                "id": log.id,
                "watched_at": log.watched_at.isoformat(),
            }
            for log in logs
            if getattr(log, "watched_at", None)
        ]

    def _watch_history_response(self, item) -> WatchHistoryResponse:
        override = self.overrides.get_or_create_media_item_override(item.id)
        
        return WatchHistoryResponse(
            status="success",
            watch_count=override.watch_count if override else 0,
            is_watched=override.is_watched if override else False,
            resume_position=override.resume_position if override else 0,
            last_watched_at=override.last_watched_at.isoformat() if (override and override.last_watched_at) else None,
            playback_logs=self._serialize_playback_logs(item),
        )

    def play_media_item(self, item_id: Any):
        from app.infrastructure.playback.player_detector import launch_media_file
        from app.infrastructure.playback.playback_monitor import monitor_playback

        try:
            item, override, start_seconds = self.track_playback_start(item_id)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

        file_path = item.current_path
        launch_result = launch_media_file(file_path, self.settings, start_seconds=start_seconds)
        proc = launch_result.get("process")
        player_type = launch_result.get("player_type")
        port = launch_result.get("port")

        if proc and player_type in {"vlc", "mpc"}:
            t = threading.Thread(
                target=monitor_playback,
                args=(item.id, player_type, proc, port, self.overrides.user_id),
                daemon=True
            )
            t.start()
            return PlaybackStatusResponse(
                status="success",
                message=f"Launched {player_type.upper()} with precision tracking.",
                player_type=player_type,
                port=port,
                resume_position=override.resume_position,
                is_watched=override.is_watched,
            )

        return PlaybackStatusResponse(
            status="success",
            message=f"Launched default player for {file_path}",
            player_type="default",
            resume_position=override.resume_position,
            is_watched=override.is_watched,
        )

    def get_playback_info(self, item_id: Any):
        from app.domains.library.models import MediaItem
        from app.domains.users.models import UserOverride
        
        try:
            item_id_int = int(item_id)
        except (ValueError, TypeError):
            item_id_int = self.playback_repo.resolve_item_id_from_external(item_id)
            if not item_id_int:
                raise NotFoundException(f"Media item not found for ID: {item_id}")
                
        item = self.library_port.get_item_by_id(item_id_int)
        if not item:
            raise NotFoundException("Media item not found")
            
        item, override, start_seconds = self.track_playback_start(item.id)
            
        logo_path = None
        title = item.filename
        match = next((m for m in item.matches), None)
        if match:
            loc = next((l for l in match.localizations), None)
            if loc:
                title = loc.title
                logo_path = loc.local_logo_path or loc.logo_path
            elif match.original_title:
                title = match.original_title
                
        if override and override.custom_logo:
            logo_path = override.custom_logo
                
        return {
            "file_path": item.current_path,
            "start_seconds": start_seconds,
            "title": title,
            "logo_path": logo_path
        }

    def update_playback_progress(self, item_id: Any, current_time: int, total_length: int) -> PlaybackStatusResponse:
        try:
            item_id_int = int(item_id)
        except (ValueError, TypeError):
            item_id_int = self.playback_repo.resolve_item_id_from_external(item_id)
            if not item_id_int:
                raise NotFoundException(f"Media item not found for ID: {item_id}")

        self.library_port.save_playback_position(item_id_int, current_time, total_length, self.overrides.user_id)
        self.db.commit()
        
        return PlaybackStatusResponse(
            status="success",
            message="Progress updated successfully",
            player_type="native",
            resume_position=current_time,
            is_watched=False
        )

    def preview_media_file(self, file_path: str, start_seconds: int = 0) -> PlaybackStatusResponse:
        from app.infrastructure.playback.player_detector import launch_media_file
        if not file_path or not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"Media file not found at: {file_path}"})

        launch_result = launch_media_file(file_path, self.settings, start_seconds=start_seconds)
        player_type = launch_result.get("player_type") or "default"
        port = launch_result.get("port")
        return PlaybackStatusResponse(
            status="success",
            message=f"Launched {player_type.upper()} preview for {file_path}",
            player_type=player_type,
            port=port,
        )

    def add_watch_history_entry(self, item_id: int, watched_at_raw: Any = None):
        try:
            item = self.add_watch_history_entry_core(item_id, watched_at_raw)
            return self._watch_history_response(item)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def update_watch_history_entry(self, item_id: int, log_id: int, watched_at_raw: Any = None):
        try:
            item = self.update_watch_history_entry_core(item_id, log_id, watched_at_raw)
            return self._watch_history_response(item)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def delete_watch_history_entry(self, item_id: int, log_id: int):
        try:
            item = self.delete_watch_history_entry_core(item_id, log_id)
            return self._watch_history_response(item)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def reset_item_progress(self, item_id: int) -> PlaybackStatusResponse:
        try:
            resume_pos, is_watched = self.reset_item_progress_core(item_id)
            return PlaybackStatusResponse(
                status="success",
                resume_position=resume_pos,
                is_watched=is_watched,
            )
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def get_watched_history(self, page: int = 1, limit: int = 20, include_adult: bool = False) -> WatchedHistoryResponse:
        return self.playback_logging_service.get_watched_history(
            db=self.db,
            playback_repo=self.playback_repo,
            overrides=self.overrides,
            resolve_img_fn=self._resolve_img,
            page=page,
            limit=limit,
            include_adult=include_adult
        )

    def reveal_in_explorer(self, path: str) -> PlaybackStatusResponse:
        if not path or not os.path.exists(path):
            return PlaybackStatusResponse(status="error", message=f"Path does not exist: {path}")
        
        path = os.path.abspath(path)
        try:
            if platform.system() == "Windows":
                subprocess.Popen(f'explorer /select,"{os.path.normpath(path)}"')
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", "-R", path])
            else:
                folder = os.path.dirname(path)
                subprocess.Popen(["xdg-open", folder])
            return PlaybackStatusResponse(status="success")
        except Exception as e:
            logger.error(f"Reveal failed: {e}")
            return PlaybackStatusResponse(status="error", message=str(e))

    def open_path(self, path: str) -> PlaybackStatusResponse:
        if not path or not os.path.exists(path):
            return PlaybackStatusResponse(status="error", message=f"Path does not exist: {path}")

        path = os.path.abspath(path)
        try:
            if platform.system() == "Windows":
                os.startfile(os.path.normpath(path))
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
            return PlaybackStatusResponse(status="success")
        except Exception as e:
            logger.error(f"Open path failed: {e}")
            return PlaybackStatusResponse(status="error", message=str(e))
