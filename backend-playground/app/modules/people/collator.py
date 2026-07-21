from typing import Optional, List, Dict, Any
from app.core.image_resolver import resolve_image_url
from app.modules.people.models import Person
from app.modules.people.schemas import PersonCardDTO, PersonDetailDTO

class PersonCollatorService:
    """
    Unified Single Collator for Person / Performer profiles.
    Replaces 380+ lines of legacy PersonDetailCollator boilerplate!
    """

    @staticmethod
    def _compute_person_status(person: Person, library_count: int, is_favorite: bool) -> str:
        if library_count > 0:
            return "LOCAL_ACTOR"
        if is_favorite or getattr(person, "is_active", False):
            return "TRACKED_REMOTE"
        return "DISCOVERED"

    @classmethod
    def to_card(cls, person: Person, is_favorite: bool = False) -> PersonCardDTO:
        # Calculate local media count linked to performer
        library_count = len([
            link for link in (person.media_links or []) 
            if link.match and link.match.media_item_id is not None
        ])
        
        status = cls._compute_person_status(person, library_count, is_favorite)
        profile_url = resolve_image_url(person.raw_profile_source, default_placeholder="/static/placeholders/avatar.svg")
        backdrop_url = resolve_image_url(person.raw_backdrop_source, default_placeholder="/static/placeholders/backdrop.svg")

        return PersonCardDTO(
            id=person.id,
            name=person.name,
            availability_type=person.availability_type,
            person_status=status,
            is_adult=person.is_adult,
            profile_url=profile_url,
            backdrop_url=backdrop_url,
            popularity=person.popularity,
            rating_porndb=person.rating_porndb,
            library_count=library_count,
            is_favorite=is_favorite
        )

    @classmethod
    def to_detail(cls, person: Person, is_favorite: bool = False) -> PersonDetailDTO:
        card = cls.to_card(person, is_favorite=is_favorite)
        loc = person.localizations[0] if person.localizations else None
        
        # Build external IDs dictionary from links or JSON
        ext_ids = person.external_ids or {}
        for link in (person.external_links or []):
            ext_ids[link.provider] = link.external_id

        return PersonDetailDTO(
            **card.model_dump(),
            aliases=person.aliases or [],
            biography=(loc and loc.biography) or "",
            birthday=person.birthday,
            deathday=person.deathday,
            place_of_birth=person.place_of_birth,
            gender=person.gender,
            known_for_department=person.known_for_department,
            homepage=person.homepage,
            career_start_year=person.career_start_year,
            career_end_year=person.career_end_year,
            hair_color=person.hair_color,
            eye_color=person.eye_color,
            ethnicity=person.ethnicity,
            height=person.height,
            weight=person.weight,
            measurements=person.measurements,
            cup_size=person.cup_size,
            band_size=person.band_size,
            waist=person.waist,
            hip=person.hip,
            breast_type=person.breast_type,
            butt_shape=person.butt_shape,
            butt_size=person.butt_size,
            tattoos=person.tattoos,
            piercings=person.piercings,
            external_ids=ext_ids,
            gallery_urls=[resolve_image_url(img) for img in (person.images or [])]
        )
