from typing import Protocol, Tuple, Optional, Dict, Any

class MediaResolverPort(Protocol):
    def resolve_ids(self, item_id: str, media_type: Optional[str] = None) -> Tuple[Optional[int], Optional[int]]:
        """Resolves item_id into (media_item_id, metadata_match_id)."""
        ...

    def update_item_status(self, item_id: int, status: str) -> Dict[str, Any]:
        """Updates status of a MediaItem by ID."""
        ...
