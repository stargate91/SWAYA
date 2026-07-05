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
            
            # Find the latest playback log to update
            from app.domains.history.models import PlaybackLog
            log = self.db.query(PlaybackLog).filter(
                PlaybackLog.media_item_id == item_id,
                PlaybackLog.user_id == user_id
            ).order_by(PlaybackLog.watched_at.desc()).first()
            
            override.resume_position = current_time
            if log:
                log.position_seconds = current_time
                
            if total_length > 0 and current_time / total_length > 0.90:
                if not override.is_watched:
                    override.is_watched = True
                    override.watch_count = (override.watch_count or 0) + 1
                override.resume_position = 0
                if log:
                    log.position_seconds = total_length
            self.db.flush()
