import logging
from typing import Any, Optional
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.domains.library.schemas import TvShowDetailResponse
from app.domains.library.services.detail._detail_formatter import DetailFormatter
from app.domains.library.services.detail.formatters.tv.episode_formatter import TvEpisodeFormatter
from app.domains.library.services.detail.formatters.tv.season_formatter import TvSeasonFormatter
from app.domains.library.services.detail.formatters.tv.tv_local_resolver import TvLocalResolver
from app.domains.library.services.detail.formatters.tv.tv_playback_resolver import TvPlaybackResolver
from app.domains.library.services.detail.formatters.tv.tv_credits_formatter import TvCreditsFormatter
from app.domains.library.services.detail.formatters.tv.tv_metadata_resolver import TvShowMetadataResolver
from app.domains.metadata.models import MetadataMatch
from app.domains.users.models import UserOverride
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.enums import Provider, MediaType
from app.shared_kernel.genre_utils import split_genres as _split_genres

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
        
        ui_lang = language or DEFAULT_FALLBACK_LANGUAGE
        tmdb_data = tmdb_scraper.get_details(tv_tmdb_id_int, "tv", language=ui_lang)
        if not tmdb_data:
            return JSONResponse(status_code=404, content={"error": "TV Show not found on TMDB"})
        
        from app.shared_kernel.user_context import get_current_user_id
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
            effective_logo = image_processing_service.pick_logo_path(tmdb_data, preferred_language=ui_lang)

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
            "poster_path": self._resolve_img(override.custom_poster if (override and override.custom_poster) else tmdb_data.get("poster_path"), "posters"),
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

        from app.domains.library.services.detail.external_links import generate_external_links
        result["external_links"] = generate_external_links(ext_ids, "tv")
        return TvShowDetailResponse(**result)
