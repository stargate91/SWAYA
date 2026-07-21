import logging
import re
import urllib.parse
import os
from typing import Dict, Any, Optional
import requests
from sqlalchemy.orm import Session

from app.modules.history.models import PlaybackPeakLog
from app.modules.library.models import MediaItem
from app.core.exceptions import NotFoundException

logger = logging.getLogger(__name__)


class PlaybackPeakService:
    def __init__(self, db: Session, resolver: Any):
        self.db = db
        self.resolver = resolver

    def _clean_path(self, path_str: Optional[str]) -> str:
        if not path_str:
            return ""
        if path_str.startswith("file:///"):
            path_str = path_str[8:]
        elif path_str.startswith("file://"):
            path_str = path_str[7:]
        decoded = urllib.parse.unquote(path_str)
        return os.path.normpath(decoded).lower()

    def _get_player_info(self) -> tuple[Optional[int], Optional[str], Optional[str]]:
        """Returns (player_time, playing_filename, playing_filepath)."""
        player_time = None
        playing_filename = None
        playing_filepath = None

        # Try VLC
        try:
            r = requests.get("http://127.0.0.1:8080/requests/status.json", auth=("", "swaya"), timeout=0.1)
            if r.status_code == 200:
                data = r.json()
                player_time = int(data.get("time", 0))
                meta = data.get("information", {}).get("category", {}).get("meta", {})
                playing_filename = meta.get("filename") or meta.get("title")
        except Exception as e:
            logger.debug(f"VLC status fetch failed: {e}", exc_info=True)

        # Try MPC-HC
        if player_time is None:
            try:
                r = requests.get("http://127.0.0.1:13579/variables.html", timeout=0.1)
                if r.status_code == 200:
                    pos_match = re.search(r'id="position">(\d+)</p>', r.text)
                    if pos_match:
                        player_time = int(pos_match.group(1)) // 1000
                    file_match = re.search(r'id="file">([^<]+)</p>', r.text)
                    if file_match:
                        playing_filename = file_match.group(1)
                    filepath_match = re.search(r'id="filepath">([^<]+)</p>', r.text)
                    if filepath_match:
                        playing_filepath = filepath_match.group(1)
            except Exception as e:
                logger.debug(f"MPC-HC status fetch failed: {e}", exc_info=True)

        return player_time, playing_filename, playing_filepath

    def add_peak(self, item_id: str, current_uid: int, video_position: Optional[int] = None, snapshot_path: Optional[str] = None) -> Dict[str, Any]:
        media_item_id, metadata_match_id = self.resolver.resolve_ids(item_id)
        if not media_item_id:
            raise NotFoundException("Local media item not found")

        if video_position is None:
            player_time, playing_filename, playing_filepath = self._get_player_info()
            video_position = 0

            if player_time is not None:
                media_item = self.db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
                if media_item:
                    target_filename = media_item.filename
                    target_path = media_item.current_path

                    cleaned_target_filename = os.path.normpath(target_filename).lower() if target_filename else ""
                    cleaned_target_path = self._clean_path(target_path)

                    matches = False

                    if playing_filepath:
                        cleaned_playing_filepath = self._clean_path(playing_filepath)
                        if cleaned_playing_filepath == cleaned_target_path:
                            matches = True
                        elif os.path.basename(cleaned_playing_filepath) == cleaned_target_filename:
                            matches = True
                        elif os.path.splitext(os.path.basename(cleaned_playing_filepath))[0] == os.path.splitext(cleaned_target_filename)[0]:
                            matches = True

                    if not matches and playing_filename:
                        cleaned_playing_filename = self._clean_path(playing_filename)
                        if cleaned_playing_filename == cleaned_target_path:
                            matches = True
                        elif cleaned_playing_filename == cleaned_target_filename or os.path.basename(cleaned_playing_filename) == cleaned_target_filename:
                            matches = True
                        elif os.path.splitext(os.path.basename(cleaned_playing_filename))[0] == os.path.splitext(cleaned_target_filename)[0]:
                            matches = True
                        else:
                            base_target = os.path.splitext(cleaned_target_filename)[0]
                            base_playing = os.path.splitext(os.path.basename(cleaned_playing_filename))[0]
                            if base_target and base_playing and (base_target in base_playing or base_playing in base_target):
                                matches = True

                    if (playing_filepath or playing_filename) and not matches:
                        player_time = None

                video_position = player_time if player_time is not None else 0

        peak = PlaybackPeakLog(
            user_id=current_uid,
            media_item_id=media_item_id,
            video_position=video_position,
            snapshot_path=snapshot_path
        )
        self.db.add(peak)
        self.db.commit()

        return self.get_peaks_history(media_item_id, current_uid)

    def delete_peak(self, item_id: str, log_id: int, current_uid: int) -> Dict[str, Any]:
        media_item_id, _ = self.resolver.resolve_ids(item_id)
        if not media_item_id:
            raise NotFoundException("Local media item not found")

        peak = self.db.query(PlaybackPeakLog).filter(
            PlaybackPeakLog.id == log_id,
            PlaybackPeakLog.user_id == current_uid,
            PlaybackPeakLog.media_item_id == media_item_id
        ).first()

        if peak:
            self.db.delete(peak)
            self.db.commit()

        return self.get_peaks_history(media_item_id, current_uid)

    def get_peaks_history(self, media_item_id: int, current_uid: int) -> Dict[str, Any]:
        peaks = self.db.query(PlaybackPeakLog).filter(
            PlaybackPeakLog.user_id == current_uid,
            PlaybackPeakLog.media_item_id == media_item_id
        ).order_by(PlaybackPeakLog.video_position.asc()).all()

        return {
            "peaks_count": len(peaks),
            "peaks_history": [
                {
                    "id": p.id,
                    "video_position": p.video_position,
                    "watched_at": p.created_at.isoformat()
                }
                for p in peaks
            ]
        }
