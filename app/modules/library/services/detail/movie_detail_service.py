import logging
from typing import Any
from sqlalchemy.orm import Session


from app.modules.library.services.detail._detail_formatter import DetailFormatter

# Import strategy formatters
from app.modules.library.services.detail.formatters.porndb_movie import PornDbMovieFormatter
from app.modules.library.services.detail.formatters.tmdb_movie import TmdbMovieFormatter
from app.modules.library.services.detail.formatters.local_movie import LocalMovieFormatter

logger = logging.getLogger(__name__)

class MovieDetailService(DetailFormatter):
    def __init__(self, db: Session, scrapers: Any):
        super().__init__()
        self.db = db
        self.scrapers = scrapers
        self.porndb_formatter = PornDbMovieFormatter()
        self.tmdb_formatter = TmdbMovieFormatter()
        self.local_formatter = LocalMovieFormatter()

    def get_library_item_detail(self, item_id: str, full_people: bool = False):
        from app.core.user_context import get_current_user_id
        current_uid = get_current_user_id()

        # Resolve TV Episode string (e.g. tmdb_1863_1_1) to local media item ID if possible
        if isinstance(item_id, str) and "_" in item_id:
            parts = item_id.split("_")
            if len(parts) >= 4 and parts[0] in ("tmdb", "tv"):
                from app.modules.history.services.playback_service import PlaybackService
                playback_repo = PlaybackService(self.db)
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
