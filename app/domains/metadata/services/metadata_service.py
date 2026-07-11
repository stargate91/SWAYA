import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.domains.metadata.schemas import MetadataResolveRequest, BulkResolveRequest

# Import sub-services
from app.domains.metadata.services.metadata_resolver import MetadataResolver
from app.domains.metadata.services.metadata_sync_service import MetadataSyncService
from app.domains.metadata.services.metadata_search_service import MetadataSearchService

from app.shared_kernel.ports.media_item_port import MediaItemPort

logger = logging.getLogger(__name__)

class MetadataService:
    def __init__(self, db: Session, scrapers: ScraperGatewayPort, media_item_port: Optional[MediaItemPort] = None):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = scrapers.tmdb(db)
        
        # Instantiate sub-services
        self.resolver = MetadataResolver(db, scrapers, self.tmdb, media_item_port=media_item_port)
        self.sync_service = MetadataSyncService()
        self.search_service = MetadataSearchService(db, scrapers, self.tmdb, media_item_port=media_item_port)

    def search_metadata(self, query: str, item_type: str = "movie", year: Optional[int] = None, language: Optional[str] = None, provider: Optional[str] = None, include_adult: bool = False, season: Optional[int] = None, episode: Optional[int] = None) -> List[Dict[str, Any]]:
        return self.search_service.search_metadata(
            query=query, item_type=item_type, year=year, language=language,
            provider=provider, include_adult=include_adult, season=season, episode=episode
        )

    def get_seasons(self, tmdb_id: int) -> List[Dict[str, Any]]:
        return self.search_service.get_seasons(tmdb_id)

    def get_episodes(self, tmdb_id: int, season_number: int) -> List[Dict[str, Any]]:
        return self.search_service.get_episodes(tmdb_id, season_number)

    def global_search(self, query: str, source: str, search_type: str, include_adult: bool = False, language: Optional[str] = None, page: int = 1) -> List[Dict[str, Any]]:
        return self.search_service.global_search(
            query=query, source=source, search_type=search_type,
            include_adult=include_adult, language=language, page=page
        )

    def resolve_item(self, request: MetadataResolveRequest) -> Dict[str, Any]:
        return self.resolver.resolve_item(request)

    def bulk_resolve(self, request: BulkResolveRequest) -> Dict[str, Any]:
        return self.resolver.bulk_resolve(request)

    def get_full_metadata(self, item_id: str, media_type: str = None, language: str = None) -> Dict[str, Any]:
        return self.search_service.get_full_metadata(item_id, media_type=media_type, language=language)

    def get_sync_status(self) -> Dict[str, Any]:
        return self.sync_service.get_sync_status()

    def trigger_sync(self, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.sync_service.trigger_sync(self.db, self.scrapers, payload)
