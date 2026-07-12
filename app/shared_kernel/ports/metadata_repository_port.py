from typing import Protocol, Any, Optional
from app.shared_kernel.enums import Provider, MediaType

class MetadataRepositoryPort(Protocol):
    def get_match(self, provider: Provider, external_id: str, media_type: MediaType, media_item_id: Optional[int] = None) -> Optional[Any]:
        """Finds a MetadataMatch record."""
        ...
        
    def create_match(self, provider: Provider, external_id: str, media_type: MediaType, media_item_id: Optional[int] = None) -> Any:
        """Creates and returns a new MetadataMatch record."""
        ...

    def get_studio_by_name(self, name: str) -> Optional[Any]:
        """Finds a Studio by name."""
        ...

    def resolve_studio_by_name(self, name: str) -> Optional[Any]:
        """Finds a Studio by name, checking aliases first."""
        ...

    def create_studio(self, name: str, logo_path: Optional[str] = None) -> Any:
        """Creates and returns a new Studio record."""
        ...

    def get_or_create_collection(self, provider: Provider, external_id: str) -> Any:
        """Gets or creates a MediaCollection by external ID and provider."""
        ...

    def get_match_by_item(self, media_item_id: int, active_only: bool = False) -> Optional[Any]:
        """Finds a MetadataMatch record by media item ID."""
        ...

    def get_tv_match(self, provider: Provider, external_id: str) -> Optional[Any]:
        """Finds a TV MetadataMatch record (parent show)."""
        ...

    def get_season_match(self, provider: Provider, parent_id: int, season_number: int) -> Optional[Any]:
        """Finds a Season MetadataMatch record."""
        ...

    def get_collection(self, provider: Provider, external_id: str) -> Optional[Any]:
        """Finds a MediaCollection by provider and external ID."""
        ...

    def create_collection(self, provider: Provider, external_id: str, backdrop_path: Optional[str] = None) -> Any:
        """Creates a new MediaCollection."""
        ...

    def get_localization(self, match_id: Optional[int], locale: str) -> Optional[Any]:
        """Finds a MetadataLocalization by match ID and locale."""
        ...

    def create_localization(self, match_id: Optional[int], locale: str, **kwargs) -> Any:
        """Creates a new MetadataLocalization."""
        ...

    def get_collection_localization(self, collection_id: int, locale: str) -> Optional[Any]:
        """Finds a MediaCollectionLocalization by collection ID and locale."""
        ...

    def create_collection_localization(self, collection_id: int, locale: str, **kwargs) -> Any:
        """Creates a new MediaCollectionLocalization."""
        ...

    def save(self, entity: Any) -> None:
        """Adds entity to session."""
        ...

    def flush(self) -> None:
        """Flushes session changes to database."""
        ...

