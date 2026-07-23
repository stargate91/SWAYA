import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.enums import Provider


from app.modules.metadata.services.search.adult_search_resolver import AdultSearchResolver
from app.modules.metadata.services.search.tmdb_search_resolver import TmdbSearchResolver
from app.modules.metadata.services.search.details_fetcher import DetailsFetcher



logger = logging.getLogger(__name__)

class MetadataSearchService:
    def __init__(self, db: Session, scrapers: Any, tmdb: Any, media_resolver: Optional[Any] = None):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = tmdb
        if media_resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            media_resolver = MediaItemService(db)
        self.media_resolver = media_resolver
        self.adult_resolver = AdultSearchResolver()
        self.tmdb_resolver = TmdbSearchResolver()
        self.details_fetcher = DetailsFetcher()

    def search_metadata(self, query: str, item_type: str = "movie", year: Optional[int] = None, language: Optional[str] = None, provider: Optional[str] = None, include_adult: bool = False, season: Optional[int] = None, episode: Optional[int] = None, page: int = 1) -> List[Dict[str, Any]]:
        """Coordinates metadata searches for movies, tv shows, or scenes across multiple providers."""
        prov_enum = None
        if provider:
            from app.modules.scrapers.support.registry import ProviderRegistry
            prov_enum = ProviderRegistry.resolve_prefix(provider)

        if not prov_enum and item_type in ("scene", "adult"):
            prov_enum = Provider.STASHDB

        from app.modules.scrapers.support.registry import ProviderRegistry
        from app.modules.scrapers.support.registry import ProviderRegistry
        if prov_enum and ProviderRegistry.is_adult_provider(prov_enum):
            results = self.adult_resolver.search_metadata(
                db=self.db,
                scrapers=self.scrapers,
                query=query,
                item_type=item_type,
                year=year,
                prov_enum=prov_enum
            )
        else:
            results = self.tmdb_resolver.search_tmdb(
                tmdb_client=self.tmdb,
                query=query,
                item_type=item_type,
                year=year,
                language=language,
                include_adult=include_adult,
                page=page
            )

        from app.modules.media_assets.services.images import image_processing_service
        for r in results:
            m_type = r.get("media_type") or item_type
            if r.get("poster_path"):
                subfolder = "people" if m_type == "person" else ("scene_stills" if m_type == "scene" else "posters")
                r["poster_path"] = image_processing_service.resolve_image_url(r["poster_path"], subfolder)
            if r.get("backdrop_path"):
                subfolder = "scene_stills" if m_type == "scene" else "backdrops"
                r["backdrop_path"] = image_processing_service.resolve_image_url(r["backdrop_path"], subfolder)
            if r.get("profile_path"):
                r["profile_path"] = image_processing_service.resolve_image_url(r["profile_path"], "people")

        return results

    def get_seasons(self, tmdb_id: int) -> List[Dict[str, Any]]:
        """Retrieves seasons list for a TV show."""
        return self.details_fetcher.get_seasons(self.tmdb, tmdb_id)

    def get_episodes(self, tmdb_id: int, season_number: int) -> List[Dict[str, Any]]:
        """Retrieves episodes list for a TV season."""
        return self.details_fetcher.get_episodes(self.tmdb, tmdb_id, season_number)

    def global_search(self, query: str, source: str, search_type: str, include_adult: bool = False, language: Optional[str] = None, page: int = 1) -> List[Dict[str, Any]]:
        """Executes a global search across either mainstream (TMDB) or adult scraper sources."""
        if not include_adult and source.lower() != "tmdb":
            return []

        source_lower = source.lower()
        type_lower = search_type.lower()
        results = []

        if source_lower == "tmdb":
            if type_lower == "all":
                results = self.tmdb_resolver.global_search_all(self.tmdb, query, include_adult, language, page=page)
            elif type_lower == "movie":
                results = self.search_metadata(query, item_type="movie", provider="tmdb", include_adult=include_adult, language=language, page=page)
            elif type_lower == "tv":
                results = self.search_metadata(query, item_type="tv", provider="tmdb", include_adult=include_adult, language=language, page=page)
            elif type_lower == "person":
                results = self.tmdb_resolver.global_search_person(self.tmdb, query, include_adult, language, page=page)
        else:
            try:
                prov_enum = Provider(source_lower)
            except ValueError:
                return []

            if type_lower == "scene":
                results = self.search_metadata(query, item_type="scene", provider=source_lower, include_adult=include_adult, language=language, page=page)
            elif type_lower == "movie":
                results = self.search_metadata(query, item_type="movie", provider=source_lower, include_adult=include_adult, language=language, page=page)
            elif type_lower == "person":
                results = self.adult_resolver.search_performers(self.db, self.scrapers, query, prov_enum, page=page)

        # 1. Post-process to calculate and append target_path
        from app.modules.media_assets.services.images import image_processing_service
        for r in results:
            target_path = None
            m_type = r.get("media_type")
            prov = r.get("provider") or source_lower
            r_id = r.get("id")
            
            if m_type == "movie":
                prefix = "porndb_" if prov == "porndb" else "tmdb_"
                target_path = f"/library/movie/{prefix}{r_id}"
            elif m_type == "tv":
                target_path = f"/library/tv/{r_id}"
            elif m_type == "person":
                target_path = f"/library/people/{r_id}"
            elif m_type == "scene":
                prefix = "porndb" if prov == "porndb" else ("fansdb" if prov == "fansdb" else "stash")
                target_path = f"/library/scene/{prefix}_{r_id}"
            elif m_type == "video":
                target_path = f"/library/video/{r_id}"
                
            r["target_path"] = target_path

            # Resolve image paths
            if r.get("poster_path"):
                subfolder = "people" if m_type == "person" else ("scene_stills" if m_type == "scene" else "posters")
                r["poster_path"] = image_processing_service.resolve_image_url(r["poster_path"], subfolder)
            if r.get("backdrop_path"):
                subfolder = "scene_stills" if m_type == "scene" else "backdrops"
                r["backdrop_path"] = image_processing_service.resolve_image_url(r["backdrop_path"], subfolder)
            if r.get("profile_path"):
                r["profile_path"] = image_processing_service.resolve_image_url(r["profile_path"], "people")

        # 2. Post-process to filter by performer gender preference
        if source_lower != "tmdb" and type_lower == "person":
            from app.modules.people.helpers import should_exclude_adult_performer
            results = [
                r for r in results
                if not should_exclude_adult_performer(self.db, r.get("gender"), is_adult=True)
            ]

        return results

    def get_full_metadata(self, item_id: str, media_type: str = None, language: str = None) -> Dict[str, Any]:
        """Fetches detailed full metadata details for a matched item."""
        return self.details_fetcher.get_full_metadata(
            db=self.db,
            scrapers=self.scrapers,
            tmdb_client=self.tmdb,
            item_id=item_id,
            media_type=media_type,
            language=language,
            media_resolver=self.media_resolver
        )
