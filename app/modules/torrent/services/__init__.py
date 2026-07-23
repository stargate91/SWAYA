import os
from pathlib import Path
from app.modules.torrent.services.jackett_manager import JackettManager
from app.modules.torrent.services.jackett_client import JackettClient
from app.modules.torrent.services.qbittorrent_client import QBittorrentClient
from app.modules.torrent.services.qbittorrent_watcher import QBittorrentCompletionWatcher

# Resolve data root relative to app directory (points to project root 'data/')
DATA_ROOT = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")))

jackett_manager = JackettManager(DATA_ROOT)
jackett_client = JackettClient(api_key=jackett_manager.api_key, base_url=f"http://127.0.0.1:{jackett_manager.port}")

qbittorrent_client = QBittorrentClient(base_url="http://127.0.0.1:8080")
qbittorrent_watcher = QBittorrentCompletionWatcher(qbittorrent_client, poll_interval=10)

def get_qbittorrent_client(db=None) -> QBittorrentClient:
    close_db = False
    if db is None:
        from app.core.database import SessionLocal
        db = SessionLocal()
        close_db = True

    try:
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        port = settings.get_setting("torrent_qbittorrent_port") or "8080"
        user = settings.get_setting("torrent_qbittorrent_user") or "admin"
        password = settings.get_setting("torrent_qbittorrent_pass") or "adminadmin"
        
        base_url = f"http://127.0.0.1:{port}"
        qbittorrent_client.update_config(base_url, user, password)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to dynamically configure QBittorrentClient: {e}")
    finally:
        if close_db and db:
            db.close()

    return qbittorrent_client
