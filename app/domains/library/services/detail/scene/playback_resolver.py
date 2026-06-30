from typing import Tuple, List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.domains.metadata.models import MetadataMatch
from app.domains.users.models import UserOverride
from app.domains.history.models import PlaybackLog, PlaybackPeakLog

class ScenePlaybackResolver:
    def resolve_playback_and_peaks(
        self,
        db: Session,
        match_db: Optional[MetadataMatch],
        metadata_override: Optional[UserOverride],
        override: Optional[UserOverride],
        physical_override: Optional[UserOverride],
        current_uid: int
    ) -> Tuple[bool, int, int, Optional[str], List[Dict[str, Any]], int, List[Dict[str, Any]]]:
        is_watched = False
        watch_count = 0
        resume_position = 0
        last_watched_at_dt = None

        if metadata_override:
            is_watched = metadata_override.is_watched
            watch_count = metadata_override.watch_count or 0
            last_watched_at_dt = metadata_override.last_watched_at
        elif override:
            is_watched = override.is_watched
            watch_count = override.watch_count or 0
            last_watched_at_dt = override.last_watched_at

        if physical_override:
            if physical_override.is_watched:
                is_watched = True
            if physical_override.watch_count and physical_override.watch_count > watch_count:
                watch_count = physical_override.watch_count
            if physical_override.resume_position:
                resume_position = physical_override.resume_position
            if physical_override.last_watched_at:
                if not last_watched_at_dt or physical_override.last_watched_at > last_watched_at_dt:
                    last_watched_at_dt = physical_override.last_watched_at

        playback_logs = []
        if match_db and match_db.media_item_id:
            logs = db.query(PlaybackLog).filter(
                PlaybackLog.user_id == current_uid,
                PlaybackLog.media_item_id == match_db.media_item_id
            ).order_by(PlaybackLog.watched_at.desc()).all()
            playback_logs = [
                {
                    "id": log.id,
                    "watched_at": log.watched_at.isoformat()
                }
                for log in logs
            ]

        peaks_count = 0
        peaks_history = []
        if match_db and match_db.media_item_id:
            peaks = db.query(PlaybackPeakLog).filter(
                PlaybackPeakLog.user_id == current_uid,
                PlaybackPeakLog.media_item_id == match_db.media_item_id
            ).order_by(PlaybackPeakLog.video_position.asc()).all()
            peaks_count = len(peaks)
            peaks_history = [
                {
                    "id": p.id,
                    "video_position": p.video_position,
                    "watched_at": p.created_at.isoformat()
                }
                for p in peaks
            ]

        last_watched_str = last_watched_at_dt.isoformat() if last_watched_at_dt else None
        return is_watched, watch_count, resume_position, last_watched_str, playback_logs, peaks_count, peaks_history
