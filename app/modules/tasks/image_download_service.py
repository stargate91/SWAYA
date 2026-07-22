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
