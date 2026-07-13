import logging
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.domains.users.models import UserOverride

logger = logging.getLogger(__name__)

class TitleLockReader:
    def __init__(self, db: Session, resolver: Any, library_port: Any, user_id: int):
        self.db = db
        self.resolver = resolver
        self.library_port = library_port
        self.user_id = user_id

    def get_or_create_metadata_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        media_item_id, metadata_match_id = self.resolver.resolve_ids(item_id, media_type)

        if not media_item_id and not metadata_match_id:
            if isinstance(item_id, str) and "_" in item_id:
                prefix, val = item_id.split("_", 1)
                if prefix in ("tmdb", "porndb", "theporndb", "stash", "stashdb", "fansdb"):
                    from app.shared_kernel.enums import Provider, MediaType
                    from app.domains.metadata.models import MetadataMatch
                    
                    provider = Provider.TMDB
                    if prefix == "tmdb":
                        provider = Provider.TMDB
                    elif prefix in ("porndb", "theporndb"):
                        provider = Provider.PORNDB
                    elif prefix in ("stash", "stashdb"):
                        provider = Provider.STASHDB
                    elif prefix == "fansdb":
                        provider = Provider.FANSDB
                    external_id = val
                    
                    match = self.db.query(MetadataMatch).filter(
                        MetadataMatch.provider == provider,
                        MetadataMatch.external_id == str(external_id)
                    ).first()
                    # PornDB stores scene external_ids with 'scene_' prefix
                    if not match and provider == Provider.PORNDB:
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.provider == provider,
                            MetadataMatch.external_id == f"scene_{external_id}"
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
                        elif prefix in ("porndb", "theporndb", "stash", "stashdb", "fansdb"):
                            m_type = MediaType.SCENE
                        
                        is_adult_item = (provider in (Provider.PORNDB, Provider.STASHDB, Provider.FANSDB)) or (m_type == MediaType.SCENE)
                        match = MetadataMatch(
                            provider=provider,
                            external_id=str(external_id),
                            media_type=m_type,
                            is_adult=is_adult_item
                        )
                        self.db.add(match)
                        self.db.commit()
                    
                    metadata_match_id = match.id
            if not metadata_match_id:
                return None

        if media_item_id and not metadata_match_id:
            metadata_match_id = self.library_port.get_active_match_id(media_item_id)

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
            collection_id = self.library_port.get_or_create_collection_id(collection_tmdb_id, "tmdb")
            
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
