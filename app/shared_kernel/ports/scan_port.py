from typing import Protocol, Set, List, Optional, Any

class ScanPort(Protocol):
    def get_active_match_ids(self, media_type: Optional[str] = None, provider: Optional[str] = None) -> Set[int]:
        """
        Retrieves IDs of all active MetadataMatch records linked to library items
        with status in [ItemStatus.RENAMED, ItemStatus.ORGANIZED].
        If media_type is specified:
          - "movie": only movies
          - "scene": only scenes
          - "tv_or_episode": tv shows or episodes
        If provider is specified: filters matches by that provider name.
        """
        ...

    def get_matched_match_ids(self, statuses: List[str]) -> List[int]:
        """
        Retrieves active MetadataMatch IDs linked to library items in the given statuses list.
        """
        ...

    def get_active_match_id(self, media_item_id: int) -> Optional[int]:
        """
        Returns active MetadataMatch ID for a media item.
        """
        ...

    def get_metadata_match_ids_for_media_items(self, item_ids: List[int]) -> List[int]:
        """
        Retrieves active MetadataMatch IDs for a list of media item IDs.
        """
        ...

    def get_items_for_scan_retry(self, scan_mode: Any) -> List[Any]:
        """
        Retrieves MediaItems in review statuses for scan retry under given scan_mode.
        """
        ...

    def reset_items_for_retry(self, item_ids: List[int]) -> None:
        """
        Resets status of items to NEW and deletes their existing MetadataMatch records.
        """
        ...

    def enrich_item_language(self, item_id: int, language: str) -> None:
        """
        Enriches a matched item metadata for a specific language.
        """
        ...
