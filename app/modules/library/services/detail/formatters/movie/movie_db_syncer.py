import logging
from typing import Dict, Any, Optional
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
        release_date: Optional[str],
        effective_backdrop: Optional[str],
        ui_lang: str,
        scrapers: Any,
        effective_poster: Optional[str] = None,
        effective_logo: Optional[str] = None,
    ) -> None:
        db_updated = False
        provider_str = str(match.provider.value if hasattr(match.provider, "value") else match.provider).lower()

        if provider_str == "tmdb":
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

        elif provider_str == "porndb":
            if not match.backdrop_path and effective_backdrop:
                match.backdrop_path = effective_backdrop
                db_updated = True
            if not match.release_date and release_date:
                from app.core.date_utils import parse_date
                from datetime import datetime
                try:
                    parsed = parse_date(release_date)
                    if parsed:
                        match.release_date = datetime(parsed.year, parsed.month, parsed.day)
                        db_updated = True
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)

            rating = tmdb_data.get("rating")
            if rating is not None and float(rating) > 0 and not match.rating_porndb:
                try:
                    match.rating_porndb = float(rating)
                    db_updated = True
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)

            loc_db = next((x for x in match.localizations if x.locale == ui_lang), None)
            if not loc_db:
                loc_db = MetadataLocalization(
                    match_id=match.id,
                    locale=ui_lang,
                    title=tmdb_data.get("title") or "Unknown Movie",
                    overview=tmdb_data.get("description"),
                    poster_path=effective_poster
                )
                db.add(loc_db)
                db_updated = True
            else:
                if not loc_db.title and tmdb_data.get("title"):
                    loc_db.title = tmdb_data.get("title")
                    db_updated = True
                if not loc_db.overview and tmdb_data.get("description"):
                    loc_db.overview = tmdb_data.get("description")
                    db_updated = True
                if not loc_db.poster_path and effective_poster:
                    loc_db.poster_path = effective_poster
                    db_updated = True

            if not match.is_adult:
                match.is_adult = True
                db_updated = True

        # Unified background image download queuing
        try:
            from app.modules.tasks.image_download_service import ImageDownloadService
            from app.modules.media_assets.services.images import queue_img_download

            image_downloader = ImageDownloadService()
            asset_prefix = f"tmdb_movie_{match.external_id}" if provider_str == "tmdb" else f"porndb_{match.external_id}"

            # Poster asset
            clean_poster = effective_poster or (loc_db.poster_path if loc_db else None)
            if clean_poster and clean_poster.startswith(("http://", "https://", "/")):
                res_path = queue_img_download(image_downloader, clean_poster, "posters", asset_prefix)
                if res_path and loc_db and not loc_db.local_poster_path:
                    loc_db.local_poster_path = res_path
                    db_updated = True

            # Backdrop asset
            clean_backdrop = effective_backdrop or match.backdrop_path
            if clean_backdrop and clean_backdrop.startswith(("http://", "https://", "/")):
                res_path = queue_img_download(image_downloader, clean_backdrop, "backdrops", asset_prefix)
                if res_path and not match.local_backdrop_path:
                    match.local_backdrop_path = res_path
                    db_updated = True

            # Logo asset (TMDB only)
            if provider_str == "tmdb" and effective_logo and effective_logo.startswith(("http://", "https://", "/")):
                res_path = queue_img_download(image_downloader, effective_logo, "logos", asset_prefix)
                if res_path and loc_db and not loc_db.local_logo_path:
                    loc_db.local_logo_path = res_path
                    db_updated = True

            # TMDB Credits cast member profile photos
            if provider_str == "tmdb" and tmdb_data:
                credits = tmdb_data.get("credits", {})
                all_people = (credits.get("cast") or []) + (credits.get("crew") or [])
                for person in all_people:
                    profile_path = person.get("profile_path")
                    p_id = person.get("id")
                    if profile_path and p_id and profile_path.startswith(("/", "http://", "https://")):
                        queue_img_download(image_downloader, profile_path, "people", f"tmdb_{p_id}")

        except Exception as err:
            logger.warning(f"Failed to queue movie assets for {provider_str} {match.external_id}: {err}")

        if db_updated:
            db.commit()
