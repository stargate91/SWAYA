import logging
from typing import Optional
from app.shared_kernel.ports.image_download_port import ImageDownloadPort

logger = logging.getLogger(__name__)

class TasksImageDownloadAdapter(ImageDownloadPort):
    def __init__(self, download_worker=None):
        self._download_worker = download_worker

    @property
    def download_worker(self):
        if self._download_worker is not None:
            return self._download_worker
        # Lazy fallback for backward compatibility during transition
        from app.domains.tasks import task_manager
        return task_manager.download_worker if task_manager else None

    def enqueue_download(self, url: str, subfolder: str, filename: str, priority: int = 100) -> None:
        try:
            worker = self.download_worker
            if worker:
                worker.enqueue_download(url, subfolder, filename, priority)
            else:
                logger.warning("DownloadWorker not available for image download.")
        except Exception as e:
            logger.error(f"Failed to enqueue download via TasksImageDownloadAdapter: {e}")

    def download_now(self, url: str, subfolder: str, filename: str) -> bool:
        try:
            worker = self.download_worker
            if worker:
                return worker._do_download(url, subfolder, filename)
            else:
                logger.warning("DownloadWorker not available for immediate image download.")
        except Exception as e:
            logger.error(f"Failed to download immediately via TasksImageDownloadAdapter: {e}")
        return False

    def get_download_url(self, path: str, subfolder: str) -> Optional[str]:
        try:
            worker = self.download_worker
            if worker and worker.image_service:
                return worker.image_service.get_download_url(path, subfolder)
        except Exception as e:
            logger.error(f"Failed to get download URL via TasksImageDownloadAdapter: {e}")
        return None
