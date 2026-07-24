"""
Shared helpers for detail formatters — override resolution, watch state merge,
playback logs, peaks, and external links.

These replace the duplicated blocks found across tmdb_movie, local_movie,
porndb_movie, and scene_detail_service.
"""
from typing import Optional, Tuple, List, Dict, Any

from sqlalchemy.orm import Session

from app.modules.users.models import UserOverride
from app.modules.metadata.models import MetadataMatch


class OverrideResolver:
    """Resolves metadata + physical UserOverride for a given match/item."""

    @staticmethod
    def resolve_overrides(
        db: Session,
        current_uid: int,
        match: Optional[MetadataMatch] = None,
        media_item_id: Optional[int] = None,
    ) -> Tuple[Optional[UserOverride], Optional[UserOverride]]:
        """
        Returns (metadata_override, physical_override).
        
        - metadata_override: linked via match.id
        - physical_override: linked via media_item_id
        """
        metadata_override = None
        if match:
            metadata_override = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.metadata_match_id == match.id
            ).first()

        physical_override = None
        effective_item_id = media_item_id or (match.media_item_id if match else None)
        if effective_item_id:
            physical_override = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.media_item_id == effective_item_id
            ).first()

        return metadata_override, physical_override

    @staticmethod
    def merge_watch_state(
        metadata_override: Optional[UserOverride] = None,
        physical_override: Optional[UserOverride] = None,
        fallback_override: Optional[UserOverride] = None,
    ) -> Tuple[bool, int, int, Optional[Any]]:
        """
        Merges watch state from metadata, physical, and fallback overrides.
        
        Returns (is_watched, watch_count, resume_position, last_watched_at_dt).
        """
        is_watched = False
        watch_count = 0
        resume_position = 0
        last_watched_at_dt = None

        if metadata_override:
            is_watched = metadata_override.is_watched
            watch_count = metadata_override.watch_count or 0
            last_watched_at_dt = metadata_override.last_watched_at
        elif fallback_override:
            is_watched = fallback_override.is_watched
            watch_count = fallback_override.watch_count or 0
            last_watched_at_dt = fallback_override.last_watched_at

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

        return is_watched, watch_count, resume_position, last_watched_at_dt

    @staticmethod
    def resolve_and_merge_sibling_states(
        db: Session,
        current_uid: int,
        media_item_id: int,
        match_ids: List[int],
        base_is_watched: bool,
        base_watch_count: int,
        base_resume_position: int,
        base_last_watched_at: Optional[str]
    ) -> Tuple[bool, int, int, Optional[str]]:
        """
        Queries and merges watch state overrides for sibling episodes/items.
        """
        sibling_overrides = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            (UserOverride.media_item_id == media_item_id) | (UserOverride.metadata_match_id.in_(match_ids))
        ).all()
        
        is_watched = base_is_watched
        watch_count = base_watch_count
        resume_position = base_resume_position
        last_watched_at = base_last_watched_at

        for sov in sibling_overrides:
            if sov.is_watched:
                is_watched = True
            if sov.watch_count and sov.watch_count > watch_count:
                watch_count = sov.watch_count
            if sov.resume_position and sov.resume_position > resume_position:
                resume_position = sov.resume_position
            if sov.last_watched_at:
                sov_iso = sov.last_watched_at.isoformat()
                if not last_watched_at or sov_iso > last_watched_at:
                    last_watched_at = sov_iso

        return is_watched, watch_count, resume_position, last_watched_at


class PlaybackResolver:
    """Queries playback logs and peak moments for any media item."""

    @staticmethod
    def get_playback_logs(
        db: Session, current_uid: int, media_item_id: Optional[int]
    ) -> List[Dict[str, Any]]:
        if not media_item_id:
            return []
        from app.modules.history.models import PlaybackLog
        logs = db.query(PlaybackLog).filter(
            PlaybackLog.user_id == current_uid,
            PlaybackLog.media_item_id == media_item_id
        ).order_by(PlaybackLog.watched_at.desc()).all()
        return [
            {"id": log.id, "watched_at": log.watched_at.isoformat()}
            for log in logs
        ]

    @staticmethod
    def get_peaks(
        db: Session, current_uid: int, media_item_id: Optional[int]
    ) -> Tuple[int, List[Dict[str, Any]]]:
        if not media_item_id:
            return 0, []
        from app.modules.history.models import PlaybackPeakLog
        peaks = db.query(PlaybackPeakLog).filter(
            PlaybackPeakLog.user_id == current_uid,
            PlaybackPeakLog.media_item_id == media_item_id
        ).order_by(PlaybackPeakLog.video_position.asc()).all()
        peaks_history = [
            {
                "id": p.id,
                "video_position": p.video_position,
                "watched_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in peaks
        ]
        return len(peaks), peaks_history


class ExternalLinksBuilder:
    """Appends external_links to a result dict."""

    @staticmethod
    def append_links(result: dict, ext_ids: dict, media_type: str) -> None:
        from app.modules.library.services.detail.external_links import generate_external_links
        result["external_links"] = generate_external_links(ext_ids, media_type)
