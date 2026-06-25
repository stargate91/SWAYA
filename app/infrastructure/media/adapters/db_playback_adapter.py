from app.domains.library.models import MediaItem
from app.domains.users.models import UserOverride
from app.shared_kernel.ports.playback_port import PlaybackPort

class DbPlaybackAdapter(PlaybackPort):
    def save_playback_position(self, item_id: int, current_time: int, total_length: int, user_id: int) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if item:
            if total_length > 0:
                item.duration = total_length
            override = self.db.query(UserOverride).filter(
                UserOverride.user_id == user_id, 
                UserOverride.media_item_id == item_id
            ).first()
            if not override:
                override = UserOverride(user_id=user_id, media_item_id=item_id)
                self.db.add(override)
            override.resume_position = current_time
            if total_length > 0 and current_time / total_length > 0.90:
                override.is_watched = True
                override.resume_position = 0
            self.db.flush()
