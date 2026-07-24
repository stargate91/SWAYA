import re
import unicodedata

def slugify_name(name: str) -> str:
    """
    Cleans and slugifies a name to be URL-friendly by applying
    lowercase conversion, NFD normalization (removing diacritics),
    and regex replacement.
    """
    if not name:
        return ""
    clean_name = name.lower().strip()
    clean_name = "".join(c for c in unicodedata.normalize('NFD', clean_name) if unicodedata.category(c) != 'Mn')
    clean_name = re.sub(r'[^a-z0-9\s-]', '', clean_name)
    clean_name = re.sub(r'[\s-]+', '-', clean_name)
    return clean_name


def extract_youtube_trailer_key(videos: list) -> str | None:
    """
    Extracts the YouTube trailer key from a list of video dictionaries.
    Prioritizes videos that are explicitly marked as trailers.
    """
    if not videos:
        return None
    youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key")]
    if not youtube_trailers:
        youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
    if youtube_trailers:
        return youtube_trailers[0].get("key")
    return None
