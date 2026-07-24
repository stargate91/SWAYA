from typing import Optional
from PIL import Image

def resize_and_convert_image(
    img: Image.Image,
    max_width: Optional[int],
    max_height: Optional[int],
    target_format: str
) -> Image.Image:
    """Resizes the PIL image proportionally to fit the bounds and converts mode for JPEG compatibility."""
    width, height = img.size

    # Resize if needed
    if max_width and max_height:
        # Cap both bounds (like image_writer 4k limit)
        if width > max_width or height > max_height:
            if width >= height:
                new_width = max_width
                new_height = int(height * (float(max_width) / float(width)))
            else:
                new_height = max_height
                new_width = int(width * (float(max_height) / float(height)))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    else:
        if max_width and width > max_width:
            ratio = max_width / float(width)
            new_height = int(float(height) * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        elif max_height and height > max_height:
            ratio = max_height / float(height)
            new_width = int(float(width) * ratio)
            img = img.resize((new_width, max_height), Image.Resampling.LANCZOS)

    # Convert modes if saving as JPEG
    if target_format == "JPEG":
        if img.mode in ("RGBA", "LA", "P") or img.mode != "RGB":
            img = img.convert("RGB")

    return img

def queue_img_download(
    image_downloader,
    path: str,
    subfolder: str,
    prefix: str
) -> Optional[str]:
    """
    Unified helper to queue an image for background download if it doesn't already exist locally.
    """
    if not path or not image_downloader:
        return None
    if path.startswith("/media/"):
        return path

    import os
    from urllib.parse import urlparse
    from app.modules.media_assets.services.images import image_processing_service, image_path_resolver

    if path.startswith(("http://", "https://")):
        url = path
        raw_filename = os.path.basename(urlparse(path).path)
    else:
        url = image_downloader.get_download_url(path, subfolder) or f"https://image.tmdb.org/t/p/original{path}"
        raw_filename = os.path.basename(path)

    if not raw_filename:
        return None

    clean_filename = f"{prefix}_{raw_filename}"
    existing = image_path_resolver.find_existing_file_by_stem(
        image_processing_service.image_root, "original", subfolder, clean_filename
    ) or image_path_resolver.find_existing_file_by_stem(
        image_processing_service.image_root, "thumbnails", subfolder, clean_filename
    )
    if not existing:
        image_downloader.enqueue_download(url, subfolder, clean_filename)
    return f"{subfolder}/{clean_filename}"


def queue_tmdb_media_assets(
    image_downloader,
    tmdb_id: int,
    tmdb_data: dict,
    effective_poster: Optional[str] = None,
    effective_backdrop: Optional[str] = None,
    effective_logo: Optional[str] = None,
    is_tv_show: bool = False
) -> None:
    """Consolidated helper to enqueue TMDB media assets for background downloading."""
    if not image_downloader or not tmdb_data:
        return

    # 1. Poster
    poster_path = effective_poster or tmdb_data.get("poster_path")
    if poster_path:
        queue_img_download(image_downloader, poster_path, "posters", f"tmdb_{tmdb_id}")

    # 2. Backdrop
    b_path = effective_backdrop or tmdb_data.get("backdrop_path")
    if b_path:
        queue_img_download(image_downloader, b_path, "backdrops", f"tmdb_{tmdb_id}")

    # 3. Logo
    l_path = effective_logo or tmdb_data.get("logo_path")
    if l_path:
        queue_img_download(image_downloader, l_path, "logos", f"tmdb_{tmdb_id}")

    # 4. Cast & Crew Profiles
    credits = tmdb_data.get("aggregate_credits") or tmdb_data.get("credits") or {}
    all_people = (credits.get("cast") or []) + (credits.get("crew") or [])
    for person in all_people:
        p_profile = person.get("profile_path")
        p_id = person.get("id")
        if p_profile and p_id:
            queue_img_download(image_downloader, p_profile, "people", f"tmdb_{p_id}")

    # 5. Season Posters (TV Show only)
    if is_tv_show:
        for season in tmdb_data.get("seasons", []) or []:
            s_poster = season.get("poster_path")
            s_num = season.get("season_number")
            if s_poster and s_num is not None:
                queue_img_download(image_downloader, s_poster, "posters", f"tmdb_tv_{tmdb_id}_season_{s_num}")
