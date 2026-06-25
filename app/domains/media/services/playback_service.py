import logging
import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.shared_kernel.exceptions import NotFoundException
from app.domains.media.services.playback_domain_service import PlaybackDomainService

logger = logging.getLogger(__name__)

class PlaybackService:
    def __init__(
        self,
        db: Session,
        overrides_service: Optional[Any] = None,
        playback_repo: Optional[Any] = None,
        library_port: Optional[Any] = None
    ):
        self.db = db
        
        if library_port is None:
            from app.infrastructure.media.db_media_resolver import DbMediaResolver
            self.library_port = DbMediaResolver(db)
        else:
            self.library_port = library_port

        if playback_repo is None:
            from app.infrastructure.repositories.db_playback_repository import DbPlaybackRepository
            self.playback_repo = DbPlaybackRepository(db)
        else:
            self.playback_repo = playback_repo

        if overrides_service:
            self.overrides = overrides_service
        else:
            from app.domains.users.services.overrides_service import OverridesService
            self.overrides = OverridesService(db, self.library_port)

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
        return item, override, start_seconds

    def add_watch_history_entry(self, item_id: int, watched_at_raw: Any = None) -> Any:
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

    def update_watch_history_entry(self, item_id: int, log_id: int, watched_at_raw: Any = None) -> Any:
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

    def delete_watch_history_entry(self, item_id: int, log_id: int) -> Any:
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

    def reset_item_progress(self, item_id: int) -> Tuple[int, bool]:
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
