from typing import Tuple, List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride
from app.modules.history.models import PlaybackLog, PlaybackPeakLog

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
        from app.modules.library.services.detail.detail_mixins import OverrideResolver
        is_watched, watch_count, resume_position, last_watched_at_dt = OverrideResolver.merge_watch_state(
            metadata_override=metadata_override,
            physical_override=physical_override,
            fallback_override=override
        )

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
