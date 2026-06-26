from typing import List, Optional, Any
from sqlalchemy import String, Integer, Float, Enum as SQLEnum, JSON, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared_kernel.database import Base
from app.shared_kernel.enums import RoleType, Provider


class Person(Base):
    """
    Global cast/crew database entry. Can be referenced by mainstream and adult matches.
    Supports extended metadata for mainstream alternative names and adult performer attributes.
    """
    __tablename__ = "people"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, index=True)
    aliases: Mapped[Optional[List[str]]] = mapped_column(JSON) # Alternative names (also_known_as / aliases)
    birthday: Mapped[Optional[str]] = mapped_column(String)
    deathday: Mapped[Optional[str]] = mapped_column(String)
    place_of_birth: Mapped[Optional[str]] = mapped_column(String)
    gender: Mapped[Optional[int]] = mapped_column(Integer)
    known_for_department: Mapped[Optional[str]] = mapped_column(String, index=True) # e.g. "Acting", "Directing"
    popularity: Mapped[Optional[float]] = mapped_column(Float)
    rating_porndb: Mapped[Optional[float]] = mapped_column(Float, index=True)
    scene_count: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    profile_path: Mapped[Optional[str]] = mapped_column(String)
    local_profile_path: Mapped[Optional[str]] = mapped_column(String) # Local path to cached profile image
    homepage: Mapped[Optional[str]] = mapped_column(String)
    images: Mapped[Optional[List[str]]] = mapped_column(JSON) # List of alternative profile image URLs
    external_ids: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON) # {"tmdb": "123", "stashdb": "uuid-xyz"}
    socials: Mapped[Optional[dict[str, str]]] = mapped_column(JSON) # Social media handles/links (e.g. instagram, twitter)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True) # True if the person has local files or user interaction
    is_adult: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    primary_provider: Mapped[Optional[Provider]] = mapped_column(SQLEnum(Provider), nullable=True)
    
    # Extended/Adult Performer attributes (allows structured filtering)
    hair_color: Mapped[Optional[str]] = mapped_column(String, index=True)
    eye_color: Mapped[Optional[str]] = mapped_column(String)
    ethnicity: Mapped[Optional[str]] = mapped_column(String, index=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, index=True) # in cm
    weight: Mapped[Optional[int]] = mapped_column(Integer) # in kg
    measurements: Mapped[Optional[str]] = mapped_column(String) # e.g., "34B-24-34"
    cup_size: Mapped[Optional[str]] = mapped_column(String, index=True)
    tattoos: Mapped[Optional[str]] = mapped_column(String)
    piercings: Mapped[Optional[str]] = mapped_column(String)
    orientation: Mapped[Optional[str]] = mapped_column(String, index=True)
    
    # Career & Origin details
    career_start_year: Mapped[Optional[int]] = mapped_column(Integer)
    career_end_year: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Relationships
    media_links: Mapped[List["MediaPersonLink"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    localizations: Mapped[List["PersonLocalization"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    external_links: Mapped[List["ExternalSourceLink"]] = relationship(back_populates="person", cascade="all, delete-orphan")

    def recalculate_projection(self, db):
        priority_map = {
            Provider.TMDB: 4,
            Provider.STASHDB: 3,
            Provider.FANSDB: 2,
            Provider.PORNDB: 1
        }
        if self.primary_provider:
            priority_map[self.primary_provider] = 10
        
        sorted_links = sorted(
            self.external_links,
            key=lambda l: priority_map.get(l.provider, 0)
        )
        
        birthday = None
        deathday = None
        place_of_birth = None
        gender = None
        known_for_department = self.known_for_department or ("Acting" if self.is_adult else None)
        popularity = None
        rating_porndb = None
        scene_count = None
        profile_path = self.profile_path
        homepage = None
        images = []
        aliases = []
        socials = {}
        
        hair_color = None
        eye_color = None
        ethnicity = None
        height = None
        weight = None
        measurements = None
        cup_size = None
        tattoos = None
        piercings = None
        orientation = None
        career_start_year = None
        career_end_year = None
        
        biographies = {}
        
        for link in sorted_links:
            data = link.source_data
            if not data:
                continue
                
            if data.get("birthday"): birthday = data["birthday"]
            if data.get("deathday"): deathday = data["deathday"]
            if data.get("place_of_birth"): place_of_birth = data["place_of_birth"]
            if data.get("gender") is not None: gender = data["gender"]
            if data.get("known_for_department"): known_for_department = data["known_for_department"]
            if data.get("popularity") is not None: popularity = data["popularity"]
            if data.get("rating_porndb") is not None: rating_porndb = data["rating_porndb"]
            if data.get("scene_count") is not None: scene_count = data["scene_count"]
            if data.get("profile_path"): profile_path = data["profile_path"]
            if data.get("homepage"): homepage = data["homepage"]
            
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
                
            if data.get("hair_color"): hair_color = data["hair_color"]
            if data.get("eye_color"): eye_color = data["eye_color"]
            if data.get("ethnicity"): ethnicity = data["ethnicity"]
            if data.get("height") is not None: height = data["height"]
            if data.get("weight") is not None: weight = data["weight"]
            if data.get("measurements"): measurements = data["measurements"]
            if data.get("cup_size"): cup_size = data["cup_size"]
            if data.get("tattoos"): tattoos = data["tattoos"]
            if data.get("piercings"): piercings = data["piercings"]
            if data.get("orientation"): orientation = data["orientation"]
            if data.get("career_start_year") is not None: career_start_year = data["career_start_year"]
            if data.get("career_end_year") is not None: career_end_year = data["career_end_year"]
            
            if data.get("biographies"):
                for loc, bio_text in data["biographies"].items():
                    if bio_text:
                        biographies[loc] = bio_text
        
        if birthday: self.birthday = birthday
        if deathday: self.deathday = deathday
        if place_of_birth: self.place_of_birth = place_of_birth
        if gender is not None: self.gender = gender
        if known_for_department: self.known_for_department = known_for_department
        if popularity is not None: self.popularity = popularity
        if rating_porndb is not None: self.rating_porndb = rating_porndb
        if scene_count is not None: self.scene_count = scene_count
        if profile_path: self.profile_path = profile_path
        if homepage: self.homepage = homepage
        if images: self.images = images
        if aliases: self.aliases = aliases
        if socials: self.socials = socials
        
        if hair_color: self.hair_color = hair_color
        if eye_color: self.eye_color = eye_color
        if ethnicity: self.ethnicity = ethnicity
        if height is not None: self.height = height
        if weight is not None: self.weight = weight
        if measurements: self.measurements = measurements
        if cup_size: self.cup_size = cup_size
        if tattoos: self.tattoos = tattoos
        if piercings: self.piercings = piercings
        if orientation: self.orientation = orientation
        if career_start_year is not None: self.career_start_year = career_start_year
        if career_end_year is not None: self.career_end_year = career_end_year
        
        ext_ids = dict(self.external_ids or {})
        for link in self.external_links:
            key = link.provider.value
            ext_ids[key] = str(link.external_id)
            ext_ids[f"{key}_id"] = str(link.external_id)
        active_providers = {link.provider.value for link in self.external_links}
        for provider_val in [Provider.TMDB.value, Provider.STASHDB.value, Provider.FANSDB.value, Provider.PORNDB.value]:
            if provider_val not in active_providers:
                ext_ids.pop(provider_val, None)
                ext_ids.pop(f"{provider_val}_id", None)
        self.external_ids = ext_ids
        
        existing_localizations = {l.locale: l for l in self.localizations}
        for loc, bio_text in biographies.items():
            if loc in existing_localizations:
                existing_localizations[loc].biography = bio_text
            else:
                from app.domains.people.models import PersonLocalization
                new_loc = PersonLocalization(person_id=self.id, locale=loc, biography=bio_text)
                db.add(new_loc)
                self.localizations.append(new_loc)
        for loc, loc_obj in list(existing_localizations.items()):
            if loc not in biographies:
                db.delete(loc_obj)


class PersonLocalization(Base):
    """
    Multi-language metadata for actors/performers (e.g. biography).
    """
    __tablename__ = "person_localizations"
    __table_args__ = (UniqueConstraint("person_id", "locale", name="uq_person_locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    locale: Mapped[str] = mapped_column(String, default="en", index=True) # "hu", "en"
    
    biography: Mapped[Optional[str]] = mapped_column(String)
    
    # Relationships
    person: Mapped["Person"] = relationship(back_populates="localizations")


class MediaPersonLink(Base):
    """
    Link mapping people to movies/shows/scenes with roles.
    """
    __tablename__ = "media_person_links"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("metadata_matches.id", ondelete="CASCADE"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    role: Mapped[RoleType] = mapped_column(SQLEnum(RoleType), index=True) # Actor, Director, etc.
    character_name: Mapped[Optional[str]] = mapped_column(String)
    order: Mapped[int] = mapped_column(Integer, default=0) # Order of appearance in cast list
    
    # Relationships
    person: Mapped["Person"] = relationship(back_populates="media_links")
    match: Mapped["MetadataMatch"] = relationship(back_populates="people_links")


class ExternalSourceLink(Base):
    """
    Links multiple external APIs to a single Person.
    Allows merging TMDB, StashDB, and PornDB profiles for the same actor.
    """
    __tablename__ = "external_source_links"
    __table_args__ = (UniqueConstraint("person_id", "provider", "external_id", name="uq_person_external_source"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    provider: Mapped[Provider] = mapped_column(SQLEnum(Provider), index=True)
    external_id: Mapped[str] = mapped_column(String, index=True) # e.g., StashDB performer UUID
    profile_url: Mapped[Optional[str]] = mapped_column(String)
    source_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)

    # Relationships
    person: Mapped["Person"] = relationship(back_populates="external_links")
