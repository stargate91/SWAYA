import logging
import json
from typing import Optional, List, Any
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.enums import MediaType
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.history.models import PlaybackLog

logger = logging.getLogger(__name__)

class PlaybackHistoryService:
    def __init__(self, db: Session):
        self.db = db

    def resolve_item_id_from_external(self, item_str: str) -> Optional[int]:
        db = self.db
        item_str = str(item_str)
        match_db = None
        
        from app.core.identifier_utils import parse_identifier, ParsedIdentifier
        parsed = parse_identifier(item_str)
        if not parsed:
            # Fallback for raw tv show format: {tv_id}_{season}_{episode}
            parts = item_str.split("_")
            if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
                try:
                    parsed = ParsedIdentifier(provider="tmdb", external_id=parts[0], season=int(parts[1]), episode=int(parts[2]))
                except ValueError:
                    pass
        
        if parsed and parsed.episode is not None:
            episodes = db.query(MetadataMatch).filter(
                MetadataMatch.external_id == parsed.external_id,
                MetadataMatch.media_type == MediaType.EPISODE,
                MetadataMatch.season_number == parsed.season
            ).all()
            
            for ep in episodes:
                ep_val = ep.episode_number
                if ep_val == parsed.episode:
                    match_db = ep
                    break
                elif isinstance(ep_val, list) and parsed.episode in ep_val:
                    match_db = ep
                    break
                elif isinstance(ep_val, str):
                    try:
                        loaded = json.loads(ep_val)
                        if loaded == parsed.episode or (isinstance(loaded, list) and parsed.episode in loaded):
                            match_db = ep
                            break
                    except Exception:
                        if ep_val == str(parsed.episode):
                            match_db = ep
                            break

        if not match_db:
            ext_id = parsed.external_id if parsed else item_str
            id_filter = MetadataMatch.id == int(ext_id) if ext_id.isdigit() else False
            match_db = db.query(MetadataMatch).filter(
                (MetadataMatch.external_id == ext_id) | id_filter
            ).first()
            
        if match_db and match_db.media_item_id:
            return match_db.media_item_id
        return None

    def get_playback_log_by_id(self, log_id: int, item_id: int) -> Optional[Any]:
        return self.db.query(PlaybackLog).filter(
            PlaybackLog.id == log_id,
            PlaybackLog.media_item_id == item_id,
        ).first()

    def get_latest_playback_log(self, media_item_id: int) -> Optional[Any]:
        return self.db.query(PlaybackLog).filter(
            PlaybackLog.media_item_id == media_item_id
        ).order_by(PlaybackLog.watched_at.desc()).first()

    def create_playback_log(self, media_item_id: int, watched_at: Any) -> Any:
        log = PlaybackLog(media_item_id=media_item_id, watched_at=watched_at)
        self.db.add(log)
        self.db.flush()
        return log

    def update_playback_log_watched_at(self, log_id: int, watched_at: Any) -> Optional[Any]:
        log = self.db.query(PlaybackLog).filter(PlaybackLog.id == log_id).first()
        if log:
            log.watched_at = watched_at
            self.db.flush()
        return log

    def delete_playback_log(self, log_id: int) -> None:
        log = self.db.query(PlaybackLog).filter(PlaybackLog.id == log_id).first()
        if log:
            self.db.delete(log)
            self.db.flush()

    def get_watched_history_logs(self, offset: int, limit: int, include_adult: bool) -> List[Any]:
        from app.modules.library.models import Library
        query = self.db.query(PlaybackLog).join(MediaItem).join(Library)
        if not include_adult:
            active_adult_match = self.db.query(MetadataMatch.id).filter(
                MetadataMatch.media_item_id == MediaItem.id,
                MetadataMatch.is_active,
                MetadataMatch.is_adult,
            ).exists()
            query = query.filter(~active_adult_match).filter(Library.is_adult == False)

        return query.options(
            joinedload(PlaybackLog.media_item).options(
                selectinload(MediaItem.matches).selectinload(MetadataMatch.localizations)
            )
        ).order_by(PlaybackLog.watched_at.desc()).offset(offset).limit(limit).all()
