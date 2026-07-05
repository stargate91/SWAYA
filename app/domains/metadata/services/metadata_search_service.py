import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.shared_kernel.enums import Provider
from app.shared_kernel.ports.scrapers import ScraperGatewayPort

from app.domains.metadata.services.search.adult_search_resolver import AdultSearchResolver
from app.domains.metadata.services.search.tmdb_search_resolver import TmdbSearchResolver
from app.domains.metadata.services.search.details_fetcher import DetailsFetcher

from app.shared_kernel.ports.media_item_port import MediaItemPort

logger = logging.getLogger(__name__)

class MetadataSearchService:
    def __init__(self, db: Session, scrapers: ScraperGatewayPort, tmdb: Any, media_item_port: Optional[MediaItemPort] = None):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = tmdb
        self.media_item_port = media_item_port
        self.adult_resolver = AdultSearchResolver()
        self.tmdb_resolver = TmdbSearchResolver()
        self.details_fetcher = DetailsFetcher()

    def search_metadata(self, query: str, item_type: str = "movie", year: Optional[int] = None, language: Optional[str] = None, provider: Optional[str] = None, include_adult: bool = False, season: Optional[int] = None, episode: Optional[int] = None) -> List[Dict[str, Any]]:
        """Coordinates metadata searches for movies, tv shows, or scenes across multiple providers."""
        prov_enum = None
        if provider:
            try:
                prov_enum = Provider(provider.lower())
            except ValueError as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)

        if not prov_enum and item_type in ("scene", "adult"):
            prov_enum = Provider.STASHDB

        if prov_enum in (Provider.STASHDB, Provider.PORNDB, Provider.FANSDB):
            return self.adult_resolver.search_metadata(
                db=self.db,
                scrapers=self.scrapers,
                query=query,
                item_type=item_type,
                year=year,
                prov_enum=prov_enum
            )

        return self.tmdb_resolver.search_tmdb(
            tmdb_client=self.tmdb,
            query=query,
            item_type=item_type,
            year=year,
            language=language,
            include_adult=include_adult
        )

    def get_seasons(self, tmdb_id: int) -> List[Dict[str, Any]]:
        """Retrieves seasons list for a TV show."""
        return self.details_fetcher.get_seasons(self.tmdb, tmdb_id)

    def get_episodes(self, tmdb_id: int, season_number: int) -> List[Dict[str, Any]]:
        """Retrieves episodes list for a TV season."""
        return self.details_fetcher.get_episodes(self.tmdb, tmdb_id, season_number)

    def global_search(self, query: str, source: str, search_type: str, include_adult: bool = False, language: Optional[str] = None) -> List[Dict[str, Any]]:
        """Executes a global search across either mainstream (TMDB) or adult scraper sources."""
        if not include_adult and source.lower() != "tmdb":
            return []

        source_lower = source.lower()
        type_lower = search_type.lower()

        if source_lower == "tmdb":
            if type_lower == "all":
                return self.tmdb_resolver.global_search_all(self.tmdb, query, include_adult, language)
            elif type_lower == "movie":
                return self.search_metadata(query, item_type="movie", provider="tmdb", include_adult=include_adult, language=language)
            elif type_lower == "tv":
                return self.search_metadata(query, item_type="tv", provider="tmdb", include_adult=include_adult, language=language)
            elif type_lower == "person":
                return self.tmdb_resolver.global_search_person(self.tmdb, query, include_adult, language)
        else:
            try:
                prov_enum = Provider(source_lower)
            except ValueError:
                return []

            if type_lower == "scene":
                return self.search_metadata(query, item_type="scene", provider=source_lower, include_adult=include_adult, language=language)
            elif type_lower == "movie":
                return self.search_metadata(query, item_type="movie", provider=source_lower, include_adult=include_adult, language=language)
            elif type_lower == "person":
                return self.adult_resolver.search_performers(self.db, self.scrapers, query, prov_enum)

        return []

    def get_full_metadata(self, item_id: str, media_type: str = None, language: str = None) -> Dict[str, Any]:
        """Fetches detailed full metadata details for a matched item."""
        return self.details_fetcher.get_full_metadata(
            db=self.db,
            scrapers=self.scrapers,
            tmdb_client=self.tmdb,
            item_id=item_id,
            media_type=media_type,
            language=language,
            media_item_port=self.media_item_port
        )
