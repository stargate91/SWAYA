import logging
from typing import Any
from sqlalchemy.orm import Session
from app.core.identifier_utils import parse_identifier



from app.modules.settings.services.settings_service import SettingsService
from app.modules.library.services.detail.formatters.porndb_movie import PornDbMovieFormatter
from app.modules.library.services.detail.formatters.tmdb_movie import TmdbMovieFormatter
from app.modules.library.services.detail.formatters.local_movie import LocalMovieFormatter

logger = logging.getLogger(__name__)

class MovieDetailService:
    def __init__(self, db: Session, scrapers: Any):
        self.db = db
        self.scrapers = scrapers
        self.settings = SettingsService(db)
        self.porndb_formatter = PornDbMovieFormatter(self.settings)
        self.tmdb_formatter = TmdbMovieFormatter(self.settings)
        self.local_formatter = LocalMovieFormatter(self.settings)

    def get_library_item_detail(self, item_id: str, full_people: bool = False):
        from app.core.user_context import get_current_user_id
        current_uid = get_current_user_id()

        # Resolve TV Episode string (e.g. tmdb_1863_1_1) to local media item ID if possible
        parsed = parse_identifier(item_id) if isinstance(item_id, str) else None
        if parsed and parsed.episode is not None and parsed.provider in ("tmdb", "tv"):
            from app.modules.history.services.playback_history_service import PlaybackHistoryService
            playback_repo = PlaybackHistoryService(self.db)
            resolved_id = playback_repo.resolve_item_id_from_external(item_id)
            if resolved_id:
                item_id = resolved_id

        # Tracked / External PornDB Movie Detail
        if isinstance(item_id, str) and item_id.startswith("porndb_"):
            return self.porndb_formatter.format(item_id, self.db, self.scrapers, current_uid)

        # Tracked / External TMDB Movie Detail
        if isinstance(item_id, str) and item_id.startswith("tmdb_"):
            return self.tmdb_formatter.format(item_id, self.db, self.scrapers, current_uid)

        # Local MediaItem Detail
        return self.local_formatter.format(item_id, self.db, self.scrapers, current_uid)
