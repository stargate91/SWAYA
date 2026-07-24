import logging
from typing import Any, Optional
from fastapi.responses import JSONResponse
from app.core.gender_utils import map_gender_str_to_int
from app.core.date_utils import parse_date



from app.core.enums import Provider, MediaType
from app.modules.users.models import UserOverride
from app.modules.library.schemas import MovieDetailResponse
from app.modules.library.services.detail.formatters.base import MovieDetailFormatter
from app.modules.library.services.detail.detail_mixins import OverrideResolver, PlaybackResolver, ExternalLinksBuilder
from app.modules.metadata.models import MetadataMatch

from app.modules.people.models import Person, ExternalSourceLink

logger = logging.getLogger(__name__)

def _extract_porndb_poster(data: dict) -> Optional[str]:
    if not data or not isinstance(data, dict):
        return None
    for key in ("image", "poster_image", "poster", "front_image", "cover"):
        val = data.get(key)
        if isinstance(val, str) and val.startswith("http"):
            return val
        if isinstance(val, dict):
            for k in ("large", "medium", "url", "original", "small"):
                if isinstance(val.get(k), str) and val.get(k).startswith("http"):
                    return val.get(k)
    posters = data.get("posters")
    if isinstance(posters, dict):
        for k in ("large", "medium", "url", "original", "small"):
            if isinstance(posters.get(k), str) and posters.get(k).startswith("http"):
                return posters.get(k)
    elif isinstance(posters, str) and posters.startswith("http"):
        return posters
    return None

def _extract_porndb_backdrop(data: dict) -> Optional[str]:
    if not data or not isinstance(data, dict):
        return None
    for key in ("backdrop", "backdrops", "banner", "fanart"):
        val = data.get(key)
        if isinstance(val, str) and val.startswith("http"):
            return val
        if isinstance(val, dict):
            for k in ("large", "medium", "url", "original"):
                if isinstance(val.get(k), str) and val.get(k).startswith("http"):
                    return val.get(k)
    return None

class PornDbMovieFormatter(MovieDetailFormatter):
    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        try:
            porndb_id = item_id.split("_")[-1]
        except IndexError:
            print(f"[DEBUG] PornDbMovieFormatter.format: Invalid PornDB ID format: {item_id}")
            return JSONResponse(status_code=400, content={"error": "Invalid PornDB ID format"})
            
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
                                "gender": "female" if person_obj.gender == 1 else "male" if person_obj.gender == 2 else "",
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
            
        from app.core.date_utils import get_year_from_date
        year = get_year_from_date(movie_data.get("date"))
                
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
            
        raw_poster = _extract_porndb_poster(movie_data)
        raw_backdrop = _extract_porndb_backdrop(movie_data)
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
            from app.core.language import LanguageService
            loc_db = LanguageService.get_best_localization(match.localizations, ui_lang)
            if loc_db and loc_db.local_poster_path:
                poster_url = loc_db.local_poster_path
            elif loc_db and loc_db.poster_path:
                poster_url = loc_db.poster_path
            backdrop_url = match.local_backdrop_path or match.backdrop_path or backdrop_url

        if match:
            db_updated = False
            if not match.backdrop_path and raw_backdrop:
                match.backdrop_path = raw_backdrop
                db_updated = True
            if not match.release_date and date_str:
                parsed = parse_date(date_str)
                if parsed:
                    match.release_date = datetime(parsed.year, parsed.month, parsed.day)
                    db_updated = True

            if movie_data.get("rating") is not None and float(movie_data.get("rating")) > 0:
                try:
                    match.rating_porndb = float(movie_data.get("rating"))
                    db_updated = True
                except Exception as e:
                    logger.debug(f"Swallowed exception in app/modules/library/services/detail/formatters/porndb_movie.py:97: {e}", exc_info=True)
            
            loc_db = next((x for x in match.localizations if x.locale == "en"), None)
            if not loc_db:
                from app.modules.metadata.models import MetadataLocalization
                loc_db = MetadataLocalization(
                    match_id=match.id,
                    locale="en",
                    title=movie_data.get("title") or "Unknown Movie",
                    overview=movie_data.get("description"),
                    poster_path=raw_poster
                )
                db.add(loc_db)
                db_updated = True
            else:
                if not loc_db.title and movie_data.get("title"):
                    loc_db.title = movie_data.get("title")
                    db_updated = True
                if not loc_db.overview and movie_data.get("description"):
                    loc_db.overview = movie_data.get("description")
                    db_updated = True
                if not loc_db.poster_path and raw_poster:
                    loc_db.poster_path = raw_poster
                    db_updated = True

            # Enqueue PornDB movie local asset downloads
            try:
                from app.modules.tasks.image_download_service import ImageDownloadService
                from app.modules.media_assets.services.images import image_processing_service, image_path_resolver
                import os
                from urllib.parse import urlparse

                image_downloader = ImageDownloadService()
                clean_poster = raw_poster or loc_db.poster_path
                if clean_poster and clean_poster.startswith(("http://", "https://")):
                    raw_filename = os.path.basename(urlparse(clean_poster).path)
                    if raw_filename:
                        clean_filename = f"porndb_{porndb_id}_{raw_filename}"
                        existing = image_path_resolver.find_existing_file_by_stem(
                            image_processing_service.image_root, "original", "posters", clean_filename
                        ) or image_path_resolver.find_existing_file_by_stem(
                            image_processing_service.image_root, "thumbnails", "posters", clean_filename
                        )
                        if not existing:
                            download_url = image_downloader.get_download_url(clean_poster, "posters") or clean_poster
                            image_downloader.enqueue_download(download_url, "posters", clean_filename)
                        if not loc_db.local_poster_path:
                            loc_db.local_poster_path = f"posters/{clean_filename}"
                            db_updated = True

                clean_backdrop = raw_backdrop or match.backdrop_path
                if clean_backdrop and clean_backdrop.startswith(("http://", "https://")):
                    raw_filename = os.path.basename(urlparse(clean_backdrop).path)
                    if raw_filename:
                        clean_filename = f"porndb_{porndb_id}_{raw_filename}"
                        existing = image_path_resolver.find_existing_file_by_stem(
                            image_processing_service.image_root, "original", "backdrops", clean_filename
                        ) or image_path_resolver.find_existing_file_by_stem(
                            image_processing_service.image_root, "thumbnails", "backdrops", clean_filename
                        )
                        if not existing:
                            download_url = image_downloader.get_download_url(clean_backdrop, "backdrops") or clean_backdrop
                            image_downloader.enqueue_download(download_url, "backdrops", clean_filename)
                        if not match.local_backdrop_path:
                            match.local_backdrop_path = f"backdrops/{clean_filename}"
                            db_updated = True
            except Exception as err:
                logger.warning(f"Failed to queue PornDB movie assets for {porndb_id}: {err}")
            
            if db_updated:
                db.commit()

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