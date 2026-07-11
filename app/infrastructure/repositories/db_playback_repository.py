import logging
from typing import Optional, List, Any
from sqlalchemy.orm import Session, joinedload, selectinload
from app.shared_kernel.ports.playback_repository_port import PlaybackRepositoryPort
from app.shared_kernel.enums import MediaType
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.domains.history.models import PlaybackLog

logger = logging.getLogger(__name__)

class DbPlaybackRepository(PlaybackRepositoryPort):
    def __init__(self, db: Session):
        self.db = db

    def resolve_item_id_from_external(self, item_str: str) -> Optional[int]:
        db = self.db
        item_str = str(item_str)
        match_db = None
        
        parts = item_str.split("_")
        if len(parts) >= 4 and parts[0] in {"tmdb", "tv"}:
            try:
                tv_show_id = parts[1]
                season_num = int(parts[2])
                ep_num = int(parts[3])
                
                episodes = db.query(MetadataMatch).filter(
                    MetadataMatch.external_id == tv_show_id,
                    MetadataMatch.media_type == MediaType.EPISODE,
                    MetadataMatch.season_number == season_num
                ).all()
                
                for ep in episodes:
                    ep_val = ep.episode_number
                    if ep_val == ep_num:
                        match_db = ep
                        break
                    elif isinstance(ep_val, list) and ep_num in ep_val:
                        match_db = ep
                        break
                    elif isinstance(ep_val, str):
                        try:
                            import json
                            loaded = json.loads(ep_val)
                            if loaded == ep_num or (isinstance(loaded, list) and ep_num in loaded):
                                match_db = ep
                                break
                        except Exception:
                            if ep_val == str(ep_num):
                                match_db = ep
                                break
            except ValueError as e:
                logger.debug(f"Swallowed exception in infrastructure/repositories/db_playback_repository.py:50: {e}", exc_info=True)
        elif len(parts) == 3:
            try:
                tv_show_id = parts[0]
                season_num = int(parts[1])
                ep_num = int(parts[2])
                
                episodes = db.query(MetadataMatch).filter(
                    MetadataMatch.external_id == tv_show_id,
                    MetadataMatch.media_type == MediaType.EPISODE,
                    MetadataMatch.season_number == season_num
                ).all()
                
                for ep in episodes:
                    ep_val = ep.episode_number
                    if ep_val == ep_num:
                        match_db = ep
                        break
                    elif isinstance(ep_val, list) and ep_num in ep_val:
                        match_db = ep
                        break
                    elif isinstance(ep_val, str):
                        try:
                            import json
                            loaded = json.loads(ep_val)
                            if loaded == ep_num or (isinstance(loaded, list) and ep_num in loaded):
                                match_db = ep
                                break
                        except Exception:
                            if ep_val == str(ep_num):
                                match_db = ep
                                break
            except ValueError as e:
                logger.debug(f"Swallowed exception in infrastructure/repositories/db_playback_repository.py:83: {e}", exc_info=True)

        if not match_db and "_" in item_str:
            parts = item_str.split("_", 1)
            uuid_or_id = parts[1]
            id_filter = MetadataMatch.id == int(uuid_or_id) if uuid_or_id.isdigit() else False
            match_db = db.query(MetadataMatch).filter(
                (MetadataMatch.external_id == uuid_or_id) | id_filter
            ).first()
        
        if not match_db:
            id_filter = MetadataMatch.id == int(item_str) if item_str.isdigit() else False
            match_db = db.query(MetadataMatch).filter(
                (MetadataMatch.external_id == item_str) | id_filter
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
        query = self.db.query(PlaybackLog).join(MediaItem)
        if not include_adult:
            active_adult_match = self.db.query(MetadataMatch.id).filter(
                MetadataMatch.media_item_id == MediaItem.id,
                MetadataMatch.is_active,
                MetadataMatch.is_adult,
            ).exists()
            query = query.filter(~active_adult_match)

        return query.options(
            joinedload(PlaybackLog.media_item).options(
                selectinload(MediaItem.matches).selectinload(MetadataMatch.localizations)
            )
        ).order_by(PlaybackLog.watched_at.desc()).offset(offset).limit(limit).all()