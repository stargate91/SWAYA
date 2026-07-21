import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.modules.metadata.models import MetadataMatch, MetadataLocalization
from app.core.genre_utils import split_genres as _split_genres

logger = logging.getLogger(__name__)

class MovieDbSyncer:
    def sync_db_metadata(
        self,
        db: Session,
        match: MetadataMatch,
        tmdb_data: Dict[str, Any],
        release_date: str,
        effective_backdrop: str,
        ui_lang: str,
        scrapers: Any
    ) -> None:
        db_updated = False
        imdb_id = tmdb_data.get("imdb_id")
        if imdb_id and not match.imdb_id:
            match.imdb_id = imdb_id
            db_updated = True
        if match.imdb_id and not match.rating_imdb:
            try:
                omdb_data = scrapers.omdb.fetch_omdb(match.imdb_id)
                if omdb_data:
                    scrapers.omdb.update_omdb_ratings(match, omdb_data)
                    db_updated = True
            except Exception as e:
                logger.error(f"Failed to fetch OMDB ratings for {match.imdb_id}: {e}")
        if not match.backdrop_path and effective_backdrop:
            match.backdrop_path = effective_backdrop
            db_updated = True
        if not match.release_date and release_date:
            from datetime import datetime
            try:
                match.release_date = datetime.strptime(release_date, "%Y-%m-%d")
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        if not match.rating_tmdb and tmdb_data.get("vote_average"):
            try:
                match.rating_tmdb = float(tmdb_data.get("vote_average"))
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        if not match.vote_count_tmdb and tmdb_data.get("vote_count"):
            try:
                match.vote_count_tmdb = int(tmdb_data.get("vote_count"))
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        if match.is_adult != tmdb_data.get("adult", False):
            match.is_adult = tmdb_data.get("adult", False)
            db_updated = True
        
        loc_db = next((x for x in match.localizations if x.locale == ui_lang), None)
        genres_list = _split_genres([g["name"] for g in tmdb_data.get("genres", [])]) if tmdb_data.get("genres") else []
        if not loc_db:
            loc_db = MetadataLocalization(
                match_id=match.id,
                locale=ui_lang,
                title=tmdb_data.get("title") or tmdb_data.get("original_title") or "Unknown Movie",
                overview=tmdb_data.get("overview"),
                poster_path=tmdb_data.get("poster_path"),
                genres=genres_list
            )
            db.add(loc_db)
            db_updated = True
        else:
            if not loc_db.title and (tmdb_data.get("title") or tmdb_data.get("original_title")):
                loc_db.title = tmdb_data.get("title") or tmdb_data.get("original_title")
                db_updated = True
            if not loc_db.overview and tmdb_data.get("overview"):
                loc_db.overview = tmdb_data.get("overview")
                db_updated = True
            if not loc_db.poster_path and tmdb_data.get("poster_path"):
                loc_db.poster_path = tmdb_data.get("poster_path")
                db_updated = True
            if not loc_db.genres and genres_list:
                loc_db.genres = genres_list
                db_updated = True
        
        if db_updated:
            db.commit()
