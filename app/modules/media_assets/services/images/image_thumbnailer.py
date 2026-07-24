import uuid
import shutil
import logging
from pathlib import Path
from PIL import Image

from app.core.constants import MEDIA_THUMBNAIL_LIMITS
from app.modules.media_assets.services.images import image_path_resolver

logger = logging.getLogger(__name__)

def generate_thumbnail(original_path: str | Path, thumbnail_path: str | Path, subfolder: str) -> bool:
    """
    Loads an original image, resizes it keeping aspect ratio according to
    configured subfolder limits, and saves it in its original format.
    If the image is already within bounds, skips processing and copies it directly.
    """
    orig = Path(original_path)
    thumb = Path(thumbnail_path)
    
    if not image_path_resolver.exists(orig):
        logger.warning(f"Cannot generate thumbnail: original file {orig} does not exist.")
        return False

    # Exclude SVGs from processing
    if orig.suffix.lower() == ".svg":
        thumb.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(orig, thumb)
        return True

    limits = MEDIA_THUMBNAIL_LIMITS.get(subfolder)
    if not limits:
        # Do not generate/copy thumbnails for subfolders that don't need them
        return False

    thumb_temp = thumb.with_name(f"{thumb.name}.{uuid.uuid4().hex}.tmp")
    thumb.parent.mkdir(parents=True, exist_ok=True)

    try:
        def use_adult_scene_poster_height_limit(filename: str, width: int, height: int) -> bool:
            return False

        # 1. Quick size check to avoid decoding/processing if already small
        with Image.open(orig) as img:
            width, height = img.size

            max_width = limits.get("max_width")
            max_height = limits.get("max_height")
            if use_adult_scene_poster_height_limit(orig.name, width, height):
                max_width = None
                max_height = 780

            already_in_bounds = True
            if max_width and width > max_width:
                already_in_bounds = False
            if max_height and height > max_height:
                already_in_bounds = False

        if already_in_bounds and subfolder != "scene_stills":
            # Already in bounds, copy original to thumbnail path
            shutil.copy2(orig, thumb)
            return True

        # 2. Resize if bounds exceeded
        with Image.open(orig) as img:
            orig_format = img.format or ("PNG" if orig.suffix.lower() == ".png" else "JPEG")
            if subfolder == "scene_stills":
                orig_format = "JPEG"
            width, height = img.size
            if use_adult_scene_poster_height_limit(orig.name, width, height):
                max_width = None
                max_height = 780
            
            from app.modules.media_assets.services.images.image_helpers import resize_and_convert_image
            img = resize_and_convert_image(img, max_width, max_height, orig_format)

            # Save using original format with default settings
            img.save(thumb_temp, orig_format)
        
        if thumb.exists():
            thumb.unlink()
        thumb_temp.replace(thumb)
        return True
    except Exception as e:
        logger.error(f"Failed to generate thumbnail for {orig} in {subfolder}: {e}")
        if thumb_temp.exists():
            thumb_temp.unlink()
        return False
