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
        from app.modules.scrapers.support.registry import ProviderRegistry
        from app.modules.scrapers.support.gateway import scraper_gateway
        
        self.scrapers = {}
        for provider in ProviderRegistry.get_all_providers():
            try:
                self.scrapers[provider] = scraper_gateway.get_scraper(provider, self.settings_service)
            except Exception:
                # Some registered providers may not have scraper classes (e.g. Provider.MANUAL)
                pass

    @property
    def tmdb(self):
        from app.core.enums import Provider
        return self.scrapers.get(Provider.TMDB)

    @property
    def omdb(self):
        from app.core.enums import Provider
        return self.scrapers.get(Provider.OMDB)

    @property
    def stashdb(self):
        from app.core.enums import Provider
        return self.scrapers.get(Provider.STASHDB)

    @property
    def porndb(self):
        from app.core.enums import Provider
        return self.scrapers.get(Provider.PORNDB)

    @property
    def fansdb(self):
        from app.core.enums import Provider
        return self.scrapers.get(Provider.FANSDB)

    def get_scraper(self, provider: Provider) -> Optional[Any]:
        return self.scrapers.get(provider)

    def fetch_scene(self, provider: Provider, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        scraper = self.get_scraper(provider)
        if scraper and hasattr(scraper, "fetch_scene"):
            return scraper.fetch_scene(scene_id, force_refresh=force_refresh)
        return None

    def fetch_tmdb_movie(self, movie_id: str, language: Optional[str] = None, force_refresh: bool = False) -> Optional[dict]:
        return self.tmdb.fetch_movie(movie_id, language, force_refresh) if self.tmdb else None

    def fetch_tmdb_tv(self, tv_id: str, language: Optional[str] = None, force_refresh: bool = False) -> Optional[dict]:
        return self.tmdb.fetch_tv(tv_id, language, force_refresh) if self.tmdb else None

    def fetch_omdb(self, imdb_id: str, force_refresh: bool = False) -> Optional[dict]:
        return self.omdb.fetch_omdb(imdb_id, force_refresh) if self.omdb else None

    def fetch_stashdb_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        from app.core.enums import Provider
        return self.fetch_scene(Provider.STASHDB, scene_id, force_refresh)

    def fetch_porndb_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        from app.core.enums import Provider
        return self.fetch_scene(Provider.PORNDB, scene_id, force_refresh)

    def fetch_fansdb_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        from app.core.enums import Provider
        return self.fetch_scene(Provider.FANSDB, scene_id, force_refresh)

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
