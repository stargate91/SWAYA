from typing import Protocol, List, Optional, Any

class RenamePort(Protocol):
    def get_items_for_renaming(self, item_ids: Optional[List[int]] = None) -> List[Any]:
        """
        Retrieves MediaItems in ItemStatus.MATCHED status, possibly filtered by item_ids.
        """
        ...

    def relink_relations_for_collision(self, target_item_id: int, source_item_id: int) -> None:
        """
        Relinks custom list items, playback logs, and non-duplicate extras from target to source.
        """
        ...

    def log_rename_action(self, batch_id: int, item_id: Optional[int], extra_id: Optional[int], action_type: Any, status: Any, old_val: Optional[str], new_val: Optional[str], error: Optional[str] = None) -> None:
        """
        Logs a rename operation to the action log.
        """
        ...

    def get_action_logs_for_undo(self, batch_id: int) -> List[Any]:
        """
        Gets successful action logs for a batch (in reverse order).
        """
        ...

    def update_action_log_status(self, log_id: int, status: Any, error: Optional[str] = None) -> None:
        """
        Updates the status and error of an ActionLog.
        """
        ...

    def create_action_batch(self, name: str) -> int:
        """
        Creates an ActionBatch and returns its ID.
        """
        ...

    def get_siblings_by_group_hash(self, group_hash: str, exclude_item_id: int) -> List[Any]:
        """
        Retrieves MediaItem siblings matching the group_hash, excluding the given item ID.
        """
        ...
