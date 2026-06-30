from typing import Protocol, List, Dict, Any, Optional

class MediaItemPort(Protocol):
    def get_local_library_map_by_external_ids(self, provider: str, external_ids: List[str]) -> Dict[str, int]:
        """
        Queries local database to find active MetadataMatches for a provider and external IDs list,
        and returns a dictionary mapping external_id -> media_item_id.
        """
        ...

    def update_library_item_type_or_hierarchy(self, item_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handles conversion between MediaItem and ExtraFile, shifting TV episode match,
        and other structural library item updates.
        """
        ...

    def bulk_update_library_items(self, item_ids: List[str], is_extra: bool, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Applies bulk library structure updates to extra files or media items.
        """
        ...

    def get_ignored_items(self, search: str = "", offset: int = 0, limit: int = 40) -> Dict[str, Any]:
        """
        Retrieves paginated ignored media items.
        """
        ...

    def restore_ignored_items(self, item_ids: List[int]) -> int:
        """
        Restores ignored media items to their previous status.
        """
        ...

    def repair_inconsistent_matched_items(self) -> int:
        """
        Resets status of matched items that have no associated matches to NEW.
        """
        ...

    def get_all_libraries(self) -> List[Any]:
        """
        Retrieves all Library records.
        """
        ...

    def create_library(self, name: str, root_path: str) -> Any:
        """
        Creates and returns a new Library record.
        """
        ...

    def get_item_by_id(self, item_id: int) -> Optional[Any]:
        """
        Retrieves a MediaItem by its database ID.
        """
        ...

    def set_item_status(self, item_id: int, status: Any) -> None:
        """
        Sets the status of a MediaItem by ID.
        """
        ...

    def get_extra_by_id(self, extra_id: int) -> Optional[Any]:
        """
        Retrieves an ExtraFile by its database ID.
        """
        ...

    def get_item_by_relative_path(self, relative_path: str) -> Optional[Any]:
        """
        Retrieves a MediaItem by relative path.
        """
        ...

    def get_item_by_absolute_path(self, absolute_path: str) -> Optional[Any]:
        """
        Retrieves a MediaItem by absolute current_path.
        """
        ...

    def delete_item(self, item_id: int) -> None:
        """
        Deletes a MediaItem record.
        """
        ...

    def delete_extra(self, extra_id: int) -> None:
        """
        Deletes an ExtraFile record.
        """
        ...

    def update_item_path_and_status(self, item_id: int, path: str, status: Any) -> None:
        """
        Updates the current_path and status of a MediaItem.
        """
        ...

    def update_extra_path(self, extra_id: int, path: str) -> None:
        """
        Updates the current_path of an ExtraFile.
        """
        ...

    def update_custom_media_item_fields(self, item_id: int, edition: Optional[str] = None, audio_type: Optional[str] = None, source: Optional[str] = None) -> None:
        """
        Updates custom metadata fields (edition, audio_type, source) of a MediaItem.
        """
        ...
