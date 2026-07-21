from typing import List, Optional, Any, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, Float, Enum as SQLEnum, JSON, Boolean, ForeignKey, UniqueConstraint, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import RoleType, Provider

if TYPE_CHECKING:
    from app.modules.metadata.models import MetadataMatch

class Person(Base):
    __tablename__ = "people"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, index=True)
    aliases: Mapped[Optional[List[str]]] = mapped_column(JSON)
    birthday: Mapped[Optional[str]] = mapped_column(String)
    deathday: Mapped[Optional[str]] = mapped_column(String)
    place_of_birth: Mapped[Optional[str]] = mapped_column(String)
    gender: Mapped[Optional[int]] = mapped_column(Integer)
    known_for_department: Mapped[Optional[str]] = mapped_column(String, index=True)
    popularity: Mapped[Optional[float]] = mapped_column(Float)
    rating_porndb: Mapped[Optional[float]] = mapped_column(Float, index=True)
    scene_count: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    profile_path: Mapped[Optional[str]] = mapped_column(String)
    local_profile_path: Mapped[Optional[str]] = mapped_column(String)
    backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    local_backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    homepage: Mapped[Optional[str]] = mapped_column(String)
    images: Mapped[Optional[List[str]]] = mapped_column(JSON)
    external_ids: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    socials: Mapped[Optional[dict[str, str]]] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_adult: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    primary_provider: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    field_routing: Mapped[Optional[dict[str, str]]] = mapped_column(JSON, nullable=True)
    
    hair_color: Mapped[Optional[str]] = mapped_column(String, index=True)
    eye_color: Mapped[Optional[str]] = mapped_column(String)
    ethnicity: Mapped[Optional[str]] = mapped_column(String, index=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    weight: Mapped[Optional[int]] = mapped_column(Integer)
    measurements: Mapped[Optional[str]] = mapped_column(String)
    cup_size: Mapped[Optional[str]] = mapped_column(String, index=True)
    band_size: Mapped[Optional[int]] = mapped_column(Integer)
    waist: Mapped[Optional[int]] = mapped_column(Integer)
    hip: Mapped[Optional[int]] = mapped_column(Integer)
    breast_type: Mapped[Optional[str]] = mapped_column(String, index=True)
    tattoos: Mapped[Optional[str]] = mapped_column(String)
    piercings: Mapped[Optional[str]] = mapped_column(String)
    same_sex_only: Mapped[Optional[str]] = mapped_column(String, index=True)
    butt_shape: Mapped[Optional[str]] = mapped_column(String, index=True)
    butt_size: Mapped[Optional[str]] = mapped_column(String, index=True)
    breast_size: Mapped[Optional[str]] = mapped_column(String, index=True)
    
    career_start_year: Mapped[Optional[int]] = mapped_column(Integer)
    career_end_year: Mapped[Optional[int]] = mapped_column(Integer)
    
    media_links: Mapped[List["MediaPersonLink"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    localizations: Mapped[List["PersonLocalization"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    external_links: Mapped[List["ExternalSourceLink"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    filmography_caches: Mapped[List["RemoteFilmographyCache"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    overrides: Mapped[List["UserOverride"]] = relationship("UserOverride", back_populates="person", cascade="all, delete-orphan")

    @property
    def availability_type(self) -> str:
        """Computed state flag for frontend consumption (in_library or tracked_only)."""
        if self.media_links and any(getattr(link.match, "media_item_id", None) is not None for link in self.media_links if link.match):
            return "in_library"
        return "tracked_only"

    @property
    def raw_profile_source(self) -> Optional[str]:
        """Prioritized raw profile path: Local Cached > Remote API URL"""
        return self.local_profile_path or self.profile_path

    @property
    def raw_backdrop_source(self) -> Optional[str]:
        """Prioritized raw backdrop path: Local Cached > Remote API URL"""
        return self.local_backdrop_path or self.backdrop_path

class PersonLocalization(Base):
    __tablename__ = "person_localizations"
    __table_args__ = (UniqueConstraint("person_id", "locale", name="uq_person_locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    locale: Mapped[str] = mapped_column(String, default="en", index=True)
    biography: Mapped[Optional[str]] = mapped_column(String)
    
    person: Mapped["Person"] = relationship(back_populates="localizations")

class MediaPersonLink(Base):
    __tablename__ = "media_person_links"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    role: Mapped[RoleType] = mapped_column(SQLEnum(RoleType), index=True)
    character_name: Mapped[Optional[str]] = mapped_column(String)
    order: Mapped[int] = mapped_column(Integer, default=0)
    
    person: Mapped["Person"] = relationship(back_populates="media_links")
    match: Mapped["MetadataMatch"] = relationship("MetadataMatch", back_populates="people_links")

class ExternalSourceLink(Base):
    __tablename__ = "external_source_links"
    __table_args__ = (UniqueConstraint("person_id", "provider", "external_id", name="uq_person_external_source"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    profile_url: Mapped[Optional[str]] = mapped_column(String)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)

    person: Mapped["Person"] = relationship(back_populates="external_links")

class RemoteFilmographyCache(Base):
    __tablename__ = "remote_filmography_caches"
    __table_args__ = (UniqueConstraint("person_id", "provider", "media_type", name="uq_person_provider_mediatype"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    media_type: Mapped[str] = mapped_column(String, index=True)
    data: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    person: Mapped["Person"] = relationship(back_populates="filmography_caches")
