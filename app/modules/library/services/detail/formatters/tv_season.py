from typing import Any
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.modules.library.models import MediaItem
from app.modules.media_assets.services.images import image_processing_service
from app.core.enums import ItemStatus
from app.modules.users.models import UserOverride

class TvSeasonFormatter:
    def format(
        self,
        tv_tmdb_id: str,
        season_number: int,
        db: Session,
        tmdb_scraper: Any
    ):
        from app.modules.library.schemas import TvSeasonDetailResponse
        from app.core.identifier_utils import parse_identifier
        parsed = parse_identifier(tv_tmdb_id)
        try:
            tv_tmdb_id_int = int(parsed.external_id) if parsed else int(tv_tmdb_id)
        except (ValueError, TypeError):
            return JSONResponse(status_code=400, content={"error": "Invalid tv TMDB ID"})
        
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        
        from app.modules.metadata.models import MetadataMatch
        from app.core.enums import Provider, MediaType
        
        series_match = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.media_type == MediaType.TV
        ).first()
        
        season_match = None
        if series_match:
            season_match = db.query(MetadataMatch).filter(
                MetadataMatch.parent_id == series_match.id,
                MetadataMatch.media_type == MediaType.SEASON,
                MetadataMatch.season_number == season_number
            ).first()

        season_detail = None
        if season_match:
            from app.core.language import LanguageService
            loc_db = LanguageService.get_best_localization(season_match.localizations, ui_lang)
            if loc_db and loc_db.title:
                local_episodes = db.query(MetadataMatch).filter(
                    MetadataMatch.parent_id == season_match.id,
                    MetadataMatch.media_type == MediaType.EPISODE
                ).all()
                
                episodes_meta = []
                for ep in local_episodes:
                    ep_loc = LanguageService.get_best_localization(ep.localizations, ui_lang)
                    episodes_meta.append({
                        "episode_number": ep.episode_number,
                        "name": ep_loc.title if ep_loc else (ep.original_title or f"Episode {ep.episode_number}"),
                        "overview": ep_loc.overview if ep_loc else "",
                        "air_date": ep.release_date.isoformat()[:10] if ep.release_date else None,
                        "vote_average": ep.rating_tmdb or 0.0,
                        "still_path": ep.local_still_path or ep.still_path
                    })
                episodes_meta.sort(key=lambda x: x["episode_number"])
                
                season_detail = {
                    "name": loc_db.title,
                    "overview": loc_db.overview,
                    "poster_path": loc_db.local_poster_path or loc_db.poster_path or season_match.local_backdrop_path or season_match.backdrop_path,
                    "air_date": season_match.release_date.isoformat()[:10] if season_match.release_date else None,
                    "episodes": episodes_meta
                }

        if not season_detail:
            try:
                season_detail = tmdb_scraper.get_season_details(tv_tmdb_id_int, season_number, language=ui_lang) or {}
            except Exception:
                season_detail = {}
                
        if not season_detail:
            return JSONResponse(status_code=404, content={"error": "Season not found"})
        
        local_items = db.query(MediaItem).join(MediaItem.matches).filter(
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.season_number == season_number,
            MetadataMatch.media_type == MediaType.EPISODE,
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
        ).all()
        
        local_episodes_map = {}
        for item in local_items:
            for match in item.matches:
                if match.episode_number is not None:
                    ep_num = match.episode_number
                    if isinstance(ep_num, list):
                        for num in ep_num:
                            local_episodes_map[(season_number, num)] = item
                    else:
                        local_episodes_map[(season_number, int(ep_num))] = item
        
        from app.core.user_context import get_current_user_id
        current_uid = get_current_user_id()
        
        from app.modules.library.services.detail.formatters.tv.episode_formatter import TvEpisodeFormatter
        ep_formatter = TvEpisodeFormatter()
        
        all_episodes = season_detail.get("episodes", []) or []
        
        episodes = ep_formatter.format_episodes(
            db=db,
            tv_tmdb_id_int=tv_tmdb_id_int,
            season_number=season_number,
            all_episodes=all_episodes,
            local_episodes_map=local_episodes_map,
            ep_limit=len(all_episodes),
            current_uid=current_uid,
            resolve_img_fn=image_processing_service.resolve_image_url
        )
            
        local_count = sum(1 for ep in all_episodes if (season_number, ep.get("episode_number")) in local_episodes_map)

        result = {
            "season_number": season_number,
            "title": season_detail.get("name") or f"Season {season_number}",
            "overview": season_detail.get("overview"),
            "poster_path": image_processing_service.resolve_image_url(season_detail.get("poster_path"), "posters"),
            "air_date": season_detail.get("air_date"),
            "episode_count": len(all_episodes),
            "local_episode_count": local_count,
            "episodes_loaded_count": len(episodes),
            "episodes": episodes,
        }
        return TvSeasonDetailResponse(**result)
