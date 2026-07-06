import logging
from typing import Any
from fastapi.responses import JSONResponse

from app.shared_kernel.enums import Provider, MediaType
from app.domains.users.models import UserOverride
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.language import LanguageService
from app.shared_kernel.genre_utils import split_genres as _split_genres
from app.domains.library.schemas import MovieDetailResponse
from app.domains.library.services.detail.formatters.base import MovieDetailFormatter

logger = logging.getLogger(__name__)

class TmdbMovieFormatter(MovieDetailFormatter):
    def __init__(self):
        super().__init__()
        from app.domains.library.services.detail.formatters.movie.movie_credits_formatter import MovieCreditsFormatter
        from app.domains.library.services.detail.formatters.movie.movie_db_syncer import MovieDbSyncer
        self.credits_formatter = MovieCreditsFormatter()
        self.db_syncer = MovieDbSyncer()

    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        try:
            tmdb_id = int(item_id.split("_")[1])
        except (ValueError, IndexError):
            return JSONResponse(status_code=400, content={"error": "Invalid TMDB ID format"})
        
        ui_lang = DEFAULT_FALLBACK_LANGUAGE
        
        from app.domains.metadata.models import MetadataMatch
        from app.shared_kernel.enums import Provider, MediaType
        
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
            from app.shared_kernel.language import LanguageService
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
                logger.debug(f"Swallowed exception in domains/library/services/detail/formatters/tmdb_movie.py:143: {e}", exc_info=True)
        
        metadata_override = db.query(UserOverride).join(MetadataMatch, UserOverride.metadata_match_id == MetadataMatch.id).filter(
            UserOverride.user_id == current_uid,
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tmdb_id),
            MetadataMatch.media_type == MediaType.MOVIE
        ).first()
        
        match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tmdb_id),
            MetadataMatch.media_type == MediaType.MOVIE
        ).first()
        
        physical_override = None
        if match and match.media_item_id:
            physical_override = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.media_item_id == match.media_item_id
            ).first()

        override = metadata_override
        
        from app.domains.media_assets.services.images import image_processing_service
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

        # Merge watch properties
        is_watched = False
        watch_count = 0
        resume_position = 0
        last_watched_at_dt = None

        if metadata_override:
            is_watched = metadata_override.is_watched
            watch_count = metadata_override.watch_count or 0
            last_watched_at_dt = metadata_override.last_watched_at

        if physical_override:
            if physical_override.is_watched:
                is_watched = True
            if physical_override.watch_count and physical_override.watch_count > watch_count:
                watch_count = physical_override.watch_count
            if physical_override.resume_position:
                resume_position = physical_override.resume_position
            if physical_override.last_watched_at:
                if not last_watched_at_dt or physical_override.last_watched_at > last_watched_at_dt:
                    last_watched_at_dt = physical_override.last_watched_at

        playback_logs = []
        if match and match.media_item_id:
            from app.domains.history.models import PlaybackLog
            logs = db.query(PlaybackLog).filter(
                PlaybackLog.user_id == current_uid,
                PlaybackLog.media_item_id == match.media_item_id
            ).order_by(PlaybackLog.watched_at.desc()).all()
            playback_logs = [
                {
                    "id": log.id,
                    "watched_at": log.watched_at.isoformat()
                }
                for log in logs
            ]

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
            "poster_path": self._resolve_img(override.custom_poster if (override and override.custom_poster) else tmdb_data.get("poster_path"), "posters"),
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
        
        peaks_count = 0
        peaks_history = []
        if match and match.media_item_id:
            from app.domains.history.models import PlaybackPeakLog
            peaks = db.query(PlaybackPeakLog).filter(
                PlaybackPeakLog.user_id == current_uid,
                PlaybackPeakLog.media_item_id == match.media_item_id
            ).order_by(PlaybackPeakLog.video_position.asc()).all()
            peaks_count = len(peaks)
            peaks_history = [
                {
                    "id": p.id,
                    "video_position": p.video_position,
                    "watched_at": p.created_at.isoformat()
                }
                for p in peaks
            ]
        result["peaks_count"] = peaks_count
        result["peaks_history"] = peaks_history
        
        ext_ids = {
            "tmdb": tmdb_id
        }
        imdb_id = tmdb_data.get("imdb_id") or (match.imdb_id if match else None)
        if imdb_id:
            ext_ids["imdb"] = imdb_id

        from app.domains.library.services.detail.external_links import generate_external_links
        result["external_links"] = generate_external_links(ext_ids, "movie")
        return MovieDetailResponse(**result)
