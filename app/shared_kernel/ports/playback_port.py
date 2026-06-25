from typing import Protocol

class PlaybackPort(Protocol):
    def save_playback_position(self, item_id: int, current_time: int, total_length: int, user_id: int) -> None:
        """
        Saves the playback position for a given media item and user.
        """
        ...
