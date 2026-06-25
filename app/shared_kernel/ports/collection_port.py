from typing import Protocol

class CollectionPort(Protocol):
    def get_or_create_collection_id(self, external_id: str, provider: str = "tmdb") -> int:
        """
        Retrieves or creates a MediaCollection by external ID and provider, returning its database ID.
        """
        ...
