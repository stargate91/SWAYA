import os
import logging
import platform
import subprocess
import threading
from datetime import datetime, timezone
from app.modules.media.services.playback_logging_service import PlaybackLoggingService
from typing import Optional, Any, List, Tuple
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.modules.media_assets.services.images import image_processing_service
from app.core.exceptions import NotFoundException
from app.modules.media.schemas import (
    PlaybackStatusResponse,
    WatchHistoryResponse,
    WatchedHistoryResponse,
)
from app.modules.media.services.playback_domain_service import PlaybackDomainService
from app.core.enums import Provider, MediaType

logger = logging.getLogger(__name__)


class PlaybackService:
    def __init__(
        self,
        db: Session,
        settings_port: Optional[Any] = None,
        overrides_service: Optional[Any] = None,
        playback_repo: Optional[Any] = None,
        library_port: Optional[Any] = None
    ):
        from app.modules.library.db_media_resolver import DbMediaResolver
        from app.modules.history.db_playback_repository import DbPlaybackRepository
        from app.modules.users.services.overrides_service import OverridesService


        self.db = db
        self.library_port = library_port or DbMediaResolver(db)
        self.playback_repo = playback_repo or DbPlaybackRepository(db)
        self.overrides = overrides_service or OverridesService(db, self.library_port)

        from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
        self.settings = settings_port or DbSettingsAdapter(db)
        self.playback_logging_service = PlaybackLoggingService()

    def track_playback_start(self, item_id: Any) -> Tuple[Any, Any, int]:
        try:
            item_id_int = int(item_id)
        except (ValueError, TypeError):
            item_id_int = self.playback_repo.resolve_item_id_from_external(item_id)
            if not item_id_int:
                raise NotFoundException(f"Media item not found for ID: {item_id}")

        item = self.library_port.get_item_by_id(item_id_int)
        if not item:
            raise NotFoundException("Media item not found")

        file_path = item.current_path
        if not file_path or not os.path.exists(file_path):
            raise NotFoundException(f"Media file not found at: {file_path}")

        override = self.overrides.get_or_create_media_item_override(item_id_int)
        from datetime import timedelta
        now_utc = datetime.now(timezone.utc)
        override.last_watched_at = now_utc

        existing_log = None
        if not override.is_watched:
            latest_log = self.playback_repo.get_latest_playback_log(item.id)
            if latest_log:
                watched_at_tz = latest_log.watched_at
                if watched_at_tz.tzinfo is None:
                    watched_at_tz = watched_at_tz.replace(tzinfo=timezone.utc)
                if now_utc - watched_at_tz < timedelta(minutes=30):
                    existing_log = latest_log


        if existing_log:
            self.playback_repo.update_playback_log_watched_at(existing_log.id, now_utc)
        else:
            self.playback_repo.create_playback_log(item.id, now_utc)


        override.is_watched = False
        self.db.commit()

        start_seconds = override.resume_position or 0
        return item, override, start_seconds

    def add_watch_history_entry_core(self, item_id: int, watched_at_raw: Any = None) -> Any:
        item = self.library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        watched_at = PlaybackDomainService.parse_watched_at(watched_at_raw)
        self.playback_repo.create_playback_log(item.id, watched_at)
        self.db.refresh(item)
        self._recalculate_watch_state(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_watch_history_entry_core(self, item_id: int, log_id: int, watched_at_raw: Any = None) -> Any:
        item = self.library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        log = self.playback_repo.get_playback_log_by_id(log_id, item_id)
        if not log:
            raise NotFoundException("Watch history entry not found")

        new_watched_at = PlaybackDomainService.parse_watched_at(watched_at_raw)
        self.playback_repo.update_playback_log_watched_at(log.id, new_watched_at)
        self.db.refresh(item)
        self._recalculate_watch_state(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_watch_history_entry_core(self, item_id: int, log_id: int) -> Any:
        item = self.library_port.get_item_by_id(item_id)
        if not item:
            raise NotFoundException("Item not found")

        log = self.playback_repo.get_playback_log_by_id(log_id, item_id)
        if not log:
            raise NotFoundException("Watch history entry not found")

        self.playback_repo.delete_playback_log(log.id)
        self.db.refresh(item)
        self._recalculate_watch_state(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def reset_item_progress_core(self, item_id: int) -> Tuple[int, bool]:
        override = self.overrides.get_or_create_media_item_override(item_id)
        if not override:
            raise NotFoundException("Item not found")

        override.resume_position = 0
        override.is_watched = False
        self.db.commit()
        return 0, False

    def get_watched_history_logs(self, page: int, limit: int, include_adult: bool) -> Tuple[List[Any], bool]:
        offset = (page - 1) * limit
        logs = self.playback_repo.get_watched_history_logs(offset, limit + 1, include_adult)
        has_more = len(logs) > limit
        if has_more:
            logs = logs[:limit]
        return logs, has_more

    def _recalculate_watch_state(self, item) -> None:
        override = self.overrides.get_or_create_media_item_override(item.id)
        PlaybackDomainService.recalculate_watch_state(item.playback_logs, override)

    def _resolve_img(self, path: Optional[str], subfolder: str) -> Optional[str]:
        return image_processing_service.resolve_image_url(path, subfolder)

    def _serialize_playback_logs(self, item) -> list[dict]:
        logs = sorted(item.playback_logs or [], key=lambda x: x.watched_at, reverse=True)
        return [
            {
                "id": log.id,
                "watched_at": log.watched_at.isoformat(),
            }
            for log in logs
            if getattr(log, "watched_at", None)
        ]

    def _watch_history_response(self, item) -> WatchHistoryResponse:
        override = self.overrides.get_or_create_media_item_override(item.id)
        
        return WatchHistoryResponse(
            status="success",
            watch_count=override.watch_count if override else 0,
            is_watched=override.is_watched if override else False,
            resume_position=override.resume_position if override else 0,
            last_watched_at=override.last_watched_at.isoformat() if (override and override.last_watched_at) else None,
            playback_logs=self._serialize_playback_logs(item),
        )

    def play_media_item(self, item_id: Any):
        from app.modules.history.playback.player_detector import launch_media_file
        from app.modules.history.playback.playback_monitor import monitor_playback

        try:
            item, override, start_seconds = self.track_playback_start(item_id)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

        file_path = item.current_path
        launch_result = launch_media_file(file_path, self.settings, start_seconds=start_seconds)
        proc = launch_result.get("process")
        player_type = launch_result.get("player_type")
        port = launch_result.get("port")

        if proc and player_type in {"vlc", "mpc"}:
            t = threading.Thread(
                target=monitor_playback,
                args=(item.id, player_type, proc, port, self.overrides.user_id),
                daemon=True
            )
            t.start()
            return PlaybackStatusResponse(
                status="success",
                message=f"Launched {player_type.upper()} with precision tracking.",
                player_type=player_type,
                port=port,
                resume_position=override.resume_position,
                is_watched=override.is_watched,
            )

        return PlaybackStatusResponse(
            status="success",
            message=f"Launched default player for {file_path}",
            player_type="default",
            resume_position=override.resume_position,
            is_watched=override.is_watched,
        )

    def get_playback_info(self, item_id: Any):
        from app.modules.library.models import MediaItem
        
        try:
            item_id_int = int(item_id)
        except (ValueError, TypeError):
            item_id_int = self.playback_repo.resolve_item_id_from_external(item_id)
            if not item_id_int:
                raise NotFoundException(f"Media item not found for ID: {item_id}")
                
        item = self.library_port.get_item_by_id(item_id_int)
        if not item:
            raise NotFoundException("Media item not found")
            
        item, override, start_seconds = self.track_playback_start(item.id)
            
        logo_path = None
        media_image = None
        title = item.filename
        is_adult = False
        media_type = None
        match = next((m for m in item.matches), None)
        if match:
            from app.modules.metadata.models import MetadataMatch
            is_adult = bool(match.is_adult)
            media_type = match.media_type.value if match.media_type else None
            
            # Resolve parent show match for TV shows using explicit queries to avoid lazy loading issues
            show_match = None
            season_match = None
            if match.media_type and match.media_type.value == "episode":
                season_match = self.db.query(MetadataMatch).filter(MetadataMatch.id == match.parent_id).first()
                if season_match:
                    show_match = self.db.query(MetadataMatch).filter(MetadataMatch.id == season_match.parent_id).first()
            elif match.media_type and match.media_type.value == "season":
                show_match = self.db.query(MetadataMatch).filter(MetadataMatch.id == match.parent_id).first()
            else:
                show_match = match

            # Extract logo from show match
            logo_match = show_match or match
            if logo_match:
                from app.modules.metadata.models import MetadataLocalization
                
                loc_logo = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == logo_match.id).first()
                if loc_logo:
                    resolved = None
                    if loc_logo.local_logo_path:
                        resolved = ImageServiceRegistry.get().resolve_image_url(loc_logo.local_logo_path, "logos")
                    if not resolved and loc_logo.logo_path:
                        resolved = ImageServiceRegistry.get().resolve_image_url(loc_logo.logo_path, "logos")
                    logo_path = resolved

            # Prioritize studio logo if available (for scenes)
            if match.media_type and match.media_type.value == "scene":
                from app.modules.metadata.models import metadata_match_studios, Studio
                
                studio_row = self.db.query(Studio).join(metadata_match_studios).filter(
                    metadata_match_studios.c.metadata_match_id == match.id
                ).first()
                
                if studio_row:
                    studio_logo = studio_row.logo_path
                    parent_logo = None
                    if studio_row.parent_studio_id:
                        parent_studio = self.db.query(Studio).filter(Studio.id == studio_row.parent_studio_id).first()
                        if parent_studio:
                            parent_logo = parent_studio.logo_path
                    
                    chosen_logo = studio_logo or parent_logo
                    if chosen_logo:
                        resolved_studio = ImageServiceRegistry.get().resolve_image_url(chosen_logo, "logos")
                        if resolved_studio:
                            logo_path = resolved_studio

            # Extract title from current match localization
            from app.modules.metadata.models import MetadataLocalization
            loc = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == match.id).first()
            if match.media_type and match.media_type.value == "episode":
                ep_title = loc.title if loc else (match.original_title or item.filename)
                show_title = ""
                if show_match:
                    loc_show = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == show_match.id).first()
                    if loc_show:
                        show_title = loc_show.title
                    else:
                        show_title = show_match.original_title
                
                season_num = match.season_number if match.season_number is not None else 0
                ep_num = match.episode_number
                ep_str = ""
                
                def pad(num):
                    try:
                        return str(int(num)).zfill(2)
                    except Exception:
                        return str(num).zfill(2)

                if isinstance(ep_num, list) and ep_num:
                    ep_str = f"E{pad(ep_num[0])}-{pad(ep_num[-1])}" if len(ep_num) > 1 else f"E{pad(ep_num[0])}"
                elif isinstance(ep_num, (int, float)):
                    ep_str = f"E{pad(ep_num)}"
                elif isinstance(ep_num, str):
                    try:
                        import json
                        parsed = json.loads(ep_num)
                        if isinstance(parsed, list) and parsed:
                            ep_str = f"E{pad(parsed[0])}-{pad(parsed[-1])}" if len(parsed) > 1 else f"E{pad(parsed[0])}"
                        else:
                            ep_str = f"E{pad(parsed)}"
                    except Exception:
                        ep_str = f"E{pad(ep_num)}"
                else:
                    ep_str = f"E{pad(ep_num or 0)}"
                
                formatted_code = f"S{str(season_num).zfill(2)}{ep_str}"
                title = f"{show_title} - {formatted_code} - {ep_title}" if show_title else f"{formatted_code} - {ep_title}"
            else:
                if loc:
                    title = loc.title
                elif match.original_title:
                    title = match.original_title
                
            # Extract raw image paths first
            raw_image = None
            image_category = "posters"

            # Check override first
            if override and override.custom_poster:
                raw_image = override.custom_poster
                image_category = "posters"

            if not raw_image:
                if media_type == "episode":
                    raw_image = match.local_still_path or match.still_path
                    image_category = "stills"
                elif media_type == "scene":
                    raw_image = match.local_backdrop_path or match.backdrop_path
                    image_category = "scene_stills"
                else:
                    if loc:
                        raw_image = loc.local_poster_path or loc.poster_path
                    if not raw_image:
                        raw_image = match.local_poster_path or match.poster_path
                    if raw_image:
                        image_category = "posters"

            # Resolve the raw_image
            if raw_image:
                if raw_image.startswith(("/media/", "http://", "https://")):
                    media_image = raw_image
                else:
                    
                    media_image = ImageServiceRegistry.get().resolve_image_url(raw_image, image_category)
        else:
            # Check override poster without match
            if override and override.custom_poster:
                media_image = override.custom_poster
                if media_image and not media_image.startswith(("/media/", "http://", "https://")):
                    
                    media_image = ImageServiceRegistry.get().resolve_image_url(media_image, "posters")
        
        # Make sure media_image gets resolved if it's set
        if media_image and not media_image.startswith(("/media/", "http://", "https://")):
            
            media_image = ImageServiceRegistry.get().resolve_image_url(media_image, "posters")
        
        if override and override.custom_logo:
            logo_path = override.custom_logo

        # Resolve logo path using ImageServiceRegistry so the client gets a fully qualified URL
        if logo_path and not logo_path.startswith(("/media/", "http://", "https://")):
            
            logo_path = ImageServiceRegistry.get().resolve_image_url(logo_path, "logos")
                
        # Collect subtitle and audio extras
        from app.core.enums import ExtraCategory
        extras_list = []
        for extra in item.extras:
            if extra.category in (ExtraCategory.SUBTITLE, ExtraCategory.AUDIO):
                extras_list.append({
                    "category": extra.category.value,
                    "path": extra.current_path,
                    "language": extra.language,
                    "filename": extra.filename
                })

        # Delegate recommendations and discovery details to PlayerDiscoveryService
        from app.modules.library.services.detail.player_discovery_service import PlayerDiscoveryService
        discovery = PlayerDiscoveryService.get_playback_discovery_info(
            db=self.db,
            item=item,
            current_uid=self.overrides.user_id,
            is_adult=is_adult,
            media_type=media_type,
            match=match,
            settings_adapter=self.settings
        )

        tv_show_id = None
        tv_show_title = None
        tv_show_poster = None
        tv_show_rating = None
        season_number = None
        season_poster = None

        episode_number = None
        if match and match.media_type and match.media_type.value == "episode":
            season_number = match.season_number
            
            # Parse episode number
            current_ep = match.episode_number
            if isinstance(current_ep, list) and current_ep:
                try:
                    episode_number = int(current_ep[-1])
                except (ValueError, TypeError):
                    pass
            elif isinstance(current_ep, (int, float)):
                episode_number = int(current_ep)
            elif isinstance(current_ep, str):
                try:
                    import json
                    parsed = json.loads(current_ep)
                    if isinstance(parsed, list) and parsed:
                        episode_number = int(parsed[-1])
                    else:
                        episode_number = int(parsed)
                except Exception:
                    try:
                        episode_number = int(current_ep)
                    except (ValueError, TypeError):
                        pass

            if show_match:
                tv_show_id = f"tmdb_{show_match.external_id}"
                tv_override = self.overrides._get_or_create_override(tv_show_id, "tv")
                if tv_override:
                    tv_show_rating = tv_override.user_rating

                from app.modules.metadata.models import MetadataLocalization
                loc_show = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == show_match.id).first()
                raw_show_poster = None
                if loc_show:
                    tv_show_title = loc_show.title
                    raw_show_poster = loc_show.local_poster_path or loc_show.poster_path
                if not tv_show_title:
                    tv_show_title = show_match.original_title
                if not raw_show_poster:
                    raw_show_poster = show_match.local_poster_path or show_match.poster_path

                
                if raw_show_poster:
                    tv_show_poster = ImageServiceRegistry.get().resolve_image_url(raw_show_poster, "posters")

                # Resolve season poster
                season_match = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.TMDB,
                    MetadataMatch.parent_id == show_match.id,
                    MetadataMatch.media_type == MediaType.SEASON,
                    MetadataMatch.season_number == season_number
                ).first()
                if season_match:
                    loc_season = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == season_match.id).first()
                    raw_season_poster = None
                    if loc_season:
                        raw_season_poster = loc_season.local_poster_path or loc_season.poster_path
                    if not raw_season_poster:
                        raw_season_poster = season_match.local_poster_path or season_match.poster_path
                    
                    if raw_season_poster:
                        season_poster = ImageServiceRegistry.get().resolve_image_url(raw_season_poster, "posters")

        return {
            "file_path": item.current_path,
            "start_seconds": start_seconds,
            "title": title,
            "logo_path": logo_path,
            "media_image": media_image,
            "is_adult": is_adult,
            "media_type": media_type,
            "extras": extras_list,
            "user_rating": (
                override.user_rating 
                if (override and override.user_rating is not None) 
                else (self.overrides._get_or_create_override(str(item.id), media_type).user_rating 
                      if self.overrides._get_or_create_override(str(item.id), media_type) 
                      else None)
            ),
            "next_episode": discovery.get("next_episode"),
            "first_episode": discovery.get("first_episode"),
            "peaks_count": discovery.get("peaks_count", 0),
            "collection_next": discovery.get("collection_next"),
            "performer_unwatched": discovery.get("performer_unwatched"),
            "studio_unwatched": discovery.get("studio_unwatched"),
            "surprise_me": discovery.get("surprise_me"),
            "tv_show_id": tv_show_id,
            "tv_show_title": tv_show_title,
            "tv_show_poster": tv_show_poster,
            "tv_show_rating": tv_show_rating,
            "season_number": season_number,
            "season_poster": season_poster,
            "episode_number": episode_number,
        }

    def update_playback_progress(self, item_id: Any, current_time: int, total_length: int) -> PlaybackStatusResponse:
        try:
            item_id_int = int(item_id)
        except (ValueError, TypeError):
            item_id_int = self.playback_repo.resolve_item_id_from_external(item_id)
            if not item_id_int:
                raise NotFoundException(f"Media item not found for ID: {item_id}")

        self.library_port.save_playback_position(item_id_int, current_time, total_length, self.overrides.user_id)
        
        # Track active session for embedded/MPV players
        from app.modules.history.playback.playback_monitor import active_sessions
        active_sessions.add_active(item_id_int)

        self.db.commit()
        
        return PlaybackStatusResponse(
            status="success",
            message="Progress updated successfully",
            player_type="native",
            resume_position=current_time,
            is_watched=False
        )

    def preview_media_file(self, file_path: str, start_seconds: int = 0) -> PlaybackStatusResponse:
        from app.modules.history.playback.player_detector import launch_media_file
        if not file_path or not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"Media file not found at: {file_path}"})

        launch_result = launch_media_file(file_path, self.settings, start_seconds=start_seconds)
        player_type = launch_result.get("player_type") or "default"
        port = launch_result.get("port")
        return PlaybackStatusResponse(
            status="success",
            message=f"Launched {player_type.upper()} preview for {file_path}",
            player_type=player_type,
            port=port,
        )

    def add_watch_history_entry(self, item_id: int, watched_at_raw: Any = None):
        try:
            item = self.add_watch_history_entry_core(item_id, watched_at_raw)
            return self._watch_history_response(item)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def update_watch_history_entry(self, item_id: int, log_id: int, watched_at_raw: Any = None):
        try:
            item = self.update_watch_history_entry_core(item_id, log_id, watched_at_raw)
            return self._watch_history_response(item)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def delete_watch_history_entry(self, item_id: int, log_id: int):
        try:
            item = self.delete_watch_history_entry_core(item_id, log_id)
            return self._watch_history_response(item)
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def reset_item_progress(self, item_id: int) -> PlaybackStatusResponse:
        try:
            resume_pos, is_watched = self.reset_item_progress_core(item_id)
            return PlaybackStatusResponse(
                status="success",
                resume_position=resume_pos,
                is_watched=is_watched,
            )
        except NotFoundException as e:
            return JSONResponse(status_code=404, content={"error": str(e)})

    def get_watched_history(self, page: int = 1, limit: int = 20, include_adult: bool = False) -> WatchedHistoryResponse:
        return self.playback_logging_service.get_watched_history(
            db=self.db,
            playback_repo=self.playback_repo,
            overrides=self.overrides,
            resolve_img_fn=self._resolve_img,
            page=page,
            limit=limit,
            include_adult=include_adult
        )

    def reveal_in_explorer(self, path: str) -> PlaybackStatusResponse:
        if not path or not os.path.exists(path):
            return PlaybackStatusResponse(status="error", message=f"Path does not exist: {path}")
        
        path = os.path.abspath(path)
        try:
            if platform.system() == "Windows":
                subprocess.Popen(f'explorer /select,"{os.path.normpath(path)}"')
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", "-R", path])
            else:
                folder = os.path.dirname(path)
                subprocess.Popen(["xdg-open", folder])
            return PlaybackStatusResponse(status="success")
        except Exception as e:
            logger.error(f"Reveal failed: {e}")
            return PlaybackStatusResponse(status="error", message=str(e))

    def open_path(self, path: str) -> PlaybackStatusResponse:
        if not path or not os.path.exists(path):
            return PlaybackStatusResponse(status="error", message=f"Path does not exist: {path}")

        path = os.path.abspath(path)
        try:
            if platform.system() == "Windows":
                os.startfile(os.path.normpath(path))
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
            return PlaybackStatusResponse(status="success")
        except Exception as e:
            logger.error(f"Open path failed: {e}")
            return PlaybackStatusResponse(status="error", message=str(e))
