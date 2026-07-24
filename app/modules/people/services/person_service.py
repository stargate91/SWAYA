import logging
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from app.modules.people.models import Person, MediaPersonLink, ExternalSourceLink
from app.core.enums import Provider, RoleType

logger = logging.getLogger(__name__)

class PersonService:
    """
    Public service interface for Person entities.
    Encapsulates creating and updating cast members and performers to maintain cross-domain integrity.
    """

    def __init__(self, db_session: Session):
        self.db = db_session

    def update_or_create_person(
        self,
        name: str,
        profile_path: str = None,
        gender: int = None,
        is_adult: bool = False,
        tmdb_id: str = None,
        performer_details: dict = None,
        provider: Optional[Provider] = None,
        external_id: Optional[str] = None,
        known_for_department: Optional[str] = None,
        urls: Optional[List[str]] = None
    ) -> Person:
        """Finds or creates a Person entity and updates their details, supporting cross-provider deduplication."""
        person = None
        extracted_ids = {}

        # Extract external IDs from urls is disabled to keep linking strictly user-controlled
        pass

        # 1. Try finding by provider and external_id
        if provider and external_id:
            person = self.get_person_by_external_id(provider, external_id)

        # 1.5 Try finding by tmdb_id
        if not person and tmdb_id:
            person = self.get_person_by_tmdb_id(tmdb_id, is_adult)

        # 1.6 Try finding by extracted IDs from URLs
        if not person and extracted_ids:
            from app.modules.scrapers.support.registry import ProviderRegistry
            providers_to_check = ["tmdb"] + ProviderRegistry.get_adult_providers()
            for ext_prov in providers_to_check:
                if ext_prov not in extracted_ids:
                    continue
                ext_val = extracted_ids[ext_prov]
                if ext_prov == "tmdb":
                    person = self.get_person_by_tmdb_id(ext_val, is_adult)
                else:
                    try:
                        prov_enum = ext_prov if isinstance(ext_prov, Provider) else Provider(ext_prov)
                        person = self.get_person_by_external_id(prov_enum, ext_val)
                    except ValueError as e:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)
                if person:
                    break

        if not person:
            person = self.create_person(
                name=name,
                profile_path=profile_path,
                gender=gender,
                is_adult=is_adult,
                known_for_department=known_for_department or ("Acting" if is_adult else None)
            )
            self.flush()
        else:
            if profile_path:
                person.profile_path = profile_path
            if gender is not None:
                person.gender = gender
            if is_adult:
                person.is_adult = is_adult
            
            if known_for_department:
                person.known_for_department = known_for_department
            elif is_adult and not person.known_for_department:
                person.known_for_department = "Acting"

        # Update external_ids dictionary (for urls only)
        all_links = dict(extracted_ids)
        if provider and external_id:
            all_links[provider] = str(external_id)
        if tmdb_id:
            all_links[Provider.TMDB] = str(tmdb_id)

        if urls:
            ids = person.external_ids or {}
            existing_urls = ids.get("urls") or []
            existing_urls_set = {u.get("url") if isinstance(u, dict) else u for u in existing_urls}
            for new_url in urls:
                url_str = new_url.get("url") if isinstance(new_url, dict) else new_url
                if url_str and url_str not in existing_urls_set:
                    existing_urls.append({"url": url_str})
                    existing_urls_set.add(url_str)
            ids["urls"] = existing_urls
            person.external_ids = ids

        # 3. Create or update ExternalSourceLink relationships for all resolved links
        for ext_prov, ext_val in all_links.items():
            prov_enum = ext_prov
            if isinstance(prov_enum, str):
                try:
                    prov_enum = Provider(prov_enum)
                except ValueError:
                    continue

            link = self.get_external_link(person.id, prov_enum, ext_val, person=person)
            if not link:
                self.create_external_link(person.id, prov_enum, ext_val, person=person)

        # Map adult performer details if provided
        if performer_details:
            for key, val in performer_details.items():
                if not hasattr(person, key) or val is None:
                    continue
                if key == "scene_count":
                    person.scene_count = max(person.scene_count or 0, int(val))
                else:
                    setattr(person, key, val)
            if not person.known_for_department:
                person.known_for_department = "Acting"

        self.flush()
        person.recalculate_projection(self.db)
        return person

    # --- Embedded PeopleRepository database methods ---
    def get_person_by_external_id(self, provider: Provider, external_id: str) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, ExternalSourceLink):
                if obj.provider == provider and obj.external_id == str(external_id):
                    return obj.person
        link = self.db.query(ExternalSourceLink).filter(
            ExternalSourceLink.provider == provider,
            ExternalSourceLink.external_id == str(external_id)
        ).first()
        return link.person if link else None

    def get_person_by_name(self, name: str) -> Optional[Any]:
        return self.db.query(Person).filter(Person.name == name).first()

    def create_person(self, name: str, profile_path: Optional[str] = None, gender: Optional[int] = None, is_adult: bool = False, known_for_department: Optional[str] = None) -> Any:
        person = Person(
            name=name,
            profile_path=profile_path,
            gender=gender,
            is_adult=is_adult,
            known_for_department=known_for_department,
            external_ids={}
        )
        self.db.add(person)
        return person

    def get_media_person_link(self, match_id: Optional[int], person_id: Optional[int], role: RoleType) -> Optional[Any]:
        if not match_id or not person_id:
            return None
        return self.db.query(MediaPersonLink).filter(
            MediaPersonLink.match_id == match_id,
            MediaPersonLink.person_id == person_id,
            MediaPersonLink.role == role
        ).first()

    def create_media_person_link(self, match_id: int, person_id: int, role: RoleType, order: int = 0, character_name: Optional[str] = None) -> Any:
        link = MediaPersonLink(
            match_id=match_id,
            person_id=person_id,
            role=role,
            order=order,
            character_name=character_name
        )
        self.db.add(link)
        return link

    def get_person_by_tmdb_id(self, tmdb_id: str, is_adult: bool) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, ExternalSourceLink):
                if obj.provider == Provider.TMDB and obj.external_id == str(tmdb_id):
                    if obj.person and obj.person.is_adult == is_adult:
                        return obj.person
        link = self.db.query(ExternalSourceLink).join(Person).filter(
            ExternalSourceLink.provider == Provider.TMDB,
            ExternalSourceLink.external_id == str(tmdb_id),
            Person.is_adult == is_adult
        ).first()
        return link.person if link else None

    def get_external_link(self, person_id: Optional[int], provider: Provider, external_id: str, person: Optional[Any] = None) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, ExternalSourceLink):
                match_person = (obj.person_id == person_id) or (person is not None and obj.person == person)
                if match_person and obj.provider == provider and obj.external_id == str(external_id):
                    return obj
        if person_id is not None:
            return self.db.query(ExternalSourceLink).filter(
                ExternalSourceLink.person_id == person_id,
                ExternalSourceLink.provider == provider,
                ExternalSourceLink.external_id == str(external_id)
            ).first()
        return None

    def create_external_link(self, person_id: Optional[int], provider: Provider, external_id: str, person: Optional[Any] = None) -> Any:
        link = ExternalSourceLink(
            person_id=person_id,
            person=person,
            provider=provider,
            external_id=str(external_id)
        )
        self.db.add(link)
        return link

    def get_person_by_id(self, person_id: int) -> Optional[Any]:
        for obj in self.db.new:
            if isinstance(obj, Person) and obj.id == person_id:
                return obj
        return self.db.query(Person).filter(Person.id == person_id).first()

    def list_people_by_type(self, is_adult: bool, limit: int = 50) -> list[Any]:
        return self.db.query(Person).filter(Person.is_adult == is_adult).limit(limit).all()

    def get_external_links_by_person_id(self, person_id: int) -> list[Any]:
        return self.db.query(ExternalSourceLink).filter(ExternalSourceLink.person_id == person_id).all()

    def save(self, entity: Any) -> None:
        self.db.add(entity)

    def flush(self) -> None:
        self.db.flush()
