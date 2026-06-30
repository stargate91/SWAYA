import os
from pathlib import Path
from app.shared_kernel.constants import (
    MEDIA_IMAGE_SUBFOLDERS,
    MIN_CACHED_IMAGE_BYTES,
)

def ensure_folders(image_root: Path) -> None:
    """Ensures all subdirectories exist for original assets and thumbnails."""
    for subfolder in MEDIA_IMAGE_SUBFOLDERS:
        (image_root / "original" / subfolder).mkdir(parents=True, exist_ok=True)
        (image_root / "thumbnails" / subfolder).mkdir(parents=True, exist_ok=True)

def get_original_path(image_root: Path, subfolder: str, filename: str) -> Path:
    """Returns target path for original resolution image."""
    return image_root / "original" / subfolder / filename.lstrip("/")

def get_thumbnail_path(image_root: Path, subfolder: str, filename: str) -> Path:
    """Returns target path for the thumbnail image (keeping original extension, except for scene_stills which forces .jpg)."""
    if subfolder == "scene_stills":
        base, _ = os.path.splitext(filename)
        filename = f"{base}.jpg"
    return image_root / "thumbnails" / subfolder / filename.lstrip("/")

def exists(path: str | Path) -> bool:
    """Checks if a file exists and is not corrupted/empty."""
    p = Path(path)
    return p.exists() and p.stat().st_size > MIN_CACHED_IMAGE_BYTES

def get_db_relative_paths(filename: str, subfolder: str) -> tuple[str, str]:
    """
    Returns relative paths for storing in the database.
    Format:
      Original: media/images/original/{subfolder}/{filename}
      Thumbnail: media/images/thumbnails/{subfolder}/{filename}
    """
    clean_filename = os.path.basename(filename)
    orig_rel = f"media/images/original/{subfolder}/{clean_filename}"
    thumb_rel = f"media/images/thumbnails/{subfolder}/{clean_filename}"
    return orig_rel, thumb_rel
