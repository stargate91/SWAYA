import uuid
import shutil
import logging
from pathlib import Path
from typing import BinaryIO, Iterable, Optional
from PIL import Image

from app.core.constants import MIN_CACHED_IMAGE_BYTES

logger = logging.getLogger(__name__)

def write_chunks(target_path: str | Path, chunks: Iterable[bytes], url: Optional[str] = None) -> Optional[str]:
    """Writes network chunk stream to a file safely via a temp file."""
    target = Path(target_path)
    temp_path = target.with_name(f"{target.name}.{uuid.uuid4().hex}.tmp")
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(temp_path, "wb") as f:
            for chunk in chunks:
                if chunk:
                    f.write(chunk)
        return finalize_file(temp_path, target, url=url)
    finally:
        if temp_path.exists():
            temp_path.unlink()

def write_upload(target_path: str | Path, source: BinaryIO) -> Optional[str]:
    """Writes uploaded image stream to a file safely via a temp file."""
    target = Path(target_path)
    temp_path = target.with_name(f"{target.name}.{uuid.uuid4().hex}.tmp")
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(source, f)
        return finalize_file(temp_path, target)
    finally:
        if temp_path.exists():
            temp_path.unlink()

def finalize_file(temp_path: Path, target_path: Path, url: Optional[str] = None) -> Optional[str]:
    """Verifies integrity and moves file to target path."""
    if not temp_path.exists() or temp_path.stat().st_size < MIN_CACHED_IMAGE_BYTES:
        return None

    # Check for SVG
    is_svg = False
    try:
        with open(temp_path, "rb") as f:
            header = f.read(4096).strip().lower()
            if header.startswith(b"<svg") or header.startswith(b"<?xml") or b"<svg" in header:
                is_svg = True
    except Exception as e:
        logger.debug(f"Swallowed exception in finalize_file: {e}", exc_info=True)

    # Verify image integrity via PIL (unless SVG) and cap at 4K for scene_stills/backdrops
    if not is_svg:
        try:
            need_save = False
            with Image.open(temp_path) as img:
                img.verify()
            
            # Open again to process/resize if needed
            with Image.open(temp_path) as img:
                img_format = img.format or "JPEG"
                if "scene_stills" in target_path.parts or "backdrops" in target_path.parts:
                    width, height = img.size
                    if width > 3840 or height > 3840:
                        if width >= height:
                            new_width = 3840
                            new_height = int(height * (3840.0 / float(width)))
                        else:
                            new_height = 3840
                            new_width = int(width * (3840.0 / float(height)))
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                        need_save = True

                if need_save:
                    if img_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
                        img = img.convert("RGB")
                    elif img_format == "JPEG" and img.mode != "RGB":
                        img = img.convert("RGB")
                    img.save(temp_path, img_format)
        except Exception as e:
            logger.error(f"Image verification/processing failed: {e}")
            return None

    if is_svg and not target_path.name.lower().endswith(".svg"):
        target_path = target_path.with_suffix(".svg")

    if target_path.exists():
        target_path.unlink()
    target_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path.replace(target_path)
    return str(target_path)
