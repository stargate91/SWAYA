from typing import Any, Optional
from sqlalchemy.orm import Session

from app.core.enums import Provider, MediaType
from app.modules.metadata.models import MetadataMatch, Studio, MediaCollection, MetadataLocalization, MediaCollectionLocalization, StudioAlias

class DbMetadataRepository:
    def __init__(self, db: Session):
        self.db = db

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
        
        # Check pending/unsaved objects in the current session first
        for obj in self.db.new:
            if isinstance(obj, Studio) and obj.name and obj.name.lower() == cleaned_name.lower():
                return obj
                
        return self.db.query(Studio).filter(func.lower(Studio.name) == func.lower(cleaned_name)).first()

    def resolve_studio_by_name(self, name: str) -> Optional[Any]:
        from sqlalchemy import func
        cleaned_name = name.strip() if name else ""
        if not cleaned_name:
            return None

        # 1. Check pending/unsaved objects in session first
        for obj in self.db.new:
            if isinstance(obj, StudioAlias) and obj.alias_name and obj.alias_name.lower() == cleaned_name.lower():
                return obj.studio
            if isinstance(obj, Studio) and obj.name and obj.name.lower() == cleaned_name.lower():
                return obj

        # 2. Check aliases table
        alias = self.db.query(StudioAlias).filter(func.lower(StudioAlias.alias_name) == func.lower(cleaned_name)).first()
        if alias:
            return alias.studio

        # 3. Fallback to canonical name check
        return self.get_studio_by_name(cleaned_name)

    def create_studio(self, name: str, logo_path: Optional[str] = None) -> Any:
        cleaned_name = name.strip() if name else ""
        studio = Studio(name=cleaned_name, logo_path=logo_path)
        self.db.add(studio)
        return studio

    def get_collection(self, provider: Provider, external_id: str) -> Optional[Any]:
        return self.db.query(MediaCollection).filter(
            MediaCollection.provider == provider,
            MediaCollection.external_id == external_id
        ).first()

    def create_collection(self, provider: Provider, external_id: str, backdrop_path: Optional[str] = None) -> Any:
        collection = MediaCollection(
            provider=provider,
            external_id=external_id,
            backdrop_path=backdrop_path
        )
        self.db.add(collection)
        return collection

    def get_or_create_collection(self, provider: Provider, external_id: str) -> Any:
        collection = self.get_collection(provider, external_id)
        if not collection:
            collection = self.create_collection(provider, external_id)
            self.db.flush()
        return collection

    def get_localization(self, match_id: Optional[int], locale: str) -> Optional[Any]:
        if not match_id:
            return None
        return self.db.query(MetadataLocalization).filter(
            MetadataLocalization.match_id == match_id,
            MetadataLocalization.locale == locale
        ).first()

    def create_localization(self, match_id: Optional[int], locale: str, **kwargs) -> Any:
        loc = MetadataLocalization(match_id=match_id, locale=locale, **kwargs)
        self.db.add(loc)
        return loc

    def get_collection_localization(self, collection_id: int, locale: str) -> Optional[Any]:
        return self.db.query(MediaCollectionLocalization).filter(
            MediaCollectionLocalization.collection_id == collection_id,
            MediaCollectionLocalization.locale == locale
        ).first()

    def create_collection_localization(self, collection_id: int, locale: str, **kwargs) -> Any:
        loc = MediaCollectionLocalization(collection_id=collection_id, locale=locale, **kwargs)
        self.db.add(loc)
        return loc

    def delete_matches_by_item_id(self, item_id: int) -> None:
        self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item_id).delete()

    def get_match_by_item_and_provider_info(self, item_id: int, provider: Provider, external_id: str, media_type: MediaType) -> Optional[Any]:
        return self.db.query(MetadataMatch).filter(
            MetadataMatch.media_item_id == item_id,
            MetadataMatch.provider == provider,
            MetadataMatch.external_id == str(external_id),
            MetadataMatch.media_type == media_type
        ).first()

    def save(self, entity: Any) -> None:
        self.db.add(entity)

    def flush(self) -> None:
        self.db.flush()

