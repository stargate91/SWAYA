import logging
from typing import Any, Optional
from fastapi.responses import JSONResponse
from app.core.gender_utils import map_gender_str_to_int, map_gender_int_to_str
from app.core.date_utils import parse_date



from app.core.enums import Provider, MediaType
from app.modules.users.models import UserOverride
from app.modules.library.schemas import MovieDetailResponse
from app.modules.library.services.detail.formatters.base import MovieDetailFormatter
from app.modules.library.services.detail.detail_mixins import OverrideResolver, PlaybackResolver, ExternalLinksBuilder
from app.modules.metadata.models import MetadataMatch

from app.modules.people.models import Person, ExternalSourceLink

logger = logging.getLogger(__name__)



class PornDbMovieFormatter(MovieDetailFormatter):
    def __init__(self):
        super().__init__()
        from app.modules.library.services.detail.formatters.movie.movie_db_syncer import MovieDbSyncer
        self.db_syncer = MovieDbSyncer()

    def _resolve_img(self, path: Any, subfolder: str, size: str = "w500") -> Any:
        from app.modules.media_assets.services.images import image_processing_service
        return image_processing_service.resolve_image_url(path, subfolder, size)

    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        from app.core.identifier_utils import parse_identifier
        parsed = parse_identifier(item_id)
        if not parsed or parsed.provider != "porndb":
            print(f"[DEBUG] PornDbMovieFormatter.format: Invalid PornDB ID format: {item_id}")
            return JSONResponse(status_code=400, content={"error": "Invalid PornDB ID format"})
        porndb_id = parsed.external_id
            
        print(f"[DEBUG] PornDbMovieFormatter.format called with item_id={item_id}, parsed porndb_id={porndb_id}")
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        
        
        match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.PORNDB,
            MetadataMatch.external_id == str(porndb_id),
            MetadataMatch.media_type == MediaType.MOVIE
        ).first()

        movie_data = None
        porndb_scraper = scrapers.get_scraper(Provider.PORNDB, db)
        try:
            movie_data = porndb_scraper.fetch_movie(porndb_id)
        except Exception:
            movie_data = None

        if not movie_data and match:
            from app.core.language import LanguageService
            loc_db = LanguageService.get_best_localization(match.localizations, ui_lang)
            if loc_db and loc_db.title:
                performers = []
                for link in match.people_links:
                    person_obj = link.person
                    if person_obj:
                        performers.append({
                            "parent": {
                                "id": person_obj.id,
                                "name": person_obj.name,
                                "gender": map_gender_int_to_str(person_obj.gender) or "",
                                "profile_path": person_obj.local_profile_path or person_obj.profile_path
                            }
                        })
                
                studio_data = {}
                if match.studios:
                    studio_data = {"name": match.studios[0].name, "logo_path": match.studios[0].logo_path}

                movie_data = {
                    "title": loc_db.title,
                    "date": match.release_date.isoformat()[:10] if match.release_date else None,
                    "synopsis": loc_db.overview,
                    "poster": loc_db.poster_path,
                    "backdrop": match.backdrop_path,
                    "rating_porndb": match.rating_porndb,
                    "performers": performers,
                    "studio": studio_data
                }

        if not movie_data:
            return JSONResponse(status_code=404, content={"error": "Movie not found on PornDB"})
            
        override = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            UserOverride.custom_title == (movie_data.get("title") or "Unknown Movie")
        ).first()
            
        date_str = movie_data.get("date")
        from app.core.date_utils import get_year_from_date
        year = get_year_from_date(date_str)
                
        from app.modules.people.helpers import should_exclude_adult_performer

        cast = []
        for perf in movie_data.get("performers") or []:
            p_info = perf.get("parent") or perf.get("performer") or perf
            perf_name = p_info.get("name")
            if not perf_name:
                continue
            p_gender = p_info.get("gender") or p_info.get("extras", {}).get("gender") or p_info.get("extra", {}).get("gender")
            mapped_gender = map_gender_str_to_int(p_gender)

            
            if should_exclude_adult_performer(db, mapped_gender, is_adult=True):
                continue
                
            # Check if person exists in DB
            person_db = None
            p_ext_id = p_info.get("id")
            if p_ext_id:
                link = db.query(ExternalSourceLink).filter(
                    ExternalSourceLink.provider == Provider.PORNDB,
                    ExternalSourceLink.external_id == str(p_ext_id)
                ).first()
                if link:
                    person_db = link.person
 
            if not person_db:
                person_db = db.query(Person).filter(Person.name == perf_name).first()
 
            if person_db:
                p_id = f"local:{person_db.id}"
                # Check for UserOverride custom profile image
                override_obj = db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.person_id == person_db.id
                ).first()
                custom_img = override_obj.custom_poster if override_obj else None
                resolved_img = self._resolve_img(custom_img or person_db.local_profile_path or person_db.profile_path, "people")
            else:
                p_id = f"porndb:{p_info.get('id')}"
                resolved_img = p_info.get("image")
                
            cast.append({
                "id": p_id,
                "name": perf_name,
                "character": None,
                "job": "Actor",
                "profile_path": resolved_img,
                "popularity": p_info.get("rating_porndb") or 0.0,
                "gender": mapped_gender
            })
            
        raw_poster = porndb_scraper.extract_poster(movie_data) if porndb_scraper else None
        raw_backdrop = porndb_scraper.extract_backdrop(movie_data) if porndb_scraper else None
        poster_url = raw_poster
        backdrop_url = raw_backdrop

        if not match and movie_data:
            try:
                from datetime import datetime
                rel_date = None
                if date_str:
                    parsed = parse_date(date_str)
                    if parsed:
                        rel_date = datetime(parsed.year, parsed.month, parsed.day)

                with db.begin_nested():
                    match = MetadataMatch(
                        provider=Provider.PORNDB,
                        external_id=str(porndb_id),
                        media_type=MediaType.MOVIE,
                        confidence_score=1.0,
                        rating_porndb=float(movie_data.get("rating") or 0) if movie_data.get("rating") else None,
                        release_date=rel_date,
                        backdrop_path=raw_backdrop
                    )
                    db.add(match)
                    db.flush()
            except Exception as e:
                logger.debug(f"Failed on-the-fly match creation for PornDB movie {porndb_id}: {e}")
                match = db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.PORNDB,
                    MetadataMatch.external_id == str(porndb_id),
                    MetadataMatch.media_type == MediaType.MOVIE
                ).first()

        if match:
            self.db_syncer.sync_db_metadata(
                db=db,
                match=match,
                tmdb_data=movie_data,
                release_date=date_str,
                effective_backdrop=raw_backdrop,
                ui_lang=ui_lang,
                scrapers=scrapers,
                effective_poster=raw_poster,
            )

        poster_url = raw_poster
        backdrop_url = raw_backdrop
        if match:
            from app.core.language import LanguageService
            loc_db = LanguageService.get_best_localization(match.localizations, ui_lang)
            if loc_db and loc_db.local_poster_path:
                poster_url = loc_db.local_poster_path
            elif loc_db and loc_db.poster_path:
                poster_url = loc_db.poster_path
            backdrop_url = match.local_backdrop_path or match.backdrop_path or backdrop_url

        metadata_override, physical_override = OverrideResolver.resolve_overrides(
            db, current_uid, match=match
        )

        is_watched, watch_count, resume_position, last_watched_at_dt = OverrideResolver.merge_watch_state(
            metadata_override=metadata_override, physical_override=physical_override,
            fallback_override=override
        )
        playback_logs = PlaybackResolver.get_playback_logs(
            db, current_uid, match.media_item_id if match else None
        )

        # Use metadata_override if available, else fallback to override
        effective_override = metadata_override if metadata_override else override

        companies = []
        site = movie_data.get("site")
        if site and site.get("name"):
            companies.append({
                "name": site.get("name"),
                "logo_path": self._resolve_img(site.get("logo") or site.get("image") or site.get("poster"), "logos")
            })

            parent_site = site.get("parent") or site.get("network")
            if isinstance(parent_site, dict) and parent_site.get("name"):
                companies.append({
                    "name": parent_site.get("name"),
                    "logo_path": self._resolve_img(parent_site.get("logo") or parent_site.get("image") or parent_site.get("poster"), "logos")
                })

        networks = []

        duration_val = None
        duration_raw = movie_data.get("duration")
        if duration_raw:
            if isinstance(duration_raw, (int, float)):
                duration_val = int(duration_raw)
            elif isinstance(duration_raw, str):
                val = duration_raw.strip()
                if val.isdigit():
                    duration_val = int(val)
                else:
                    parts = val.split(":")
                    try:
                        if len(parts) == 2:
                            duration_val = int(parts[0]) * 60 + int(parts[1])
                        elif len(parts) == 3:
                            duration_val = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    except ValueError as e:
                        logger.debug(f"Swallowed exception in app/modules/library/services/detail/formatters/porndb_movie.py:217: {e}", exc_info=True)

        result = {
            "id": f"porndb_{porndb_id}",
            "title": movie_data.get("title") or "Unknown Movie",
            "keywords": [],
            "trailer_key": movie_data.get("trailer"),
            "logo_path": None,
            "original_title": movie_data.get("title"),
            "tagline": None,
            "overview": movie_data.get("description"),
            "genres": [],
            "year": year,
            "release_date": date_str,
            "runtime": (duration_val // 60) if duration_val else None,
            "rating_tmdb": None,
            "rating_porndb": movie_data.get("rating"),
            "rating_imdb": None,
            "rating_rotten": None,
            "rating_meta": None,
            "vote_count_tmdb": None,
            "budget": None,
            "revenue": None,
            "companies": companies,
            "networks": networks,
            "poster_path": self._resolve_img(effective_override.custom_poster if (effective_override and effective_override.custom_poster) else poster_url, "posters"),
            "backdrop_path": self._resolve_img(backdrop_url, "backdrops", size="original") if backdrop_url else None,
            "original_language": "en",
            "type": "movie",
            "tmdb_id": 0,
            "collection_data": None,
            "cast": cast,
            "cast_total": len(cast),
            "people_complete": True,
            "directors": [],
            "writers": [],
            "is_adult": True,
            "is_favorite": effective_override.is_favorite if effective_override else False,
            "user_rating": effective_override.user_rating if effective_override else None,
            "user_comment": effective_override.user_comment if effective_override else None,
            "custom_tags": [t.name for t in effective_override.tags if t.is_adult] if (effective_override and effective_override.tags) else [],
            "suggested_tags": [t.get("name") for t in movie_data.get("tags") or [] if t.get("name")] if movie_data.get("tags") else [],
            "tags": [],
            "is_tracked": effective_override.is_tracked if effective_override else False,
            "watch_count": watch_count,
            "is_watched": is_watched,
            "resume_position": resume_position,
            "last_watched_at": last_watched_at_dt.isoformat() if last_watched_at_dt else None,
            "playback_logs": playback_logs,
            "in_library": match is not None and match.media_item_id is not None,
            "library_item_id": match.media_item_id if (match and match.media_item_id) else None,
        }
        ext_ids = {"porndb_id": porndb_id, "source": "porndb"}
        ExternalLinksBuilder.append_links(result, ext_ids, "movie")
        return MovieDetailResponse(**result)