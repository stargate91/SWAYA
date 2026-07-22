import logging
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

class TitleLockReader:
    def __init__(self, db: Session, resolver: Any, user_id: int):
        self.db = db
        self.resolver = resolver
        self.user_id = user_id

    def get_or_create_metadata_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        media_item_id, metadata_match_id = self.resolver.resolve_ids(item_id, media_type)

        if not media_item_id and not metadata_match_id:
            if isinstance(item_id, str) and "_" in item_id:
                from app.modules.scrapers.support.registry import ProviderRegistry
                try:
                    provider, external_id = ProviderRegistry.clean_id(item_id)
                    from app.core.enums import Provider, MediaType
                    from app.modules.metadata.models import MetadataMatch
                    
                    config = ProviderRegistry.get_config(provider)
                    is_adult_provider = config.is_adult if config else False

                    m_type_guessed = MediaType.MOVIE
                    if media_type:
                        try:
                            m_type_guessed = MediaType(media_type.lower())
                        except ValueError:
                            m_type_guessed = MediaType.SCENE if media_type == "scene" else MediaType.MOVIE
                    elif is_adult_provider:
                        m_type_guessed = MediaType.SCENE

                    match = None
                    if m_type_guessed == MediaType.SCENE or is_adult_provider:
                        clean_id = str(external_id)
                        candidates = [clean_id]
                        from app.modules.scrapers.support.registry import ProviderRegistry
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.provider.in_(ProviderRegistry.get_adult_providers()),
                            MetadataMatch.external_id.in_(candidates),
                            MetadataMatch.media_type == MediaType.SCENE
                        ).first()
                    else:
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.provider == provider,
                            MetadataMatch.external_id == str(external_id)
                        ).first()
                    
                    # When multiple matches share the same external_id (e.g. TMDB TV shows
                    # and their episodes), prefer the parent type over episodes
                    if match and match.media_type == MediaType.EPISODE:
                        preferred = self.db.query(MetadataMatch).filter(
                            MetadataMatch.provider == provider,
                            MetadataMatch.external_id == str(external_id),
                            MetadataMatch.media_type.in_([MediaType.TV, MediaType.MOVIE])
                        ).first()
                        if preferred:
                            match = preferred
                    
                    if not match:
                        m_type = MediaType.MOVIE
                        if media_type:
                            try:
                                m_type = MediaType(media_type.lower())
                            except ValueError:
                                m_type = MediaType.SCENE if media_type == "scene" else MediaType.MOVIE
                        elif is_adult_provider:
                            m_type = MediaType.SCENE
                        
                        is_adult_item = is_adult_provider or m_type.is_adult
                        match = MetadataMatch(
                            provider=provider,
                            external_id=str(external_id),
                            media_type=m_type,
                            is_adult=is_adult_item
                        )
                        self.db.add(match)
                        self.db.commit()
                    
                    metadata_match_id = match.id
                except ValueError:
                    pass
            if not metadata_match_id:
                return None

        if media_item_id and not metadata_match_id:
            metadata_match_id = self.resolver.get_active_match_id(media_item_id)

        if not metadata_match_id:
            return None

        from sqlalchemy.exc import IntegrityError

        def query_meta():
            return self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.metadata_match_id == metadata_match_id
            ).first()

        override = query_meta()
        
        if not override and media_item_id:
            physical_override = self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.media_item_id == media_item_id,
                UserOverride.metadata_match_id is None
            ).first()
            if physical_override:
                try:
                    with self.db.begin_nested():
                        existing_meta = query_meta()
                        if existing_meta:
                            for field in ["custom_title", "custom_overview", "custom_poster", "custom_backdrop", "custom_logo", "custom_language", "user_rating", "user_comment", "is_favorite", "is_watched"]:
                                val = getattr(physical_override, field, None)
                                if val is not None and getattr(existing_meta, field, None) is None:
                                    setattr(existing_meta, field, val)
                            if physical_override.resume_position:
                                physical_override.custom_title = None
                                physical_override.custom_overview = None
                                physical_override.custom_poster = None
                                physical_override.custom_backdrop = None
                                physical_override.custom_logo = None
                                physical_override.custom_language = None
                                physical_override.user_rating = None
                                physical_override.user_comment = None
                                physical_override.is_favorite = False
                                physical_override.is_watched = False
                            else:
                                self.db.delete(physical_override)
                            override = existing_meta
                        else:
                            physical_override.metadata_match_id = metadata_match_id
                            if physical_override.resume_position:
                                new_physical = UserOverride(
                                    user_id=self.user_id,
                                    media_item_id=media_item_id,
                                    resume_position=physical_override.resume_position
                                )
                                self.db.add(new_physical)
                                physical_override.resume_position = 0
                            physical_override.media_item_id = None
                            override = physical_override
                        self.db.flush()
                except IntegrityError:
                    override = query_meta()
                    if override and physical_override in self.db:
                        if not physical_override.resume_position:
                            self.db.delete(physical_override)

        if not override:
            try:
                with self.db.begin_nested():
                    override = UserOverride(
                        user_id=self.user_id,
                        metadata_match_id=metadata_match_id
                    )
                    self.db.add(override)
                    self.db.flush()
            except IntegrityError:
                override = query_meta()
        return override

    def get_or_create_physical_override(self, item_id: str) -> Optional[UserOverride]:
        media_item_id, _ = self.resolver.resolve_ids(item_id)
        if not media_item_id:
            return None

        def query_physical():
            return self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.media_item_id == media_item_id,
                UserOverride.metadata_match_id is None
            ).first()

        override = query_physical()
        if not override:
            from sqlalchemy.exc import IntegrityError
            try:
                with self.db.begin_nested():
                    override = UserOverride(
                        user_id=self.user_id,
                        media_item_id=media_item_id
                    )
                    self.db.add(override)
                    self.db.flush()
            except IntegrityError:
                override = query_physical()
        return override

    def get_or_create_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        if isinstance(item_id, str) and item_id.startswith("collection_"):
            collection_tmdb_id = item_id.split("_")[1]
            collection_id = self.resolver.get_or_create_collection_id(collection_tmdb_id, "tmdb")
            
            def query_coll():
                return self.db.query(UserOverride).filter(
                    UserOverride.user_id == self.user_id,
                    UserOverride.collection_id == collection_id
                ).first()

            override = query_coll()
            if not override:
                from sqlalchemy.exc import IntegrityError
                try:
                    with self.db.begin_nested():
                        override = UserOverride(
                            user_id=self.user_id,
                            collection_id=collection_id
                        )
                        self.db.add(override)
                        self.db.flush()
                except IntegrityError:
                    override = query_coll()
            return override

        return self.get_or_create_metadata_override(item_id, media_type) or self.get_or_create_physical_override(item_id)

    def get_or_create_media_item_override(self, media_item_id: int) -> UserOverride:
        def query_override():
            return self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.media_item_id == media_item_id
            ).first()

        override = query_override()
        if not override:
            from sqlalchemy.exc import IntegrityError
            try:
                with self.db.begin_nested():
                    override = UserOverride(user_id=self.user_id, media_item_id=media_item_id)
                    self.db.add(override)
                    self.db.flush()
            except IntegrityError:
                override = query_override()
        return override
