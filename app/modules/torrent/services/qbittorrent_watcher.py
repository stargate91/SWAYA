import time
import logging
import threading
from typing import Set, List

logger = logging.getLogger(__name__)

class QBittorrentCompletionWatcher:
    def __init__(self, qb_client, poll_interval=10):
        self._client = qb_client
        self._known_completed: Set[str] = set()
        self._pending_paths: List[str] = []
        self._poll_interval = poll_interval
        self._thread = None
        self._seeded = False

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()
        logger.info("QBittorrentCompletionWatcher started.")

    def _poll_loop(self):
        while True:
            try:
                time.sleep(self._poll_interval)
                self._check_completions()
            except Exception as e:
                logger.error(f"Error in QBittorrentCompletionWatcher loop: {e}", exc_info=True)

    def _seed_known(self, torrents):
        """Seed initial list of completed downloads so we don't trigger scans on startup."""
        for t in torrents:
            info_hash = t.get("hash")
            progress = float(t.get("progress", 0.0))
            if progress >= 1.0 and info_hash:
                self._known_completed.add(info_hash)
        self._seeded = True
        logger.info(f"QBittorrentCompletionWatcher seeded with {len(self._known_completed)} existing completed downloads.")

    def _check_completions(self):
        # Fetch current torrent info
        res = self._client._get("/api/v2/torrents/info")
        if not res:
            return
            
        try:
            torrents = res.json()
        except Exception as e:
            logger.warning(f"Watcher failed to parse qBittorrent info JSON: {e}")
            return

        if not self._seeded:
            self._seed_known(torrents)
            return

        new_paths = []
        for t in torrents:
            info_hash = t.get("hash")
            progress = float(t.get("progress", 0.0))
            content_path = t.get("content_path")
            
            if progress >= 1.0 and info_hash not in self._known_completed:
                self._known_completed.add(info_hash)
                if content_path:
                    new_paths.append(content_path)
                    logger.info(f"New completed torrent detected (Hash: {info_hash}), path: {content_path}")
                
                pass

        if new_paths:
            self._pending_paths.extend(new_paths)

        if self._pending_paths:
            self._try_trigger_scan()

    def _try_trigger_scan(self):
        from app.modules.library.services.scanner.service.status_coordinator import StatusCoordinator
        
        with StatusCoordinator.scan_status_lock:
            if StatusCoordinator.scan_status.get("active"):
                logger.info("Scan is currently active, deferring auto-scan for completed torrents.")
                return
        
        paths_to_scan = list(self._pending_paths)
        self._pending_paths.clear()
        
        # Trigger parallel/async scan
        threading.Thread(target=self._trigger_scan, args=(paths_to_scan,), daemon=True).start()

    def _trigger_scan(self, paths: List[str]):
        db = None
        try:
            from app.core.database import SessionLocal
            from app.modules.library.services.scanner_service import ScannerService
            
            db = SessionLocal()
            scanner = ScannerService.create(db)
            
            logger.info(f"Triggering auto-scan for completed torrent paths: {paths}")
            scanner.start_scan(paths=paths)
        except Exception as e:
            logger.error(f"Failed to run auto-scan for completed torrents: {e}", exc_info=True)
            # Restore paths to pending list so we can retry later
            self._pending_paths.extend(paths)
        finally:
            if db:
                db.close()
