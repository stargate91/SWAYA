import logging
from typing import List, Optional, Any, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, Float, Enum as SQLEnum, JSON, Boolean, ForeignKey, UniqueConstraint, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import RoleType, Provider

logger = logging.getLogger(__name__)


if TYPE_CHECKING:
    from app.modules.metadata.models import MetadataMatch
    from app.modules.users.models import UserOverride

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
    # Stores non-provider metadata only (urls, source). Provider IDs are mapped exclusively in ExternalSourceLink
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

    def get_external_id(self, provider_name: str) -> Optional[str]:
        """Look up an external ID by provider prefix from ExternalSourceLink."""
        for link in self.external_links:
            prov_val = getattr(link.provider, "value", link.provider)
            if prov_val == provider_name:
                return link.external_id
        return None

    def get_provider_for(self, capability) -> Optional["ExternalSourceLink"]:
        """Return highest-priority ExternalSourceLink that supports a capability."""
        from app.modules.scrapers.support.registry import ProviderRegistry
        best, best_priority = None, -1
        for link in self.external_links:
            cfg = ProviderRegistry.get_config(link.provider)
            if cfg and capability in cfg.capabilities and cfg.priority > best_priority:
                best, best_priority = link, cfg.priority
        return best

    def recalculate_projection(self, db):
        from app.modules.scrapers.support.registry import ProviderRegistry
        priority_map = {}
        for provider in ProviderRegistry.get_all_providers():
            cfg = ProviderRegistry.get_config(provider)
            if cfg:
                priority_map[cfg.prefix] = cfg.priority
                priority_map[provider] = cfg.priority
        if self.primary_provider:
            priority_map[self.primary_provider] = 10
        
        sorted_links = sorted(
            self.external_links,
            key=lambda x: priority_map.get(x.provider.value if hasattr(x.provider, 'value') else x.provider, 0)
        )
        
        routing = dict(self.field_routing or {})

        def get_val(field_name, default_val=None):
            routed_provider = routing.get(field_name)
            if routed_provider:
                for link in self.external_links:
                    prov_val = link.provider.value if hasattr(link.provider, 'value') else link.provider
                    if prov_val == routed_provider and link.source_data:
                          val = link.source_data.get(field_name)
                          if val is not None and val != "":
                              return val
            # Fallback to priority loop (highest priority link overwrites lower)
            for link in sorted_links:
                data = link.source_data
                if not data:
                    continue
                val = data.get(field_name)
                if val is not None and val != "":
                    default_val = val
            return default_val

        birthday = get_val("birthday")
        deathday = get_val("deathday")
        place_of_birth = get_val("place_of_birth")
        gender = get_val("gender")
        known_for_department = get_val("known_for_department", self.known_for_department or ("Acting" if self.is_adult else None))
        popularity = get_val("popularity")
        rating_porndb = get_val("rating_porndb")
        scene_count = get_val("scene_count")
        profile_path = get_val("profile_path", self.profile_path)
        homepage = get_val("homepage")
        
        hair_color = get_val("hair_color")
        eye_color = get_val("eye_color")
        ethnicity = get_val("ethnicity")
        height = get_val("height")
        weight = get_val("weight")
        measurements = get_val("measurements")
        cup_size = get_val("cup_size")
        band_size = get_val("band_size")
        waist = get_val("waist")
        hip = get_val("hip")
        tattoos = get_val("tattoos")
        piercings = get_val("piercings")
        same_sex_only = get_val("same_sex_only")
        breast_type = get_val("breast_type")
        butt_shape = get_val("butt_shape")
        butt_size = get_val("butt_size")
        career_start_year = get_val("career_start_year")
        career_end_year = get_val("career_end_year")
        
        images = []
        aliases = []
        socials = {}
        
        # Merge multi-value structures from all providers
        for link in sorted_links:
            data = link.source_data
            if not data:
                continue
            if data.get("images"):
                for img in data["images"]:
                    if img not in images:
                        images.append(img)
            if data.get("aliases"):
                for alias in data["aliases"]:
                    if alias not in aliases:
                        aliases.append(alias)
            if data.get("socials"):
                socials.update(data["socials"])

        # Resolve biography locales
        biographies = {}
        routed_bio_provider = routing.get("biography")
        if routed_bio_provider:
            for link in self.external_links:
                if link.provider.value == routed_bio_provider and link.source_data:
                    data = link.source_data
                    if data.get("biographies"):
                        for loc, bio_text in data["biographies"].items():
                            if bio_text:
                                biographies[loc] = bio_text
        if not biographies:
            for link in sorted_links:
                data = link.source_data
                if not data or not data.get("biographies"):
                    continue
                for loc, bio_text in data["biographies"].items():
                    if bio_text:
                        biographies[loc] = bio_text
        
        if birthday:
            self.birthday = birthday
        if deathday:
            self.deathday = deathday
        if place_of_birth:
            self.place_of_birth = place_of_birth
        if gender is not None:
            self.gender = gender
        if known_for_department:
            self.known_for_department = known_for_department
        if popularity is not None:
            self.popularity = popularity
        if rating_porndb is not None:
            self.rating_porndb = rating_porndb
        if scene_count is not None:
            self.scene_count = scene_count
        if profile_path:
            self.profile_path = profile_path
        if homepage:
            self.homepage = homepage
        if images:
            self.images = images
        if aliases:
            self.aliases = aliases
        if socials:
            self.socials = socials
        
        if hair_color:
            self.hair_color = hair_color
        if eye_color:
            self.eye_color = eye_color
        if ethnicity:
            self.ethnicity = ethnicity
        if height is not None:
            self.height = height
        if weight is not None:
            self.weight = weight
        if measurements:
            self.measurements = measurements
        if cup_size:
            self.cup_size = cup_size
        if band_size is not None:
            self.band_size = band_size
        if waist is not None:
            self.waist = waist
        if hip is not None:
            self.hip = hip
        def normalize_mod(val):
            if val is None:
                return None
            val_str = str(val).strip()
            val_lower = val_str.lower()
            if val_lower in ("", "null", "undefined", "none", "no", "no tattoos", "no piercings", "nincs", "no, no"):
                if val_lower in ("none", "no", "no tattoos", "no piercings", "nincs", "no, no"):
                    return "No"
                return None
            if val_lower in ("yes", "igen"):
                return "Yes"
            return val_str

        # If explicit arguments are provided, use them; otherwise, check tag fields
        self.tattoos = normalize_mod(tattoos)
        self.piercings = normalize_mod(piercings)
        if same_sex_only:
            self.same_sex_only = same_sex_only
        if breast_type:
            self.breast_type = breast_type
        # Check if manual butt_size or breast_size is explicitly provided
        manual_link = next((x for x in self.external_links if x.provider == Provider.MANUAL), None)
        has_manual_butt_size = manual_link and manual_link.source_data and manual_link.source_data.get("butt_size")
        has_manual_breast_size = manual_link and manual_link.source_data and manual_link.source_data.get("breast_size")
        
        from app.modules.people.helpers import calculate_butt_size, calculate_breast_size

        butt_size = None
        if not has_manual_butt_size:
            calc_height = height if height is not None else self.height
            calc_waist = waist if waist is not None else self.waist
            calc_hip = hip if hip is not None else self.hip
            butt_size = calculate_butt_size(calc_height, calc_waist, calc_hip)

        breast_size = None
        if not has_manual_breast_size:
            calc_cup = cup_size if cup_size is not None else self.cup_size
            calc_band = band_size if band_size is not None else self.band_size
            calc_height = height if height is not None else self.height
            breast_size = calculate_breast_size(calc_cup, calc_band, calc_height)

        if butt_shape:
            self.butt_shape = butt_shape
        if not has_manual_butt_size and butt_size:
            self.butt_size = butt_size
        if not has_manual_breast_size and breast_size:
            self.breast_size = breast_size
        if career_start_year is not None:
            self.career_start_year = career_start_year
        if career_end_year is not None:
            self.career_end_year = career_end_year
        
        # No legacy external_ids re-projection. Provider links are mapped exclusively in ExternalSourceLink
        
        existing_localizations = {x.locale: x for x in self.localizations}
        for loc, bio_text in biographies.items():
            if loc in existing_localizations:
                existing_localizations[loc].biography = bio_text
            else:
                from app.modules.people.models import PersonLocalization
                new_loc = PersonLocalization(person_id=self.id, locale=loc, biography=bio_text)
                db.add(new_loc)
                self.localizations.append(new_loc)
        for loc, loc_obj in list(existing_localizations.items()):
            if loc not in biographies:
                db.delete(loc_obj)

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