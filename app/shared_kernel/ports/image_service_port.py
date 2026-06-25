from typing import Protocol, Optional, Any, Iterable, BinaryIO

class ImageServicePort(Protocol):
    def ensure_folders(self) -> None:
        """Ensures that all required media/image directories exist."""
        ...

    def get_original_path(self, subfolder: str, filename: str) -> Any:
        """Gets absolute file system path for the original image."""
        ...

    def get_thumbnail_path(self, subfolder: str, filename: str) -> Any:
        """Gets absolute file system path for the thumbnail image."""
        ...

    def write_upload(self, target_path: Any, source: BinaryIO) -> Optional[str]:
        """Saves a binary file stream to the file system."""
        ...

    def generate_thumbnail(self, original_path: Any, thumbnail_path: Any, subfolder: str) -> bool:
        """Generates a scaled thumbnail for the original image."""
        ...

    def resolve_image_url(self, path: Optional[str], subfolder: str, size: Optional[str] = None) -> Optional[str]:
        """Resolves database file path to public HTTP URL or fallback."""
        ...

    def pick_logo_path(self, raw_data: dict, preferred_language: Optional[str] = None) -> Optional[str]:
        ...

    def pick_poster_path(self, raw_data: dict, preferred_language: Optional[str] = None) -> Optional[str]:
        ...

    def pick_backdrop_path(self, raw_data: dict, preferred_language: Optional[str] = None, allow_low_res: bool = False) -> Optional[str]:
        ...

    def get_download_url(self, path: Optional[str], subfolder: str) -> Optional[str]:
        ...
