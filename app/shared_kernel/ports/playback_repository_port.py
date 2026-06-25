from typing import Protocol, Optional, Any, List

class PlaybackRepositoryPort(Protocol):
    def resolve_item_id_from_external(self, item_str: str) -> Optional[int]:
        """
        Resolves media item ID from a prefixed external ID or simple external/database match ID.
        """
        ...

    def get_playback_log_by_id(self, log_id: int, item_id: int) -> Optional[Any]:
        """
        Retrieves a PlaybackLog by its ID and media item ID.
        """
        ...

    def get_latest_playback_log(self, media_item_id: int) -> Optional[Any]:
        """
        Gets the latest playback log for a media item.
        """
        ...

    def create_playback_log(self, media_item_id: int, watched_at: Any) -> Any:
        """
        Creates a new PlaybackLog.
        """
        ...

    def update_playback_log_watched_at(self, log_id: int, watched_at: Any) -> Optional[Any]:
        """
        Updates the watched_at time of a playback log.
        """
        ...

    def delete_playback_log(self, log_id: int) -> None:
        """
        Deletes a PlaybackLog.
        """
        ...

    def get_watched_history_logs(self, offset: int, limit: int, include_adult: bool) -> List[Any]:
        """
        Retrieves a page of PlaybackLog entries with pre-loaded media item details.
        """
        ...
