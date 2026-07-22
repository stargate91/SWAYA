import logging
from typing import Any
from fastapi.responses import JSONResponse

from app.modules.metadata.models import MetadataMatch
from app.core.language import LanguageService
from app.core.genre_utils import split_genres as _split_genres
from app.modules.library.schemas import MovieDetailResponse
from app.modules.library.services.detail.formatters.base import MovieDetailFormatter
from app.modules.library.services.detail.detail_mixins import OverrideResolver, PlaybackResolver, ExternalLinksBuilder

logger = logging.getLogger(__name__)

class TmdbMovieFormatter(MovieDetailFormatter):
    def __init__(self):
        super().__init__()
        from app.modules.library.services.detail.formatters.movie.movie_credits_formatter import MovieCreditsFormatter
        from app.modules.library.services.detail.formatters.movie.movie_db_syncer import MovieDbSyncer
        self.credits_formatter = MovieCreditsFormatter()
        self.db_syncer = MovieDbSyncer()

    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        try:
            tmdb_id = int(item_id.split("_")[1])
        except (ValueError, IndexError):
            return JSONResponse(status_code=400, content={"error": "Invalid TMDB ID format"})
        
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        
        from app.core.enums import Provider, MediaType
        
        match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tmdb_id),
            MetadataMatch.media_type == MediaType.MOVIE
        ).first()

        tmdb_data = None
        tmdb_scraper = scrapers.tmdb(db)
        try:
            tmdb_data = tmdb_scraper.get_details(tmdb_id, "movie", language=ui_lang)
        except Exception:
            tmdb_data = None

        if not tmdb_data and match:
            loc_db = LanguageService.get_best_localization(match.localizations, ui_lang)
            if loc_db and loc_db.title:
                companies = [{"name": s.name, "logo_path": s.logo_path} for s in match.studios]
                
                cast_list = []
                crew_list = []
                for link in match.people_links:
                    person_obj = link.person
                    if not person_obj:
                        continue
                    credit_item = {
                        "id": person_obj.id,
                        "name": person_obj.name,
                        "profile_path": person_obj.local_profile_path or person_obj.profile_path,
                        "character": link.character_name,
                        "job": link.role.value if hasattr(link.role, "value") else str(link.role)
                    }
                    role_str = link.role.value if hasattr(link.role, "value") else str(link.role)
                    if role_str == "acting":
                        cast_list.append(credit_item)
                    else:
                        crew_list.append(credit_item)
                
                tmdb_data = {
                    "title": loc_db.title,
                    "original_title": match.original_title or loc_db.title,
                    "overview": loc_db.overview or "",
                    "tagline": loc_db.tagline or "",
                    "release_date": match.release_date.isoformat()[:10] if match.release_date else None,
                    "runtime": match.runtime,
                    "vote_average": match.rating_tmdb or 0.0,
                    "vote_count": match.vote_count_tmdb or 0,
                    "budget": match.budget,
                    "revenue": match.revenue,
                    "poster_path": loc_db.local_poster_path or loc_db.poster_path,
                    "backdrop_path": match.local_backdrop_path or match.backdrop_path,
                    "logo_path": loc_db.local_logo_path or loc_db.logo_path,
                    "imdb_id": match.imdb_id,
                    "genres": [{"name": g} for g in (loc_db.genres or [])],
                    "production_companies": companies,
                    "original_language": loc_db.original_language,
                    "adult": match.is_adult,
                    "credits": {
                        "cast": cast_list,
                        "crew": crew_list
                    }
                }


        if not tmdb_data:
            return JSONResponse(status_code=404, content={"error": "Movie not found on TMDB"})
        
        credits = tmdb_data.get("credits", {})
        release_date = tmdb_data.get("release_date")
        cast, directors, writers, sound = self.credits_formatter.format_credits(
            db=db,
            credits=credits,
            release_date=release_date,
            current_uid=current_uid,
            resolve_img_fn=self._resolve_img
        )
        year = None
        if release_date:
            try:
                year = int(release_date.split("-")[0])
            except Exception as e:
                logger.debug(f"Swallowed exception in app/modules/library/services/detail/formatters/tmdb_movie.py:143: {e}", exc_info=True)
        
        match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tmdb_id),
            MetadataMatch.media_type == MediaType.MOVIE
        ).first()

        metadata_override, physical_override = OverrideResolver.resolve_overrides(
            db, current_uid, match=match
        )

        override = metadata_override
        
        from app.modules.media_assets.services.images import image_processing_service
        effective_poster = None
        if override and override.custom_poster:
            effective_poster = override.custom_poster
        else:
            effective_poster = image_processing_service.pick_poster_path(tmdb_data, preferred_language=ui_lang) or tmdb_data.get("poster_path")

        effective_backdrop = None
        if override and override.custom_backdrop:
            effective_backdrop = override.custom_backdrop
        else:
            effective_backdrop = image_processing_service.pick_backdrop_path(tmdb_data, preferred_language=ui_lang, allow_low_res=True)

        effective_logo = None
        if override and override.custom_logo:
            effective_logo = override.custom_logo
        else:
            effective_logo = tmdb_data.get("logo_path") or image_processing_service.pick_logo_path(tmdb_data, preferred_language=ui_lang)

        # Enqueue local asset downloads for TMDB movie assets (poster, backdrop, logo, cast profiles)
        try:
            from app.modules.tasks.image_download_service import ImageDownloadService
            image_downloader = ImageDownloadService()
            self._queue_tmdb_movie_assets(image_downloader, tmdb_id, tmdb_data, effective_poster, effective_backdrop, effective_logo)
        except Exception as err:
            logger.warning(f"Failed to queue TMDB movie assets for {tmdb_id}: {err}")

        imdb_id = tmdb_data.get("imdb_id")
        if match:
            self.db_syncer.sync_db_metadata(
                db=db,
                match=match,
                tmdb_data=tmdb_data,
                release_date=release_date,
                effective_backdrop=effective_backdrop,
                ui_lang=ui_lang,
                scrapers=scrapers
            )

        belongs_to_col = tmdb_data.get("belongs_to_collection")
        collection_data = None
        if belongs_to_col:
            col_db = match.collection if (match and match.collection and match.collection.external_id == str(belongs_to_col.get("id"))) else None
            col_loc = LanguageService.get_best_localization(col_db.localizations, ui_lang) if (col_db and col_db.localizations) else None
            collection_data = {
                "tmdb_id": belongs_to_col.get("id"),
                "title": belongs_to_col.get("name"),
                "poster_path": self._resolve_img(col_loc.local_poster_path or col_loc.poster_path if col_loc else belongs_to_col.get("poster_path"), "posters"),
                "backdrop_path": self._resolve_img(col_db.local_backdrop_path or col_db.backdrop_path if col_db else belongs_to_col.get("backdrop_path"), "backdrops"),
            }

        keywords_list = [k["name"] for k in tmdb_data.get("keywords", {}).get("keywords", [])] if tmdb_data.get("keywords") else []

        videos = (tmdb_data.get("videos") or {}).get("results") or []
        trailer_key = None
        youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key")]
        if not youtube_trailers:
            youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
        if youtube_trailers:
            trailer_key = youtube_trailers[0].get("key")

        is_watched, watch_count, resume_position, last_watched_at_dt = OverrideResolver.merge_watch_state(
            metadata_override=metadata_override, physical_override=physical_override
        )
        playback_logs = PlaybackResolver.get_playback_logs(
            db, current_uid, match.media_item_id if match else None
        )

        result = {
            "id": f"tmdb_{tmdb_id}",
            "title": tmdb_data.get("title") or tmdb_data.get("original_title") or "Unknown",
            "keywords": keywords_list,
            "trailer_key": trailer_key,
            "logo_path": self._resolve_img(effective_logo, "logos"),
            "original_title": tmdb_data.get("original_title"),
            "tagline": tmdb_data.get("tagline"),
            "overview": tmdb_data.get("overview"),
            "genres": _split_genres([g["name"] for g in tmdb_data.get("genres", [])]) if tmdb_data.get("genres") else [],
            "year": year,
            "release_date": release_date,
            "runtime": tmdb_data.get("runtime"),
            "rating_tmdb": tmdb_data.get("vote_average"),
            "rating_imdb": match.rating_imdb if match else None,
            "rating_rotten": match.rating_rotten if match else None,
            "rating_meta": match.rating_meta if match else None,
            "vote_count_tmdb": tmdb_data.get("vote_count"),
            "budget": tmdb_data.get("budget") or (match.budget if match else None),
            "revenue": tmdb_data.get("revenue") or (match.revenue if match else None),
            "companies": [{"name": c.get("name"), "logo_path": self._resolve_img(c.get("logo_path"), "logos")} for c in tmdb_data.get("production_companies", [])] if tmdb_data.get("production_companies") else [],
            "networks": [],
            "poster_path": self._resolve_img(effective_poster, "posters"),
            "backdrop_path": self._resolve_img(effective_backdrop, "backdrops", size="original"),
            "original_language": tmdb_data.get("original_language"),
            "type": "movie",
            "tmdb_id": tmdb_id,
            "collection_data": collection_data,
            "cast": cast,
            "cast_total": len(credits.get("cast", [])),
            "people_complete": True,
            "directors": directors,
            "writers": writers,
            "sound": sound,
            "is_adult": tmdb_data.get("adult", False),
            "is_favorite": override.is_favorite if override else False,
            "user_rating": override.user_rating if override else None,
            "user_comment": override.user_comment if override else None,
            "custom_tags": [t.name for t in override.tags if t.is_adult == bool(tmdb_data.get("adult", False))] if (override and override.tags) else [],
            "suggested_tags": [k["name"] for k in tmdb_data.get("keywords", {}).get("keywords", [])] if tmdb_data.get("keywords") else [],
            "tags": [],
            "is_tracked": override.is_tracked if override else False,
            "watch_count": watch_count,
            "is_watched": is_watched,
            "resume_position": resume_position,
            "last_watched_at": last_watched_at_dt.isoformat() if last_watched_at_dt else None,
            "playback_logs": playback_logs,
            "in_library": match is not None and match.media_item_id is not None,
            "library_item_id": match.media_item_id if (match and match.media_item_id) else None,
        }
        
        peaks_count, peaks_history = PlaybackResolver.get_peaks(
            db, current_uid, match.media_item_id if match else None
        )
        result["peaks_count"] = peaks_count
        result["peaks_history"] = peaks_history
        
        ext_ids = {"tmdb": tmdb_id}
        imdb_id = tmdb_data.get("imdb_id") or (match.imdb_id if match else None)
        if imdb_id:
            ext_ids["imdb"] = imdb_id
        ExternalLinksBuilder.append_links(result, ext_ids, "movie")
        return MovieDetailResponse(**result)

    def _queue_tmdb_movie_assets(self, image_downloader, tmdb_id: int, tmdb_data: dict, effective_poster: str = None, effective_backdrop: str = None, effective_logo: str = None):
        if not image_downloader or not tmdb_data:
            return

        import os
        from urllib.parse import urlparse
        from typing import Optional
        from app.modules.media_assets.services.images import image_processing_service, image_path_resolver

        def queue_img(path: str, subfolder: str, prefix: str) -> Optional[str]:
            if not path:
                return None
            if path.startswith("/media/"):
                return path

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

        # 1. Poster
        poster_path = effective_poster or tmdb_data.get("poster_path")
        if poster_path:
            queue_img(poster_path, "posters", f"tmdb_{tmdb_id}")

        # 2. Backdrop
        b_path = effective_backdrop or tmdb_data.get("backdrop_path")
        if b_path:
            queue_img(b_path, "backdrops", f"tmdb_{tmdb_id}")

        # 3. Logo
        l_path = effective_logo or tmdb_data.get("logo_path")
        if l_path:
            queue_img(l_path, "logos", f"tmdb_{tmdb_id}")

        # 4. Cast & Crew Profiles
        credits = tmdb_data.get("credits", {})
        all_people = (credits.get("cast") or []) + (credits.get("crew") or [])
        for person in all_people:
            p_profile = person.get("profile_path")
            p_id = person.get("id")
            if p_profile and p_id:
                queue_img(p_profile, "people", f"tmdb_{p_id}")
