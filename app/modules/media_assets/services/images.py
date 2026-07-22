import logging
from pathlib import Path
from typing import BinaryIO, Iterable, Optional
import requests

from app.modules.media_assets.services import image_selectors
from app.modules.media_assets.services.images import (
    image_path_resolver,
    image_writer,
    image_thumbnailer,
    image_url_resolver,
)


logger = logging.getLogger(__name__)


class ImageProcessingService:
    """
    Handles file operations, formatting, verification, and downscaling
    for downloaded media assets (covers, posters, backdrops, logos).
    """

    def __init__(self, image_root: Optional[str | Path] = None):
        """
        Resolves the image storage root.
        Defaults to the portable local 'data/media/images' directory in the application root.
        """
        if image_root:
            self.image_root = Path(image_root)
        else:
            self.image_root = Path(__file__).resolve().parents[4] / "data" / "media" / "images"
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

    def ensure_folders(self) -> None:
        """Ensures all subdirectories exist for original assets and thumbnails."""
        image_path_resolver.ensure_folders(self.image_root)

    def get_original_path(self, subfolder: str, filename: str) -> Path:
        """Returns target path for original resolution image."""
        return image_path_resolver.get_original_path(self.image_root, subfolder, filename)

    def get_thumbnail_path(self, subfolder: str, filename: str) -> Path:
        """Returns target path for the thumbnail image."""
        return image_path_resolver.get_thumbnail_path(self.image_root, subfolder, filename)

    def exists(self, path: str | Path) -> bool:
        """Checks if a file exists and is not corrupted/empty."""
        return image_path_resolver.exists(path)

    def write_chunks(self, target_path: str | Path, chunks: Iterable[bytes], url: Optional[str] = None) -> Optional[str]:
        """Writes network chunk stream to a file safely via a temp file."""
        return image_writer.write_chunks(target_path, chunks, url)

    def write_upload(self, target_path: str | Path, source: BinaryIO) -> Optional[str]:
        """Writes uploaded image stream to a file safely via a temp file."""
        return image_writer.write_upload(target_path, source)

    def generate_thumbnail(self, original_path: str | Path, thumbnail_path: str | Path, subfolder: str) -> bool:
        """Loads an original image, resizes it keeping aspect ratio and saves it."""
        return image_thumbnailer.generate_thumbnail(original_path, thumbnail_path, subfolder)

    def resolve_image_url(self, path: Optional[str], subfolder: str, size: Optional[str] = None) -> Optional[str]:
        """Resolves the image path/URL for the frontend."""
        return image_url_resolver.resolve_image_url(path, subfolder, self.image_root, size)

    def pick_logo_path(self, raw_data: dict, preferred_language: Optional[str] = None) -> Optional[str]:
        """Analyzes and selects the best logo from TMDB metadata images."""
        return image_selectors.pick_logo_path(
            raw_data=raw_data,
            image_root=self.image_root,
            session=self.session,
            preferred_language=preferred_language
        )

    def pick_poster_path(self, raw_data: dict, preferred_language: Optional[str] = None) -> Optional[str]:
        """Analyzes and selects the best poster from TMDB metadata images."""
        return image_selectors.pick_poster_path(
            raw_data=raw_data,
            preferred_language=preferred_language
        )

    def backdrop_resolution_from_raw(self, raw_data: Optional[dict], backdrop_path: Optional[str]) -> int:
        return image_selectors.backdrop_resolution_from_raw(raw_data, backdrop_path)

    def pick_backdrop_path(
        self,
        raw_data: dict,
        preferred_language: Optional[str] = None,
        min_width: int = 1920,
        allow_low_res: bool = True
    ) -> Optional[str]:
        """Analyzes and selects the best backdrop from TMDB metadata images."""
        return image_selectors.pick_backdrop_path(
            raw_data=raw_data,
            image_root=self.image_root,
            session=self.session,
            preferred_language=preferred_language,
            min_width=min_width,
            allow_low_res=allow_low_res
        )

    def get_download_url(self, path: Optional[str], subfolder: str) -> Optional[str]:
        """Builds the download URL for an asset."""
        return image_url_resolver.get_download_url(path, subfolder)

    def get_db_relative_paths(self, filename: str, subfolder: str) -> tuple[str, str]:
        """Returns relative paths for storing in the database."""
        return image_path_resolver.get_db_relative_paths(filename, subfolder)

    def proxy_image(self, url: str, blur: bool = False, width: Optional[int] = None) -> tuple[str, str]:
        """
        Downloads a remote image, processes it (resize, blur), caches it,
        and returns a tuple of (local_cache_path, mime_type).
        """
        import hashlib
        import os
        import urllib3
        import io
        from PIL import Image, ImageFilter, ImageEnhance
        from urllib.parse import urlparse
        
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        if url.startswith("//"):
            url = "https:" + url
            
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError("Invalid URL")
            
        cache_dir = self.image_root / "cache" / "proxy"
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
        cache_key = f"{url_hash}_b_{blur}_w_{width or 'orig'}"
        cache_path = cache_dir / cache_key
        
        ext_type = "image/jpeg"
        if "png" in url.lower():
            ext_type = "image/png"
        elif "webp" in url.lower():
            ext_type = "image/webp"
            
        if cache_path.exists():
            return str(cache_path), ext_type
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": f"{parsed.scheme}://{parsed.netloc}/"
        }
        response = self.session.get(url, headers=headers, stream=True, timeout=5.0, verify=False)
        response.raise_for_status()
        
        content_type = response.headers.get("Content-Type", ext_type)
        
        if blur or width:
            img = Image.open(io.BytesIO(response.content))
            
            if width and img.width > width:
                aspect = img.height / img.width
                new_height = int(width * aspect)
                img = img.resize((width, new_height), Image.Resampling.LANCZOS)
                
            if blur:
                img = img.filter(ImageFilter.GaussianBlur(32))
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(0.20)
                
            out_io = io.BytesIO()
            fmt = "JPEG"
            if "png" in content_type.lower():
                fmt = "PNG"
            elif "webp" in content_type.lower():
                fmt = "WEBP"
            img.save(out_io, format=fmt)
            
            with open(cache_path, "wb") as cache_file:
                cache_file.write(out_io.getvalue())
                
            return str(cache_path), content_type
            
        raw_data = response.content
        with open(cache_path, "wb") as cache_file:
            cache_file.write(raw_data)
            
        return str(cache_path), content_type


image_processing_service = ImageProcessingService()
