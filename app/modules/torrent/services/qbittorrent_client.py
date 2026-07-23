import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class QBittorrentClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8080", username: str = "admin", password: str = "adminadmin"):
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        self.session = requests.Session()

    def update_config(self, base_url: str, username: str, password: str):
        old_url = self.base_url
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        if old_url != self.base_url:
            # Reset session on URL change
            self.session = requests.Session()

    def login(self) -> bool:
        data = {
            "username": self.username,
            "password": self.password
        }
        try:
            url = f"{self.base_url}/api/v2/auth/login"
            res = self.session.post(url, data=data, timeout=5)
            if res.status_code == 200 and "Ok." in res.text:
                logger.info("Successfully logged in to qBittorrent WebUI.")
                return True
            logger.warning(f"qBittorrent WebUI login failed: {res.status_code} - {res.text}")
            return False
        except Exception as e:
            logger.warning(f"qBittorrent WebUI login exception: {e}")
            return False

    def _post(self, path: str, data: Optional[Dict[str, Any]] = None, files: Optional[Dict[str, Any]] = None, retried: bool = False) -> Any:
        try:
            url = f"{self.base_url}{path}"
            response = self.session.post(url, data=data, files=files, timeout=5)
            if response.status_code in (401, 403) and not retried:
                logger.info("Access denied. Attempting qBittorrent WebUI login...")
                if self.login():
                    return self._post(path, data=data, files=files, retried=True)
            return response
        except Exception as e:
            logger.warning(f"qBittorrent API POST {path} failed: {e}")
            return None

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None, retried: bool = False) -> Any:
        try:
            url = f"{self.base_url}{path}"
            response = self.session.get(url, params=params, timeout=5)
            if response.status_code in (401, 403) and not retried:
                logger.info("Access denied. Attempting qBittorrent WebUI login...")
                if self.login():
                    return self._get(path, params=params, retried=True)
            if response.status_code == 200:
                return response
            return None
        except Exception as e:
            logger.warning(f"qBittorrent API GET {path} failed: {e}")
            return None

    def add_torrent(self, torrent_url_or_magnet: str, save_path: Optional[str] = None) -> bool:
        data = {
            "urls": torrent_url_or_magnet,
            "category": "swaya"
        }
        if save_path:
            data["savepath"] = save_path
            
        res = self._post("/api/v2/torrents/add", data=data)
        if res is None:
            logger.error("qBittorrent add_torrent failed: response is None")
            return False
        if not (200 <= res.status_code < 300):
            logger.error(f"qBittorrent add_torrent failed with status {res.status_code}: {res.text}")
            return False
        return True

    def delete_torrent(self, info_hash: str, delete_files: bool = False) -> bool:
        data = {
            "hashes": info_hash,
            "deleteFiles": "true" if delete_files else "false"
        }
        res = self._post("/api/v2/torrents/delete", data=data)
        return res is not None and res.status_code == 200

    def list_torrents(self) -> List[Dict[str, Any]]:
        res = self._get("/api/v2/torrents/info")
        if not res:
            return []
            
        try:
            torrents = res.json()
        except Exception as e:
            logger.error(f"Failed to parse qBittorrent response: {e}")
            return []
            
        formatted = []
        for t in torrents:
            if t.get("category") != "swaya":
                continue
            state = t.get("state", "unknown")
            
            # Map qBittorrent states to our common schema ("downloading", "paused", "seeding", "checking", "error")
            if state in ("downloading", "stalledDL", "metaDL", "checkingDL"):
                mapped_state = "downloading"
            elif state in ("pausedDL", "pausedUP"):
                mapped_state = "paused"
            elif state in ("uploading", "stalledUP", "checkingUP"):
                mapped_state = "seeding"
            elif state in ("error", "missingFiles"):
                mapped_state = "error"
            else:
                mapped_state = "downloading"  # Default fallback for active checks
                
            progress = float(t.get("progress", 0.0))
            
            # ETA from qbitorrent is in seconds (8640000 = infinity/no ETA)
            eta = int(t.get("eta", 0))
            if eta >= 8640000:
                eta = 0

            formatted.append({
                "hash": t.get("hash"),
                "name": t.get("name"),
                "size": int(t.get("total_size", 0)),
                "progress": progress,
                "dlspeed": int(t.get("dlspeed", 0)),
                "eta": eta,
                "state": mapped_state,
                "num_seeds": int(t.get("num_seeds", 0)),
                "num_leechs": int(t.get("num_leechs", 0)),
                "content_path": t.get("content_path")
            })
        return formatted
