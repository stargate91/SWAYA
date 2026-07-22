from typing import Optional, Any, Dict

from app.core.cache_service import CacheService


class ScraperService:
    """
    Unified facade service that delegates scraper operations to specialized
    sub-scraper classes (TMDB, OMDB, StashDB, PornDB, FansDB) to maintain domain separation.
    """

    def __init__(self, db: Any, cache_service: Optional[CacheService] = None):
        from app.modules.settings.services.settings_service import SettingsService
        self.db = db
        if isinstance(db, SettingsService):
            self.settings_service = db
        else:
            self.settings_service = SettingsService(db)
            
        self.cache = cache_service or CacheService()
        from app.core.enums import Provider
        from app.modules.scrapers.support.gateway import scraper_gateway
        self.tmdb = scraper_gateway.get_scraper(Provider.TMDB, self.settings_service)
        self.omdb = scraper_gateway.get_scraper(Provider.OMDB, self.settings_service)
        self.stashdb = scraper_gateway.get_scraper(Provider.STASHDB, self.settings_service)
        self.porndb = scraper_gateway.get_scraper(Provider.PORNDB, self.settings_service)
        self.fansdb = scraper_gateway.get_scraper(Provider.FANSDB, self.settings_service)

    def fetch_tmdb_movie(self, movie_id: str, language: Optional[str] = None, force_refresh: bool = False) -> Optional[dict]:
        return self.tmdb.fetch_movie(movie_id, language, force_refresh)

    def fetch_tmdb_tv(self, tv_id: str, language: Optional[str] = None, force_refresh: bool = False) -> Optional[dict]:
        return self.tmdb.fetch_tv(tv_id, language, force_refresh)

    def fetch_omdb(self, imdb_id: str, force_refresh: bool = False) -> Optional[dict]:
        return self.omdb.fetch_omdb(imdb_id, force_refresh)

    def fetch_stashdb_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        return self.stashdb.fetch_scene(scene_id, force_refresh)

    def fetch_porndb_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        return self.porndb.fetch_scene(scene_id, force_refresh)

    def fetch_fansdb_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        return self.fansdb.fetch_scene(scene_id, force_refresh)

    def log_search(
        self,
        task_id: Optional[int],
        media_item_id: Optional[int],
        provider: Any,
        search_query: str,
        result_count: int,
        details: Dict[str, Any]
    ) -> None:
        import logging
        from app.modules.tasks.models import ScraperLog
        logger = logging.getLogger(__name__)
        try:
            log_entry = ScraperLog(
                task_id=task_id,
                media_item_id=media_item_id,
                provider=provider,
                search_query=search_query,
                result_count=result_count,
                details=details
            )
            self.db.add(log_entry)
            self.db.flush()
        except Exception as e:
            logger.warning(f"Failed to save structured scraper search log: {e}")
