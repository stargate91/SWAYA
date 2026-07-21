import os
from typing import Optional
from app.shared_kernel.constants import (
    TMDB_IMAGE_BASE,
    TMDB_DOWNLOAD_SIZES,
    MEDIA_IMAGE_SUBFOLDERS,
)
from app.domains.media_assets.services.images import image_path_resolver, image_thumbnailer

def resolve_image_url(
    path: Optional[str],
    subfolder: str,
    image_root,
    size: Optional[str] = None
) -> Optional[str]:
    """
    Resolves the image path/URL for the frontend.
    1. If it's a remote URL (HTTP/HTTPS), returns it directly.
    2. If the local thumbnail exists, returns its relative path for frontend serving.
    3. If it is a relative TMDB path (starts with /), falls back to the TMDB CDN.
    """
    if not path:
        return None

    if path.startswith(("/media/", "/api/")):
        return path

    # 2. Local check
    from urllib.parse import urlparse
    parsed_path = urlparse(path).path or path
    normalized_path = parsed_path.replace("\\", "/").lstrip("/")
    path_parts = [part for part in normalized_path.split("/") if part]
    filename = path_parts[-1] if path_parts else os.path.basename(path)

    embedded_subfolder = subfolder
    if len(path_parts) >= 2 and path_parts[0] in MEDIA_IMAGE_SUBFOLDERS:
        embedded_subfolder = path_parts[0]

    if embedded_subfolder == "logos":
        size = "original"
    elif size is None:
        if embedded_subfolder in ("backdrops", "scene_stills"):
            size = "original"
        else:
            size = "w500"

    # 1. Local disk check FIRST
    if size == "original":
        orig_path = image_path_resolver.get_original_path(image_root, embedded_subfolder, filename)
        if image_path_resolver.exists(orig_path):
            return f"/media/images/original/{embedded_subfolder}/{filename}"
        existing_orig = image_path_resolver.find_existing_file_by_stem(image_root, "original", embedded_subfolder, filename)
        if existing_orig:
            return f"/media/images/original/{embedded_subfolder}/{existing_orig.name}"

    thumb_subfolder = embedded_subfolder if embedded_subfolder in MEDIA_IMAGE_SUBFOLDERS else subfolder
    thumb_path = image_path_resolver.get_thumbnail_path(image_root, thumb_subfolder, filename)
    if image_path_resolver.exists(thumb_path):
        return f"/media/images/thumbnails/{thumb_subfolder}/{thumb_path.name}"
    existing_thumb = image_path_resolver.find_existing_file_by_stem(image_root, "thumbnails", thumb_subfolder, filename)
    if existing_thumb:
        return f"/media/images/thumbnails/{thumb_subfolder}/{existing_thumb.name}"

    if thumb_subfolder == "scene_stills":
        source_orig_path = image_path_resolver.get_original_path(image_root, "scene_stills", filename) or image_path_resolver.find_existing_file_by_stem(image_root, "original", "scene_stills", filename)
        if source_orig_path and image_path_resolver.exists(source_orig_path):
            image_thumbnailer.generate_thumbnail(source_orig_path, thumb_path, "scene_stills")
            if image_path_resolver.exists(thumb_path):
                return f"/media/images/thumbnails/scene_stills/{thumb_path.name}"

    orig_path = image_path_resolver.get_original_path(image_root, embedded_subfolder, filename)
    if image_path_resolver.exists(orig_path):
        return f"/media/images/original/{embedded_subfolder}/{filename}"
    existing_orig = image_path_resolver.find_existing_file_by_stem(image_root, "original", embedded_subfolder, filename)
    if existing_orig:
        return f"/media/images/original/{embedded_subfolder}/{existing_orig.name}"

    # 2. Remote URL fallback (Only reached if not cached locally on disk)
    if path.startswith(("http://", "https://")):
        # PornDB CDN image sizing
        if "cdn.theporndb.net" in path and "/background/" in path and "/background/c/" not in path:
            if size != "original":
                suffix = "medium"
                if size in ("w154", "w185", "w300", "personThumb", "posterThumb", "backdropThumb"):
                    suffix = "small"
                
                parts = path.split("/background/")
                if len(parts) == 2:
                    filename = parts[1]
                    name, ext = os.path.splitext(filename)
                    path = f"{parts[0]}/background/c/{name}-{suffix}{ext}"

        # Auto-proxy hotlink-protected CDNs
        hotlinked_hosts = ["mjedge.net", "gtflixtv.com", "pbnetcdn.com", "mjedge.com", "atkingdom-network.com", "sexlikereal.com"]
        if any(host in path for host in hotlinked_hosts):
            from urllib.parse import quote
            return f"/api/v1/media/image-proxy?url={quote(path, safe='')}"

        if "image.tmdb.org/t/p/" in path:
            parts = path.split("/t/p/")
            if len(parts) == 2:
                subparts = parts[1].split("/", 1)
                if len(subparts) == 2:
                    return f"{parts[0]}/t/p/{size}/{subparts[1]}"
        return path

    # 3. TMDB CDN fallback
    if path.startswith("/") and not path.startswith("/media/"):
        return f"{TMDB_IMAGE_BASE}{size}{path}"

    return None

def get_download_url(path: Optional[str], subfolder: str) -> Optional[str]:
    """
    Builds the download URL for an asset.
    - If it's a remote URL, returns it directly (rewriting TMDB URLs to the configured download size).
    - If it's a relative TMDB path (starts with /), prepends the base URL and the configured download size.
    """
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        if "image.tmdb.org/t/p/" in path:
            parts = path.split("/t/p/")
            if len(parts) == 2:
                subparts = parts[1].split("/", 1)
                if len(subparts) == 2:
                    size = TMDB_DOWNLOAD_SIZES.get(subfolder, "original")
                    return f"{parts[0]}/t/p/{size}/{subparts[1]}"
        return path
    if path.startswith("/"):
        size = TMDB_DOWNLOAD_SIZES.get(subfolder, "original")
        return f"{TMDB_IMAGE_BASE}{size}{path}"
    return None
