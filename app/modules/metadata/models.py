from datetime import datetime
from typing import List, Optional, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Enum as SQLEnum, JSON, Boolean, ForeignKey, UniqueConstraint, Table, Column, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import Provider, MediaType

if TYPE_CHECKING:
    from app.modules.users.models import UserOverride
    from app.modules.library.models import MediaItem
    from app.modules.people.models import MediaPersonLink

metadata_match_studios = Table(
    "metadata_match_studios",
    Base.metadata,
    Column("metadata_match_id", Integer, ForeignKey("metadata_matches.id", ondelete="CASCADE"), primary_key=True),
    Column("studio_id", Integer, ForeignKey("studios.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("relation_type", String, default="studio", index=True)
)

class Studio(Base):
    __tablename__ = "studios"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    logo_path: Mapped[Optional[str]] = mapped_column(String)
    parent_studio_id: Mapped[Optional[int]] = mapped_column(ForeignKey("studios.id", ondelete="SET NULL"), index=True)
    
    parent_studio: Mapped[Optional["Studio"]] = relationship("Studio", remote_side=[id], back_populates="sub_studios")
    sub_studios: Mapped[List["Studio"]] = relationship("Studio", back_populates="parent_studio")
    matches: Mapped[List["MetadataMatch"]] = relationship("MetadataMatch", secondary=metadata_match_studios, back_populates="studios")
    overrides: Mapped[Optional["UserOverride"]] = relationship("UserOverride", back_populates="studio", cascade="all, delete-orphan")
    external_links: Mapped[List["ExternalStudioLink"]] = relationship("ExternalStudioLink", back_populates="studio", cascade="all, delete-orphan")
    aliases: Mapped[List["StudioAlias"]] = relationship("StudioAlias", back_populates="studio", cascade="all, delete-orphan")

class MetadataMatch(Base):
    __tablename__ = "metadata_matches"
    __table_args__ = (UniqueConstraint("media_item_id", "provider", "external_id", "media_type", name="uq_provider_match"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    media_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_items.id", ondelete="CASCADE"), nullable=True, index=True)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), nullable=True, index=True)
    collection_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_collections.id", ondelete="SET NULL"), nullable=True, index=True)
    
    provider: Mapped[Provider] = mapped_column(SQLEnum(Provider), index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    provider_ids: Mapped[Optional[dict[str, str]]] = mapped_column(JSON, nullable=True)
    media_type: Mapped[str] = mapped_column(String(50), index=True, default="movie")
    season_number: Mapped[Optional[int]] = mapped_column(Integer)
    episode_number: Mapped[Optional[Any]] = mapped_column(JSON)
    number_of_seasons: Mapped[Optional[int]] = mapped_column(Integer)
    number_of_episodes: Mapped[Optional[int]] = mapped_column(Integer)
    
    rating_tmdb: Mapped[Optional[float]] = mapped_column(Float)
    rating_porndb: Mapped[Optional[float]] = mapped_column(Float, index=True)
    rating_imdb: Mapped[Optional[float]] = mapped_column(Float, index=True)
    rating_rotten: Mapped[Optional[str]] = mapped_column(String)
    rating_meta: Mapped[Optional[int]] = mapped_column(Integer)
    vote_count_tmdb: Mapped[Optional[int]] = mapped_column(Integer)
    vote_count_imdb: Mapped[Optional[int]] = mapped_column(Integer)
    budget: Mapped[Optional[int]] = mapped_column(BigInteger)
    revenue: Mapped[Optional[int]] = mapped_column(BigInteger)
    release_status: Mapped[Optional[str]] = mapped_column(String)
    tv_type: Mapped[Optional[str]] = mapped_column(String)
    
    release_date: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    last_air_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    popularity: Mapped[Optional[float]] = mapped_column(Float, index=True)
    runtime: Mapped[Optional[int]] = mapped_column(Integer)
    imdb_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    original_title: Mapped[Optional[str]] = mapped_column(String, index=True)
    backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    local_backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    still_path: Mapped[Optional[str]] = mapped_column(String)
    local_still_path: Mapped[Optional[str]] = mapped_column(String)
    suggested_tags: Mapped[Optional[List[str]]] = mapped_column(JSON)
    stills: Mapped[Optional[List[str]]] = mapped_column(JSON)
    local_stills: Mapped[Optional[List[str]]] = mapped_column(JSON)
    fetched_locales: Mapped[Optional[List[str]]] = mapped_column(JSON)
    raw_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True) # Active selected match for media item
    is_adult: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0)
    
    media_item: Mapped[Optional["MediaItem"]] = relationship("MediaItem", back_populates="matches")
    parent: Mapped[Optional["MetadataMatch"]] = relationship("MetadataMatch", remote_side=[id], back_populates="children")
    children: Mapped[List["MetadataMatch"]] = relationship("MetadataMatch", back_populates="parent", cascade="all, delete-orphan")
    collection: Mapped[Optional["MediaCollection"]] = relationship("MediaCollection", back_populates="matches")
    localizations: Mapped[List["MetadataLocalization"]] = relationship(back_populates="match", cascade="all, delete-orphan")
    studios: Mapped[List["Studio"]] = relationship("Studio", secondary=metadata_match_studios, back_populates="matches")
    overrides: Mapped[Optional["UserOverride"]] = relationship("UserOverride", back_populates="metadata_match", cascade="all, delete-orphan")
    external_links: Mapped[List["ExternalMatchLink"]] = relationship("ExternalMatchLink", back_populates="match", cascade="all, delete-orphan")
    people_links: Mapped[List["MediaPersonLink"]] = relationship("MediaPersonLink", back_populates="match", cascade="all, delete-orphan")

    @property
    def availability_type(self) -> str:
        """Computed state flag for frontend consumption (in_library or tracked_only)."""
        if self.media_item_id is not None:
            return "in_library"
        return "tracked_only"

    @property
    def raw_poster_source(self) -> Optional[str]:
        """Prioritized raw poster path: User Custom > Local Cached > Remote API URL"""
        if self.overrides and getattr(self.overrides, "custom_poster", None):
            return self.overrides.custom_poster
        return getattr(self, "local_poster_path", None) or getattr(self, "poster_path", None)

    @property
    def raw_backdrop_source(self) -> Optional[str]:
        """Prioritized raw backdrop path: User Custom > Local Cached > Remote API URL"""
        if self.overrides and getattr(self.overrides, "custom_backdrop", None):
            return self.overrides.custom_backdrop
        return getattr(self, "local_backdrop_path", None) or getattr(self, "backdrop_path", None)

class MetadataLocalization(Base):
    __tablename__ = "metadata_localizations"
    __table_args__ = (UniqueConstraint("match_id", "locale", name="uq_match_locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), index=True)
    locale: Mapped[str] = mapped_column(String, default="en", index=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    
    title: Mapped[Optional[str]] = mapped_column(String, default="", nullable=True)
    tagline: Mapped[Optional[str]] = mapped_column(String)
    overview: Mapped[Optional[str]] = mapped_column(String)
    poster_path: Mapped[Optional[str]] = mapped_column(String)
    local_poster_path: Mapped[Optional[str]] = mapped_column(String)
    logo_path: Mapped[Optional[str]] = mapped_column(String)
    local_logo_path: Mapped[Optional[str]] = mapped_column(String)
    trailer_url: Mapped[Optional[str]] = mapped_column(String)
    
    origin_country: Mapped[Optional[List[str]]] = mapped_column(JSON)
    original_language: Mapped[Optional[str]] = mapped_column(String)
    spoken_languages: Mapped[Optional[List[str]]] = mapped_column(JSON)
    genres: Mapped[Optional[List[str]]] = mapped_column(JSON)
    
    match: Mapped["MetadataMatch"] = relationship(back_populates="localizations")

class EntityRelation(Base):
    __tablename__ = "entity_relations"
    __table_args__ = (UniqueConstraint("parent_match_id", "child_match_id", "relation_type", name="uq_entity_relation"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_match_id: Mapped[int] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), index=True)
    child_match_id: Mapped[int] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), index=True)
    relation_type: Mapped[str] = mapped_column(String, default="scene_in_movie", index=True)
    
    parent: Mapped["MetadataMatch"] = relationship("MetadataMatch", foreign_keys=[parent_match_id])
    child: Mapped["MetadataMatch"] = relationship("MetadataMatch", foreign_keys=[child_match_id])

class MediaCollection(Base):
    __tablename__ = "media_collections"
    __table_args__ = (UniqueConstraint("provider", "external_id", name="uq_collection_provider"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    local_backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    parts_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    matches: Mapped[List["MetadataMatch"]] = relationship("MetadataMatch", back_populates="collection")
    localizations: Mapped[List["MediaCollectionLocalization"]] = relationship(back_populates="collection", cascade="all, delete-orphan")
    overrides: Mapped[Optional["UserOverride"]] = relationship("UserOverride", back_populates="collection", cascade="all, delete-orphan")
    external_links: Mapped[List["ExternalCollectionLink"]] = relationship("ExternalCollectionLink", back_populates="collection", cascade="all, delete-orphan")

class MediaCollectionLocalization(Base):
    __tablename__ = "media_collection_localizations"
    __table_args__ = (UniqueConstraint("collection_id", "locale", name="uq_collection_locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    collection_id: Mapped[int] = mapped_column(ForeignKey("media_collections.id", ondelete="CASCADE"), index=True)
    locale: Mapped[str] = mapped_column(String, default="en", index=True)
    
    title: Mapped[Optional[str]] = mapped_column(String, default="", nullable=True)
    overview: Mapped[Optional[str]] = mapped_column(String)
    poster_path: Mapped[Optional[str]] = mapped_column(String)
    local_poster_path: Mapped[Optional[str]] = mapped_column(String)
    
    collection: Mapped["MediaCollection"] = relationship(back_populates="localizations")

class ExternalMatchLink(Base):
    __tablename__ = "external_match_links"
    __table_args__ = (UniqueConstraint("match_id", "provider", "external_id", name="uq_match_external_source"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    profile_url: Mapped[Optional[str]] = mapped_column(String)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    match: Mapped["MetadataMatch"] = relationship("MetadataMatch", back_populates="external_links")

class ExternalStudioLink(Base):
    __tablename__ = "external_studio_links"
    __table_args__ = (UniqueConstraint("studio_id", "provider", "external_id", name="uq_studio_external_source"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    studio_id: Mapped[int] = mapped_column(ForeignKey("studios.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    profile_url: Mapped[Optional[str]] = mapped_column(String)

    studio: Mapped["Studio"] = relationship("Studio", back_populates="external_links")

class StudioAlias(Base):
    __tablename__ = "studio_aliases"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    alias_name: Mapped[str] = mapped_column(String, unique=True, index=True)
    studio_id: Mapped[int] = mapped_column(ForeignKey("studios.id", ondelete="CASCADE"), index=True)
    
    studio: Mapped["Studio"] = relationship("Studio", back_populates="aliases")

class ExternalCollectionLink(Base):
    __tablename__ = "external_collection_links"
    __table_args__ = (UniqueConstraint("collection_id", "provider", "external_id", name="uq_collection_external_source"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    collection_id: Mapped[int] = mapped_column(ForeignKey("media_collections.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    profile_url: Mapped[Optional[str]] = mapped_column(String)

    collection: Mapped["MediaCollection"] = relationship("MediaCollection", back_populates="external_links")

class MediaAsset(Base):
    """Unified Gallery & Image Asset Model for Movies, Scenes, People & Studios."""
    __tablename__ = "media_assets"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[Optional[int]] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), nullable=True, index=True)
    person_id: Mapped[Optional[int]] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), nullable=True, index=True)
    studio_id: Mapped[Optional[int]] = mapped_column(ForeignKey("studios.id", ondelete="CASCADE"), nullable=True, index=True)
    
    asset_type: Mapped[str] = mapped_column(String, default="gallery", index=True) # "poster", "backdrop", "still", "profile", "gallery", "promo"
    url: Mapped[Optional[str]] = mapped_column(String)
    local_path: Mapped[Optional[str]] = mapped_column(String)
    custom_path: Mapped[Optional[str]] = mapped_column(String)
    
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    aspect_ratio: Mapped[Optional[float]] = mapped_column(Float)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    provider: Mapped[Optional[str]] = mapped_column(String, index=True)
