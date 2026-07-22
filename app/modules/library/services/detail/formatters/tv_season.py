from typing import Any
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.core.enums import Provider, MediaType, ItemStatus
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.library.services.detail._detail_formatter import DetailFormatter

class TvSeasonFormatter(DetailFormatter):
    def format(
        self,
        tv_tmdb_id: str,
        season_number: int,
        db: Session,
        tmdb_scraper: Any
    ):
        from app.modules.library.schemas import TvSeasonDetailResponse
        try:
            tv_tmdb_id_int = int(tv_tmdb_id.split("_")[1]) if "_" in tv_tmdb_id else int(tv_tmdb_id)
        except (ValueError, IndexError):
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
                            local_episodes_map[num] = item
                    else:
                        local_episodes_map[int(ep_num)] = item
        
        episodes = []
        all_episodes = season_detail.get("episodes", []) or []
        for ep in all_episodes:
            ep_num = ep.get("episode_number")
            local_item = local_episodes_map.get(ep_num)
            
            override = None
            from app.core.user_context import get_current_user_id
            current_uid = get_current_user_id()
            
            episode_match = db.query(MetadataMatch).filter(
                MetadataMatch.provider == Provider.TMDB,
                MetadataMatch.media_type == MediaType.EPISODE,
                MetadataMatch.season_number == season_number,
                MetadataMatch.episode_number == ep_num,
                MetadataMatch.external_id == str(tv_tmdb_id_int)
            ).first()
            
            metadata_override = None
            if episode_match:
                metadata_override = db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.metadata_match_id == episode_match.id
                ).first()
            
            physical_override = None
            if local_item:
                physical_override = db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.media_item_id == local_item.id
                ).first()
            
            from app.modules.library.services.detail.detail_mixins import OverrideResolver
            is_watched, watch_count, resume_position, last_watched_at_dt = OverrideResolver.merge_watch_state(
                metadata_override=metadata_override,
                physical_override=physical_override
            )
            last_watched_at = last_watched_at_dt.isoformat() if last_watched_at_dt else None

            is_multi_episode = False
            if local_item:
                siblings = [k for k, v in local_episodes_map.items() if v.id == local_item.id]
                if len(siblings) > 1:
                    is_multi_episode = True
                    match_ids = [m.id for m in local_item.matches]
                    sibling_overrides = db.query(UserOverride).filter(
                        UserOverride.user_id == current_uid,
                        (UserOverride.media_item_id == local_item.id) | (UserOverride.metadata_match_id.in_(match_ids))
                    ).all()
                    for sov in sibling_overrides:
                        if sov.is_watched:
                            is_watched = True
                        if sov.watch_count and sov.watch_count > watch_count:
                            watch_count = sov.watch_count
                        if sov.resume_position and sov.resume_position > resume_position:
                            resume_position = sov.resume_position
                        if sov.last_watched_at:
                            if not last_watched_at or sov.last_watched_at.isoformat() > last_watched_at:
                                last_watched_at = sov.last_watched_at.isoformat()
            
            playback_logs = []
            technical = None
            if local_item:
                playback_logs = [
                    {"id": log.id, "watched_at": log.watched_at.isoformat()}
                    for log in sorted(local_item.playback_logs or [], key=lambda x: x.watched_at, reverse=True)
                ]
                technical = {
                    "resolution": local_item.resolution,
                    "video_codec": local_item.video_codec,
                    "audio_codec": local_item.audio_codec,
                    "audio_channels": local_item.audio_channels,
                    "hdr_type": local_item.hdr_type,
                    "bit_depth": local_item.bit_depth,
                    "framerate": local_item.framerate,
                    "duration": local_item.duration,
                    "size_bytes": local_item.size,
                    "source": local_item.source.value if hasattr(local_item.source, "value") else str(local_item.source),
                    "edition": local_item.edition.value if hasattr(local_item.edition, "value") else str(local_item.edition),
                    "audio_type": local_item.audio_type.value if hasattr(local_item.audio_type, "value") else str(local_item.audio_type),
                }

            from app.core.episode_utils import format_episode_code
            disp_code = format_episode_code(season_number, ep_num)

            episodes.append({
                "id": f"tmdb_{tv_tmdb_id_int}_{season_number}_{ep_num}",
                "episode_number": ep_num,
                "title": ep.get("name") or f"Episode {ep_num}",
                "overview": ep.get("overview"),
                "still_path": self._resolve_img(ep.get("still_path"), "stills"),
                "runtime": ep.get("runtime"),
                "rating_tmdb": ep.get("vote_average"),
                "vote_count_tmdb": ep.get("vote_count"),
                "air_date": ep.get("air_date"),
                "path": local_item.current_path if local_item else None,
                "filename": local_item.filename if local_item else None,
                "watch_count": watch_count,
                "is_watched": is_watched,
                "resume_position": resume_position,
                "last_watched_at": last_watched_at,
                "in_library": local_item is not None,
                "is_missing": local_item is None,
                "is_multi_episode": is_multi_episode,
                "playback_logs": playback_logs,
                "technical": technical,
                "display_episode_code": disp_code,
            })
            
        local_count = sum(1 for ep in all_episodes if ep.get("episode_number") in local_episodes_map)

        result = {
            "season_number": season_number,
            "title": season_detail.get("name") or f"Season {season_number}",
            "overview": season_detail.get("overview"),
            "poster_path": self._resolve_img(season_detail.get("poster_path"), "posters"),
            "air_date": season_detail.get("air_date"),
            "episode_count": len(all_episodes),
            "local_episode_count": local_count,
            "episodes_loaded_count": len(episodes),
            "episodes": episodes,
        }
        return TvSeasonDetailResponse(**result)
