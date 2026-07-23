import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session


from app.core.enums import Provider, MediaType
from app.modules.metadata.models import MetadataMatch, Studio, MediaCollection, MetadataLocalization, MediaCollectionLocalization, StudioAlias
from app.modules.metadata.schemas import MetadataResolveRequest, BulkResolveRequest

# Import sub-services
from app.modules.metadata.services.metadata_resolver import MetadataResolver
from app.modules.metadata.services.metadata_sync_service import MetadataSyncService
from app.modules.metadata.services.metadata_search_service import MetadataSearchService



logger = logging.getLogger(__name__)

class MetadataService:
    def __init__(self, db: Session, scrapers: Any, media_resolver: Optional[Any] = None):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = scrapers.tmdb(db)
        if media_resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            media_resolver = MediaItemService(db)
        self.media_resolver = media_resolver
        
        # Instantiate sub-services
        self.resolver = MetadataResolver(db, scrapers, self.tmdb, media_resolver=media_resolver, metadata_repo=self)
        self.sync_service = MetadataSyncService()
        self.search_service = MetadataSearchService(db, scrapers, self.tmdb, media_resolver=media_resolver)

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

    def get_match(self, provider: Provider, external_id: str, media_type: MediaType, media_item_id: Optional[int] = None) -> Optional[Any]:
        query = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == provider,
            MetadataMatch.external_id == external_id,
            MetadataMatch.media_type == media_type
        )
        if media_item_id is not None:
            query = query.filter(MetadataMatch.media_item_id == media_item_id)
        return query.first()
        
    def create_match(self, provider: Provider, external_id: str, media_type: MediaType, media_item_id: Optional[int] = None) -> Any:
        match = MetadataMatch(
            provider=provider,
            external_id=external_id,
            media_type=media_type,
            media_item_id=media_item_id
        )
        self.db.add(match)
        return match

    def get_match_by_item(self, media_item_id: int, active_only: bool = False) -> Optional[Any]:
        query = self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == media_item_id)
        if active_only:
            query = query.filter(MetadataMatch.is_active)
        return query.first()

    def get_tv_match(self, provider: Provider, external_id: str) -> Optional[Any]:
        return self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == provider,
            MetadataMatch.external_id == external_id,
            MetadataMatch.media_type == MediaType.TV,
            MetadataMatch.media_item_id.is_(None)
        ).first()

    def get_season_match(self, provider: Provider, parent_id: int, season_number: int) -> Optional[Any]:
        return self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == provider,
            MetadataMatch.parent_id == parent_id,
            MetadataMatch.media_type == MediaType.SEASON,
            MetadataMatch.season_number == season_number,
            MetadataMatch.media_item_id.is_(None)
        ).first()

    def get_studio_by_name(self, name: str) -> Optional[Any]:
        from sqlalchemy import func
        cleaned_name = name.strip() if name else ""
        for obj in self.db.new:
            if isinstance(obj, Studio) and obj.name and obj.name.lower() == cleaned_name.lower():
                return obj
        return self.db.query(Studio).filter(
            func.lower(Studio.name) == func.lower(cleaned_name)
        ).first()

    def resolve_studio_by_name(self, name: str) -> Optional[Any]:
        from sqlalchemy import func
        cleaned_name = name.strip() if name else ""
        studio = self.get_studio_by_name(cleaned_name)
        if studio:
            return studio
        for obj in self.db.new:
            if isinstance(obj, StudioAlias) and obj.alias_name and obj.alias_name.lower() == cleaned_name.lower():
                return obj.studio
        alias = self.db.query(StudioAlias).filter(
            func.lower(StudioAlias.alias_name) == func.lower(cleaned_name)
        ).first()
        return alias.studio if alias else None

    def create_studio(self, name: str, logo_path: Optional[str] = None) -> Any:
        studio = Studio(name=name, logo_path=logo_path)
        self.db.add(studio)
        return studio

    def get_collection(self, provider: Provider, external_id: str) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, MediaCollection):
                if obj.provider == provider and obj.external_id == str(external_id):
                    return obj
        return self.db.query(MediaCollection).filter(
            MediaCollection.provider == provider,
            MediaCollection.external_id == str(external_id)
        ).first()

    def create_collection(self, provider: Provider, external_id: str, backdrop_path: Optional[str] = None) -> Any:
        collection = MediaCollection(provider=provider, external_id=str(external_id), backdrop_path=backdrop_path)
        self.db.add(collection)
        return collection

    def get_localization(self, match_id: int, language: str) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, MetadataLocalization):
                if obj.match_id == match_id and obj.locale == language:
                    return obj
        return self.db.query(MetadataLocalization).filter(
            MetadataLocalization.match_id == match_id,
            MetadataLocalization.locale == language
        ).first()

    def create_localization(self, match_id: int, language: str) -> Any:
        loc = MetadataLocalization(match_id=match_id, locale=language)
        self.db.add(loc)
        return loc

    def get_collection_localization(self, collection_id: int, language: str) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, MediaCollectionLocalization):
                if obj.collection_id == collection_id and obj.locale == language:
                    return obj
        return self.db.query(MediaCollectionLocalization).filter(
            MediaCollectionLocalization.collection_id == collection_id,
            MediaCollectionLocalization.locale == language
        ).first()

    def create_collection_localization(self, collection_id: int, locale: str) -> Any:
        loc = MediaCollectionLocalization(collection_id=collection_id, locale=locale)
        self.db.add(loc)
        return loc

    def flush(self) -> None:
        self.db.flush()
