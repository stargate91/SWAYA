from typing import Any, Optional
from sqlalchemy.orm import Session
from app.shared_kernel.ports.people_repository_port import PeopleRepositoryPort
from app.core.enums import Provider, RoleType
from app.modules.people.models import Person, MediaPersonLink, ExternalSourceLink

class DbPeopleRepository(PeopleRepositoryPort):
    def __init__(self, db: Session):
        self.db = db

    def get_person_by_external_id(self, provider: Provider, external_id: str) -> Optional[Any]:
        # Search pending session first
        for obj in self.db.new:
            if isinstance(obj, ExternalSourceLink):
                if obj.provider == provider and obj.external_id == str(external_id):
                    return obj.person
        # Fall back to database query
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
        # Search pending session first
        for obj in self.db.new:
            if isinstance(obj, Person) and obj.is_adult == is_adult and obj.external_ids and obj.external_ids.get("tmdb") == str(tmdb_id):
                return obj
        # Fall back to database query
        return self.db.query(Person).filter(
            Person.is_adult == is_adult,
            Person.external_ids["tmdb"].as_string() == str(tmdb_id)
        ).first()

    def get_external_link(self, person_id: Optional[int], provider: Provider, external_id: str, person: Optional[Any] = None) -> Optional[Any]:
        # Search pending session first
        for obj in self.db.new:
            if isinstance(obj, ExternalSourceLink):
                match_person = (obj.person_id == person_id) or (person is not None and obj.person == person)
                if match_person and obj.provider == provider and obj.external_id == str(external_id):
                    return obj
        # Fall back to database query
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

    def save(self, entity: Any) -> None:
        self.db.add(entity)

    def flush(self) -> None:
        self.db.flush()
