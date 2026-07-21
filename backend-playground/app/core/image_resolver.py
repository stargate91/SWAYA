from typing import Optional

TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/"

def resolve_image_url(
    raw_source: Optional[str],
    default_placeholder: str = "/static/placeholders/poster.svg",
    size: str = "w500"
) -> str:
    """
    Single unified entrypoint for image URL resolution across Swaya.
    - If None: Returns default placeholder URL.
    - If TMDB relative path (starts with '/'): Prepends TMDB base URL + requested size (w185, w500, w780, original).
    - If remote URL (http:// or https://): Returns direct URL.
    - If local cached relative path: Returns static endpoint (/static/images/...).
    """
    if not raw_source:
        return default_placeholder

    # Full HTTP(S) URL (StashDB, PornDB, Fanart.tv, etc.)
    if raw_source.startswith(("http://", "https://")):
        return raw_source

    # TMDB relative image path (e.g. "/p6972abc.jpg")
    if raw_source.startswith("/") and not raw_source.startswith("/static/"):
        clean_tmdb_path = raw_source.lstrip("/")
        return f"{TMDB_IMAGE_BASE_URL}{size}/{clean_tmdb_path}"

    # Local relative cached path (e.g. "posters/abc.jpg") -> convert to static served HTTP URL
    clean_path = raw_source.replace("\\", "/").lstrip("/")
    return f"/static/images/{clean_path}"
