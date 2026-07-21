import logging
from typing import Any, Tuple, List, Optional
from sqlalchemy.orm import Session
from app.core.enums import Provider

logger = logging.getLogger(__name__)

class LocalMetadataResolver:
    def resolve_keywords_and_trailer(
        self,
        db: Session,
        active_match: Any,
        loc: Any,
        scrapers: Any,
        ui_lang: str
    ) -> Tuple[List[str], Optional[str]]:
        """Resolves keywords list and YouTube trailer key using raw metadata and fallback scrapers."""
        keywords_list = []
        if active_match and active_match.raw_metadata:
            raw_kws = active_match.raw_metadata.get("keywords", {})
            if isinstance(raw_kws, dict):
                keywords_list = [k["name"] for k in raw_kws.get("keywords", []) if isinstance(k, dict) and "name" in k]
        
        tmdb_scraper = scrapers.tmdb(db)
        if not keywords_list and active_match and active_match.provider == Provider.TMDB and active_match.external_id:
            try:
                tmdb_id_int = int(active_match.external_id)
                tmdb_data = tmdb_scraper.get_details(tmdb_id_int, "movie", language=ui_lang)
                if tmdb_data and tmdb_data.get("keywords"):
                    keywords_list = [k["name"] for k in tmdb_data.get("keywords", {}).get("keywords", [])]
                    active_match.suggested_tags = keywords_list
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to fetch live keywords fallback: {e}")

        # Extract trailer key
        trailer_key = None
        if loc and loc.trailer_url:
            url_str = loc.trailer_url
            if "watch?v=" in url_str:
                trailer_key = url_str.split("watch?v=")[1].split("&")[0]
            elif "youtu.be/" in url_str:
                trailer_key = url_str.split("youtu.be/")[1].split("?")[0]
        
        if not trailer_key and active_match and active_match.raw_metadata:
            raw_videos = active_match.raw_metadata.get("videos", {}).get("results", [])
            youtube_trailers = [v for v in raw_videos if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key")]
            if not youtube_trailers:
                youtube_trailers = [v for v in raw_videos if v.get("site") == "YouTube" and v.get("key")]
            if youtube_trailers:
                trailer_key = youtube_trailers[0].get("key")

        if not trailer_key and active_match and active_match.provider == Provider.TMDB and active_match.external_id:
            try:
                tmdb_id_int = int(active_match.external_id)
                tmdb_data = tmdb_scraper.get_details(tmdb_id_int, "movie", language=ui_lang)
                if tmdb_data:
                    videos = (tmdb_data.get("videos") or {}).get("results") or []
                    youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key")]
                    if not youtube_trailers:
                        youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
                    if youtube_trailers:
                        trailer_key = youtube_trailers[0].get("key")
            except Exception as e:
                logger.error(f"Failed to fetch live trailer fallback: {e}")

        return keywords_list, trailer_key
