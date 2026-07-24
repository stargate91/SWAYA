import fnmatch
import logging
import os
from pathlib import Path
from threading import Lock
import time
from typing import Optional

from app.core.constants import (
    MEDIA_IMAGE_SUBFOLDERS,
    MIN_CACHED_IMAGE_BYTES,
)
from app.core.enums import MediaSubfolder

logger = logging.getLogger(__name__)

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
    if subfolder == MediaSubfolder.SCENE_STILLS:
        base, _ = os.path.splitext(filename)
        filename = f"{base}.jpg"
    return image_root / "thumbnails" / subfolder / filename.lstrip("/")

_dir_cache = {}
_dir_cache_lock = Lock()

def get_dir_contents(dir_path: Path, ttl: float = 5.0) -> list[Path]:
    now = time.time()
    with _dir_cache_lock:
        if dir_path in _dir_cache:
            mtime, files = _dir_cache[dir_path]
            if now - mtime < ttl:
                return files
        try:
            files = [p for p in dir_path.iterdir() if p.is_file()]
        except Exception:
            files = []
        _dir_cache[dir_path] = (now, files)
        return files

def exists(path: str | Path) -> bool:
    """Checks if a file exists and is not corrupted/empty."""
    p = Path(path)
    return p.exists() and p.stat().st_size > MIN_CACHED_IMAGE_BYTES

def find_existing_file_by_stem(image_root: Path, folder_type: str, subfolder: str, filename: str) -> Optional[Path]:
    """
    Finds an existing cached file in original/subfolder or thumbnails/subfolder that shares
    the same filename stem (e.g. porndb_26d101c0-1e23-4e1f-ac12-8c30e0e2f451.*), regardless of extension,
    or matches files ending with _{stem}.* (e.g. tmdb_123_{stem}.jpg).
    """
    from urllib.parse import urlparse
    clean_fn = os.path.basename(urlparse(filename).path or filename)
    stem = Path(clean_fn).stem
    if not stem:
        return None
    dir_path = image_root / folder_type / subfolder
    if not dir_path.exists():
        return None
    for ext in ('.jpg', '.jpeg', '.webp', '.png', '.gif'):
        candidate = dir_path / f"{stem}{ext}"
        if exists(candidate):
            return candidate
    try:
        pattern = f"*_{stem.lower()}.*"
        for item in get_dir_contents(dir_path):
            if fnmatch.fnmatch(item.name.lower(), pattern):
                if exists(item):
                    return item
    except Exception as e:
        try:
            logger.debug(f"Swallowed exception: {e}", exc_info=True)
        except Exception:
            pass
        pass
    return None

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