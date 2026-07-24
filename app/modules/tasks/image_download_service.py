import logging
from typing import Optional


logger = logging.getLogger(__name__)

class ImageDownloadService:
    def __init__(self, download_worker=None):
        self._download_worker = download_worker

    @property
    def download_worker(self):
        if self._download_worker is not None:
            return self._download_worker
        # Lazy fallback for backward compatibility during transition
        from app.modules.tasks import task_manager
        return task_manager.download_worker if task_manager else None

    def enqueue_download(self, url: str, subfolder: str, filename: str, priority: int = 100) -> None:
        try:
            worker = self.download_worker
            if worker:
                worker.enqueue_download(url, subfolder, filename, priority)
            else:
                logger.warning("DownloadWorker not available for image download.")
        except Exception as e:
            logger.error(f"Failed to enqueue download via ImageDownloadService: {e}")

    def download_now(self, url: str, subfolder: str, filename: str) -> Optional[str]:
        try:
            worker = self.download_worker
            if worker:
                res = worker._do_download(url, subfolder, filename)
                if isinstance(res, str):
                    return res
                return filename if res else None
            else:
                logger.warning("DownloadWorker not available for immediate image download.")
        except Exception as e:
            logger.error(f"Failed to download immediately via ImageDownloadService: {e}")
        return None

    def get_download_url(self, path: str, subfolder: str) -> Optional[str]:
        try:
            worker = self.download_worker
            if worker and worker.image_service:
                return worker.image_service.get_download_url(path, subfolder)
        except Exception as e:
            logger.error(f"Failed to get download URL via ImageDownloadService: {e}")
        return None

    def queue_image(self, path: Optional[str], subfolder: str, prefix: str) -> Optional[str]:
        """
        Unified helper to build download URL, sanitize the filename with a prefix,
        determine file extension, and enqueue the image asset download.
        """
        if not path:
            return None

        url = self.get_download_url(path, subfolder)
        if not url:
            return None

        import os
        import re
        import requests
        from urllib.parse import urlparse

        basename = os.path.basename(urlparse(path).path)
        if not basename:
            return None

        ext = os.path.splitext(basename)[1].lower()
        if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}:
            try:
                resp = requests.head(url, timeout=3, allow_redirects=True)
                ct = resp.headers.get("Content-Type", "").lower()
                if "png" in ct:
                    ext = ".png"
                elif "webp" in ct:
                    ext = ".webp"
                elif "gif" in ct:
                    ext = ".gif"
                elif "svg" in ct:
                    ext = ".svg"
                else:
                    ext = ".jpg"
            except Exception:
                ext = ".jpg"
            basename = f"{basename}{ext}"

        safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", prefix).strip("_")
        filename = f"{safe_prefix}_{basename}"
        self.enqueue_download(url, subfolder, filename)
        return f"{subfolder}/{filename}"

