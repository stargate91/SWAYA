from typing import Protocol, Any, Optional
from app.core.enums import Provider, RoleType

class PeopleRepositoryPort(Protocol):
    def get_person_by_external_id(self, provider: Provider, external_id: str) -> Optional[Any]:
        """Finds a Person by external provider ID."""
        ...

    def get_person_by_name(self, name: str) -> Optional[Any]:
        """Finds a Person by name."""
        ...

    def create_person(self, name: str, profile_path: Optional[str] = None, gender: Optional[int] = None, is_adult: bool = False, known_for_department: Optional[str] = None) -> Any:
        """Creates a new Person."""
        ...

    def get_media_person_link(self, match_id: Optional[int], person_id: Optional[int], role: RoleType) -> Optional[Any]:
        """Finds an existing MediaPersonLink."""
        ...

    def create_media_person_link(self, match_id: int, person_id: int, role: RoleType, order: int = 0, character_name: Optional[str] = None) -> Any:
        """Creates and links a Person to a Match."""
        ...

    def get_person_by_tmdb_id(self, tmdb_id: str, is_adult: bool) -> Optional[Any]:
        """Finds a Person by TMDB ID."""
        ...

    def get_external_link(self, person_id: Optional[int], provider: Provider, external_id: str, person: Optional[Any] = None) -> Optional[Any]:
        """Finds an ExternalSourceLink by person, provider, and external ID."""
        ...

    def create_external_link(self, person_id: Optional[int], provider: Provider, external_id: str, person: Optional[Any] = None) -> Any:
        """Creates a new ExternalSourceLink."""
        ...

    def save(self, entity: Any) -> None:
        """Adds entity to session."""
        ...

    def flush(self) -> None:
        """Flushes session changes."""
        ...
