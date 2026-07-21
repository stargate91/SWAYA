import logging
from datetime import datetime
from typing import Optional, Any, Dict, List, Tuple
from sqlalchemy.orm import Session

from app.modules.metadata.models import MetadataLocalization, MetadataMatch
from app.core.enums import Provider, MediaType
from app.core.genre_utils import split_genres as _split_genres

logger = logging.getLogger(__name__)

class TvShowMetadataResolver:
    def sync_metadata_match_and_localization(
        self,
        db: Session,
        tv_tmdb_id_int: int,
        tmdb_data: Dict[str, Any],
        effective_backdrop: Optional[str],
        ui_lang: str,
        omdb_scraper: Optional[Any]
    ) -> Tuple[Optional[MetadataMatch], Optional[MetadataLocalization]]:
        """Ensures MetadataMatch exists, fetches OMDB ratings, updates fields, and aligns language localization."""
        series_match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.media_type == MediaType.TV
        ).first()

        imdb_id = tmdb_data.get("external_ids", {}).get("imdb_id")
        loc_db = None

        if series_match:
            db_updated = False
            if imdb_id and not series_match.imdb_id:
                series_match.imdb_id = imdb_id
                db_updated = True
            if series_match.imdb_id and not series_match.rating_imdb and omdb_scraper:
                try:
                    omdb_data = omdb_scraper.fetch_omdb(series_match.imdb_id)
                    if omdb_data:
                        omdb_scraper.update_omdb_ratings(series_match, omdb_data)
                        db_updated = True
                except Exception as e:
                    logger.error(f"Failed to fetch OMDB ratings for tv show {series_match.imdb_id}: {e}")
            if not series_match.backdrop_path and effective_backdrop:
                series_match.backdrop_path = effective_backdrop
                db_updated = True
            
            first_air_date = tmdb_data.get("first_air_date")
            if not series_match.release_date and first_air_date:
                try:
                    series_match.release_date = datetime.strptime(first_air_date, "%Y-%m-%d")
                    db_updated = True
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            if not series_match.rating_tmdb and tmdb_data.get("vote_average"):
                try:
                    series_match.rating_tmdb = float(tmdb_data.get("vote_average"))
                    db_updated = True
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            if not series_match.vote_count_tmdb and tmdb_data.get("vote_count"):
                try:
                    series_match.vote_count_tmdb = int(tmdb_data.get("vote_count"))
                    db_updated = True
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            if series_match.is_adult != tmdb_data.get("adult", False):
                series_match.is_adult = tmdb_data.get("adult", False)
                db_updated = True
            
            loc_db = next((x for x in series_match.localizations if x.locale == ui_lang), None)
            genres_list = _split_genres([g["name"] for g in tmdb_data.get("genres", [])]) if tmdb_data.get("genres") else []
            from app.modules.media_assets.services.images import image_processing_service
            poster_path = image_processing_service.pick_poster_path(tmdb_data, preferred_language=ui_lang) or tmdb_data.get("poster_path")
            logo_path = tmdb_data.get("logo_path") or image_processing_service.pick_logo_path(tmdb_data, preferred_language=ui_lang)
            if not loc_db:
                loc_db = MetadataLocalization(
                    match_id=series_match.id,
                    locale=ui_lang,
                    title=tmdb_data.get("name") or tmdb_data.get("original_name") or "Unknown TV Show",
                    overview=tmdb_data.get("overview"),
                    poster_path=poster_path,
                    logo_path=logo_path,
                    tagline=tmdb_data.get("tagline"),
                    genres=genres_list
                )
                db.add(loc_db)
                db_updated = True
            else:
                if not loc_db.title and (tmdb_data.get("name") or tmdb_data.get("original_name")):
                    loc_db.title = tmdb_data.get("name") or tmdb_data.get("original_name")
                    db_updated = True
                if not loc_db.overview and tmdb_data.get("overview"):
                    loc_db.overview = tmdb_data.get("overview")
                    db_updated = True
                if poster_path and loc_db.poster_path != poster_path:
                    loc_db.poster_path = poster_path
                    loc_db.local_poster_path = None
                    db_updated = True
                if logo_path and not loc_db.logo_path:
                    loc_db.logo_path = logo_path
                    db_updated = True
                if not loc_db.tagline and tmdb_data.get("tagline"):
                    loc_db.tagline = tmdb_data.get("tagline")
                    db_updated = True
                if not loc_db.genres and genres_list:
                    loc_db.genres = genres_list
                    db_updated = True
            
            if db_updated:
                db.commit()

        return series_match, loc_db

    def extract_keywords_and_trailers(self, tmdb_data: Dict[str, Any]) -> Tuple[List[str], Optional[str]]:
        """Parses video lists for YouTube trailer keys and formats keyword tags."""
        keywords_list = []
        if tmdb_data.get("keywords"):
            raw_kws = tmdb_data.get("keywords", {})
            if isinstance(raw_kws, dict):
                keywords_list = [k["name"] for k in raw_kws.get("results", []) if isinstance(k, dict) and "name" in k]

        videos = (tmdb_data.get("videos") or {}).get("results") or []
        trailer_key = None
        youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key")]
        if not youtube_trailers:
            youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
        if youtube_trailers:
            trailer_key = youtube_trailers[0].get("key")

        return keywords_list, trailer_key
