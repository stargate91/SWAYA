from typing import Protocol, Optional

class ImageDownloadPort(Protocol):
    def enqueue_download(self, url: str, subfolder: str, filename: str, priority: int = 100) -> None:
        """Enqueues a remote image to be downloaded asynchronously."""
        ...

    def download_now(self, url: str, subfolder: str, filename: str) -> bool:
        """Downloads a remote image synchronously/immediately."""
        ...

    def get_download_url(self, path: str, subfolder: str) -> Optional[str]:
        """Resolves the full download URL for a given image path and subfolder."""
        ...
