import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.people.models import Person
from app.core.enums import Provider
from app.shared_kernel.ports.people_repository_port import PeopleRepositoryPort

logger = logging.getLogger(__name__)

class PersonService:
    """
    Public service interface for Person entities.
    Encapsulates creating and updating cast members and performers to maintain cross-domain integrity.
    """

    def __init__(self, db_session: Session, people_repo: Optional[PeopleRepositoryPort] = None):
        self.db = db_session
        if people_repo is None:
            from app.infrastructure.repositories.db_people_repository import DbPeopleRepository
            people_repo = DbPeopleRepository(db_session)
        self.people_repo = people_repo

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
            person = self.people_repo.get_person_by_external_id(provider, external_id)

        # 1.5 Try finding by tmdb_id
        if not person and tmdb_id:
            person = self.people_repo.get_person_by_tmdb_id(tmdb_id, is_adult)

        # 1.6 Try finding by extracted IDs from URLs
        if not person and extracted_ids:
            for ext_prov in ["tmdb", Provider.STASHDB, Provider.FANSDB, Provider.PORNDB]:
                if ext_prov not in extracted_ids:
                    continue
                ext_val = extracted_ids[ext_prov]
                if ext_prov == "tmdb":
                    person = self.people_repo.get_person_by_tmdb_id(ext_val, is_adult)
                else:
                    try:
                        prov_enum = ext_prov if isinstance(ext_prov, Provider) else Provider(ext_prov)
                        person = self.people_repo.get_person_by_external_id(prov_enum, ext_val)
                    except ValueError as e:
                        logger.debug(f"Swallowed exception in domains/people/services/person_service.py:66: {e}", exc_info=True)
                if person:
                    break

        if not person:
            person = self.people_repo.create_person(
                name=name,
                profile_path=profile_path,
                gender=gender,
                is_adult=is_adult,
                known_for_department=known_for_department or ("Acting" if is_adult else None)
            )
            self.people_repo.flush()
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

        # Update external_ids dictionary
        all_links = dict(extracted_ids)
        if provider and external_id:
            all_links[provider] = str(external_id)
        if tmdb_id:
            all_links[Provider.TMDB] = str(tmdb_id)

        ids = person.external_ids or {}
        for ext_prov, ext_val in all_links.items():
            key = ext_prov.value if isinstance(ext_prov, Provider) else str(ext_prov)
            ids[key] = str(ext_val)
            ids[f"{key}_id"] = str(ext_val)
        
        if urls:
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

            link = self.people_repo.get_external_link(person.id, prov_enum, ext_val, person=person)
            if not link:
                self.people_repo.create_external_link(person.id, prov_enum, ext_val, person=person)

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

        self.people_repo.flush()
        person.recalculate_projection(self.db)
        return person
