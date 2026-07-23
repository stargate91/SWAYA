import logging
from typing import Any, Optional
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.modules.library.schemas import TvShowDetailResponse
from app.modules.library.services.detail._detail_formatter import DetailFormatter
from app.modules.library.services.detail.formatters.tv.episode_formatter import TvEpisodeFormatter
from app.modules.library.services.detail.formatters.tv.season_formatter import TvSeasonFormatter
from app.modules.library.services.detail.formatters.tv.tv_local_resolver import TvLocalResolver
from app.modules.library.services.detail.formatters.tv.tv_playback_resolver import TvPlaybackResolver
from app.modules.library.services.detail.formatters.tv.tv_credits_formatter import TvCreditsFormatter
from app.modules.library.services.detail.formatters.tv.tv_metadata_resolver import TvShowMetadataResolver
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride
from app.core.enums import Provider, MediaType
from app.core.genre_utils import split_genres as _split_genres

logger = logging.getLogger(__name__)

class TvShowFormatter(DetailFormatter):
    def __init__(self):
        super().__init__()
        self.ep_formatter = TvEpisodeFormatter()
        self.season_formatter = TvSeasonFormatter()
        self.local_resolver = TvLocalResolver()
        self.playback_resolver = TvPlaybackResolver()
        self.credits_formatter = TvCreditsFormatter()
        self.metadata_resolver = TvShowMetadataResolver()

    def format(
        self,
        tv_tmdb_id: str,
        db: Session,
        tmdb_scraper: Any,
        seasons_limit: int = 999,
        initial_episodes_limit: int = 999,
        language: str = None,
        omdb_scraper: Optional[Any] = None
    ):
        """Assembles the complete formatted details of a TV show, merging local and external data sources."""
        try:
            tv_tmdb_id_int = int(tv_tmdb_id.split("_")[1]) if "_" in tv_tmdb_id else int(tv_tmdb_id)
        except (ValueError, IndexError):
            return JSONResponse(status_code=400, content={"error": "Invalid tv TMDB ID"})
        
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = language or get_user_ui_language(settings)
        
        series_match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.media_type == MediaType.TV
        ).first()

        tmdb_data = None
        try:
            tmdb_data = tmdb_scraper.get_details(tv_tmdb_id_int, "tv", language=ui_lang)
        except Exception:
            tmdb_data = None

        if not tmdb_data and series_match:
            from app.core.language import LanguageService
            loc_db = LanguageService.get_best_localization(series_match.localizations, ui_lang)
            if loc_db and loc_db.title:
                local_seasons = db.query(MetadataMatch).filter(
                    MetadataMatch.parent_id == series_match.id,
                    MetadataMatch.media_type == MediaType.SEASON
                ).all()
                
                seasons_meta = []
                for s in local_seasons:
                    s_loc = LanguageService.get_best_localization(s.localizations, ui_lang)
                    poster = None
                    if s_loc:
                        poster = s_loc.local_poster_path or s_loc.poster_path
                    if not poster:
                        poster = s.backdrop_path or s.still_path
                        
                    seasons_meta.append({
                        "season_number": s.season_number,
                        "name": (s_loc.title if s_loc else None) or f"Season {s.season_number}",
                        "episode_count": s.number_of_episodes or 0,
                        "poster_path": poster
                    })
                
                cast_list = []
                crew_list = []
                created_by = []
                for link in series_match.people_links:
                    person_obj = link.person
                    if not person_obj:
                        continue
                    role_str = link.role.value if hasattr(link.role, "value") else str(link.role)
                    role_name = role_str
                    credit_item = {
                        "id": int(person_obj.get_external_id("tmdb")) if (person_obj.get_external_id("tmdb") and person_obj.get_external_id("tmdb").isdigit()) else person_obj.id,
                        "name": person_obj.name,
                        "profile_path": person_obj.local_profile_path or person_obj.profile_path,
                        "gender": person_obj.gender,
                        "job": role_name,
                        "character": link.character_name
                    }
                    if role_str == "actor":
                        cast_list.append(credit_item)
                    elif role_str == "creator":
                        created_by.append(credit_item)
                    else:
                        crew_list.append(credit_item)

                tmdb_data = {
                    "name": loc_db.title,
                    "overview": loc_db.overview or "",
                    "poster_path": loc_db.local_poster_path or loc_db.poster_path,
                    "backdrop_path": series_match.local_backdrop_path or series_match.backdrop_path,
                    "logo_path": loc_db.local_logo_path or loc_db.logo_path,
                    "tagline": loc_db.tagline,
                    "seasons": seasons_meta,
                    "vote_average": series_match.rating_tmdb or 0.0,
                    "external_ids": {"imdb_id": series_match.imdb_id},
                    "created_by": created_by,
                    "credits": {
                        "cast": cast_list,
                        "crew": crew_list
                    },
                    "first_air_date": series_match.release_date.isoformat()[:10] if series_match.release_date else None,
                    "last_air_date": series_match.last_air_date.isoformat()[:10] if series_match.last_air_date else None,
                    "status": series_match.release_status,
                    "keywords": {"results": [{"name": tag} for tag in (series_match.suggested_tags or [])]}
                }

                
        if not tmdb_data:
            return JSONResponse(status_code=404, content={"error": "TV Show not found"})
        
        from app.core.user_context import get_current_user_id
        current_uid = get_current_user_id()

        (
            local_items,
            extras_list,
            local_episodes_map,
            item_episodes_map,
            watched_episodes_set,
            episode_match_ids,
            local_item_ids,
            episode_matches,
            overrides
        ) = self.local_resolver.resolve_local_data(
            db=db,
            tv_tmdb_id_int=tv_tmdb_id_int,
            current_uid=current_uid
        )

        all_season_meta = sorted(tmdb_data.get("seasons", []), key=lambda x: x.get("season_number") or 0)
        seasons = self.season_formatter.format_seasons(
            db=db,
            tv_tmdb_id_int=tv_tmdb_id_int,
            all_season_meta=all_season_meta,
            seasons_limit=seasons_limit,
            initial_episodes_limit=initial_episodes_limit,
            local_items=local_items,
            local_episodes_map=local_episodes_map,
            watched_episodes_set=watched_episodes_set,
            ui_lang=ui_lang,
            tmdb_scraper=tmdb_scraper,
            ep_formatter=self.ep_formatter,
            current_uid=current_uid,
            resolve_img_fn=self._resolve_img
        )

        cast, directors, writers, sound = self.credits_formatter.format_credits(
            db=db,
            tmdb_data=tmdb_data,
            current_uid=current_uid,
            resolve_img_fn=self._resolve_img
        )
            
        override = db.query(UserOverride).join(MetadataMatch, UserOverride.metadata_match_id == MetadataMatch.id).filter(
            UserOverride.user_id == current_uid,
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.media_type == MediaType.TV
        ).first()
        
        from app.core.language import LanguageService
        loc_db = LanguageService.get_best_localization(series_match.localizations, ui_lang) if series_match else None

        from app.modules.media_assets.services.images import image_processing_service
        effective_poster = None
        if override and override.custom_poster:
            effective_poster = override.custom_poster
        elif loc_db and loc_db.local_poster_path:
            effective_poster = loc_db.local_poster_path
        else:
            effective_poster = image_processing_service.pick_poster_path(tmdb_data, preferred_language=ui_lang) or tmdb_data.get("poster_path")

        effective_backdrop = None
        if override and override.custom_backdrop:
            effective_backdrop = override.custom_backdrop
        elif series_match and series_match.local_backdrop_path:
            effective_backdrop = series_match.local_backdrop_path
        else:
            effective_backdrop = image_processing_service.pick_backdrop_path(tmdb_data, preferred_language=ui_lang, allow_low_res=True)

        effective_logo = None
        if override and override.custom_logo:
            effective_logo = override.custom_logo
        elif loc_db and loc_db.local_logo_path:
            effective_logo = loc_db.local_logo_path
        else:
            effective_logo = tmdb_data.get("logo_path") or image_processing_service.pick_logo_path(tmdb_data, preferred_language=ui_lang)

        # Enqueue local asset downloads for TMDB TV show assets (poster, backdrop, logo, cast profiles, season posters)
        try:
            from app.modules.tasks.image_download_service import ImageDownloadService
            image_downloader = ImageDownloadService()
            self._queue_tmdb_tv_assets(image_downloader, tv_tmdb_id_int, tmdb_data, effective_poster, effective_backdrop, effective_logo)
        except Exception as err:
            logger.warning(f"Failed to queue TMDB TV assets for {tv_tmdb_id_int}: {err}")

        series_match, loc_db = self.metadata_resolver.sync_metadata_match_and_localization(
            db=db,
            tv_tmdb_id_int=tv_tmdb_id_int,
            tmdb_data=tmdb_data,
            effective_backdrop=effective_backdrop,
            ui_lang=ui_lang,
            omdb_scraper=omdb_scraper
        )

        keywords_list, trailer_key = self.metadata_resolver.extract_keywords_and_trailers(tmdb_data)

        playback_logs, in_progress_episodes = self.playback_resolver.resolve_playback_and_progress(
            db=db,
            tv_tmdb_id_int=tv_tmdb_id_int,
            local_item_ids=local_item_ids,
            episode_match_ids=episode_match_ids,
            episode_matches=episode_matches,
            item_episodes_map=item_episodes_map,
            overrides=overrides
        )

        watched_episodes_count = len(watched_episodes_set)

        result = {
            "id": f"tmdb_{tv_tmdb_id_int}",
            "tv_tmdb_id": tv_tmdb_id_int,
            "keywords": keywords_list,
            "trailer_key": trailer_key,
            "extras": extras_list,
            "imdb_id": tmdb_data.get("external_ids", {}).get("imdb_id") or (series_match.imdb_id if series_match else None),
            "title": tmdb_data.get("name") or tmdb_data.get("original_name") or "Unknown TV Show",
            "tagline": loc_db.tagline if (loc_db and loc_db.tagline) else tmdb_data.get("tagline"),
            "logo_path": self._resolve_img(effective_logo, "logos"),
            "backdrop_path": self._resolve_img(effective_backdrop, "backdrops", size="original"),
            "poster_path": self._resolve_img(effective_poster, "posters"),
            "year": int(tmdb_data.get("first_air_date", "").split("-")[0]) if tmdb_data.get("first_air_date") else None,
            "first_air_date": tmdb_data.get("first_air_date"),
            "last_air_date": tmdb_data.get("last_air_date"),
            "release_status": tmdb_data.get("status"),
            "number_of_seasons": tmdb_data.get("number_of_seasons") or len(seasons),
            "number_of_episodes": tmdb_data.get("number_of_episodes") or 0,
            "overview": tmdb_data.get("overview"),
            "rating_tmdb": tmdb_data.get("vote_average"),
            "rating_imdb": series_match.rating_imdb if series_match else None,
            "rating_rotten": series_match.rating_rotten if series_match else None,
            "rating_meta": series_match.rating_meta if series_match else None,
            "genres": _split_genres([g["name"] for g in tmdb_data.get("genres", [])]) if tmdb_data.get("genres") else [],
            "type": "tv",
            "cast": cast,
            "directors": directors,
            "writers": writers,
            "sound": sound,
            "seasons": seasons,
            "companies": [{"name": c.get("name"), "logo_path": self._resolve_img(c.get("logo_path"), "logos")} for c in tmdb_data.get("production_companies", [])] if tmdb_data.get("production_companies") else [],
            "networks": [{"name": n.get("name"), "logo_path": self._resolve_img(n.get("logo_path"), "logos")} for n in tmdb_data.get("networks", [])] if tmdb_data.get("networks") else [],
            "is_adult": tmdb_data.get("adult", False),
            "is_favorite": override.is_favorite if override else False,
            "user_rating": override.user_rating if override else None,
            "user_comment": override.user_comment if override else None,
            "is_tracked": override.is_tracked if override else False,
            "custom_tags": [t.name for t in override.tags if t.is_adult == bool(tmdb_data.get("adult", False))] if (override and override.tags) else [],
            "suggested_tags": keywords_list,
            "in_library": len(local_items) > 0,
            "progressive_seasons": True,
            "watch_stats": {
                "total_episodes_count": tmdb_data.get("number_of_episodes") or 0,
                "watched_episodes_count": watched_episodes_count,
                "in_progress_episodes": in_progress_episodes,
                "playback_logs": playback_logs,
            },
        }
        ext_ids = {
            "tmdb": tv_tmdb_id_int
        }
        imdb_id = result.get("imdb_id")
        if imdb_id:
            ext_ids["imdb"] = imdb_id

        from app.modules.library.services.detail.external_links import generate_external_links
        result["external_links"] = generate_external_links(ext_ids, "tv")
        return TvShowDetailResponse(**result)

    def _queue_tmdb_tv_assets(self, image_downloader, tv_tmdb_id: int, tmdb_data: dict, effective_poster: str = None, effective_backdrop: str = None, effective_logo: str = None):
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
            queue_img(poster_path, "posters", f"tmdb_{tv_tmdb_id}")

        # 2. Backdrop
        b_path = effective_backdrop or tmdb_data.get("backdrop_path")
        if b_path:
            queue_img(b_path, "backdrops", f"tmdb_{tv_tmdb_id}")

        # 3. Logo
        l_path = effective_logo or tmdb_data.get("logo_path")
        if l_path:
            queue_img(l_path, "logos", f"tmdb_{tv_tmdb_id}")

        # 4. Cast & Crew Profiles
        credits = tmdb_data.get("aggregate_credits") or tmdb_data.get("credits") or {}
        all_people = (credits.get("cast") or []) + (credits.get("crew") or [])
        for person in all_people:
            p_profile = person.get("profile_path")
            p_id = person.get("id")
            if p_profile and p_id:
                queue_img(p_profile, "people", f"tmdb_{p_id}")

        # 5. Season Posters
        for season in tmdb_data.get("seasons", []) or []:
            s_poster = season.get("poster_path")
            s_num = season.get("season_number")
            if s_poster and s_num is not None:
                queue_img(s_poster, "posters", f"tmdb_tv_{tv_tmdb_id}_season_{s_num}")
