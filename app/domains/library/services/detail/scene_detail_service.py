import logging
from typing import Any
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.shared_kernel.enums import Provider, MediaType
from app.domains.users.models import UserOverride
from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.domains.metadata.models import Studio, MetadataMatch
from app.domains.library.services.detail._detail_formatter import DetailFormatter

# Sub-services
from app.domains.library.services.detail.scene.cast_builder import SceneCastBuilder
from app.domains.library.services.detail.scene.playback_resolver import ScenePlaybackResolver
from app.domains.library.services.detail.scene.metadata_syncer import SceneMetadataSyncer

logger = logging.getLogger(__name__)

PROVIDER_PREFIXES = ("stashdb", "stash", "fansdb", "porndb", "theporndb", "scene", "movie")

def _strip_provider_prefix(value: str) -> str:
    cleaned = str(value or "")
    while "_" in cleaned:
        prefix, rest = cleaned.split("_", 1)
        if prefix.lower() not in PROVIDER_PREFIXES:
            break
        cleaned = rest
    return cleaned


class SceneDetailService(DetailFormatter):
    def __init__(self, db: Session, scrapers: ScraperGatewayPort):
        super().__init__()
        self.db = db
        self.scrapers = scrapers
        self.cast_builder = SceneCastBuilder()
        self.playback_resolver = ScenePlaybackResolver()
        self.metadata_syncer = SceneMetadataSyncer()

    def get_scene_detail(self, item_id: str) -> Any:
        from app.domains.library.schemas import SceneDetailResponse
        db = self.db
        
        print(f"[DEBUG] SceneDetailService.get_scene_detail called with item_id={item_id}")
        provider_prefix = None
        item = None
        if "_" in item_id:
            parts = item_id.split("_", 1)
            provider_prefix = parts[0].lower()
            scene_uuid = _strip_provider_prefix(parts[1])
        else:
            if str(item_id).isdigit():
                from app.domains.library.models import MediaItem
                item = db.query(MediaItem).filter(MediaItem.id == int(item_id)).first()
                if item:
                    match_db = db.query(MetadataMatch).filter(
                        MetadataMatch.media_item_id == item.id,
                        MetadataMatch.media_type == MediaType.SCENE
                    ).first()
                    if match_db:
                        p_val = match_db.provider.value if hasattr(match_db.provider, "value") else str(match_db.provider)
                        provider_prefix = p_val.lower()
                        scene_uuid = match_db.external_id
                    else:
                        scene_uuid = item_id
                else:
                    scene_uuid = item_id
            else:
                scene_uuid = item_id

        print(f"[DEBUG] SceneDetailService.get_scene_detail: resolved provider_prefix={provider_prefix}, scene_uuid={scene_uuid}")
        import re
        is_uuid = bool(re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", scene_uuid))
        scene_data = None

        if provider_prefix in ("stashdb", "stash"):
            stash_scraper = self.scrapers.adult(Provider.STASHDB, db)
            scene_data = stash_scraper.fetch_scene(scene_uuid)
        elif provider_prefix == "fansdb":
            fans_scraper = self.scrapers.adult(Provider.FANSDB, db)
            scene_data = fans_scraper.fetch_scene(scene_uuid)
        elif provider_prefix in ("porndb", "theporndb"):
            porndb_scraper = self.scrapers.adult(Provider.PORNDB, db)
            scene_data = porndb_scraper.fetch_scene(scene_uuid)
        else:
            if is_uuid:
                stash_scraper = self.scrapers.adult(Provider.STASHDB, db)
                scene_data = stash_scraper.fetch_scene(scene_uuid)
                if not scene_data:
                    fans_scraper = self.scrapers.adult(Provider.FANSDB, db)
                    scene_data = fans_scraper.fetch_scene(scene_uuid)
            else:
                porndb_scraper = self.scrapers.adult(Provider.PORNDB, db)
                scene_data = porndb_scraper.fetch_scene(scene_uuid)
        
        print(f"[DEBUG] SceneDetailService.get_scene_detail fetch_scene result: success={bool(scene_data)}")
        if not scene_data:
            return JSONResponse(status_code=404, content={"error": "Scene not found on StashDB/FansDB/PornDB"})
        
        title = scene_data.get("title") or "Unknown Scene"
        images = scene_data.get("images") or []
        poster_url = images[0].get("url") if images else None
        
        date_str = scene_data.get("date")
        year = None
        if date_str:
            try:
                year = int(date_str.split("-")[0])
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        
        duration_raw = scene_data.get("duration")
        duration_sec = None
        duration_str = None
        
        if duration_raw:
            if isinstance(duration_raw, (int, float)):
                duration_sec = int(duration_raw)
            elif isinstance(duration_raw, str):
                val = duration_raw.strip()
                if val.isdigit():
                    duration_sec = int(val)
                elif "." in val and val.replace(".", "", 1).isdigit():
                    duration_sec = int(float(val))
                elif ":" in val:
                    parts = val.split(":")
                    try:
                        if len(parts) == 2:
                            duration_sec = int(parts[0]) * 60 + int(parts[1])
                        elif len(parts) == 3:
                            duration_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    except ValueError as e:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)

        if duration_sec:
            duration_min = duration_sec // 60
            if duration_min > 0:
                duration_str = f"{duration_min} min"
        
        studio_data = scene_data.get("studio") or scene_data.get("site") or {}
        studio_name = studio_data.get("name")
        
        studio_logo = None
        if studio_name:
            studio_db = db.query(Studio).filter(Studio.name == studio_name).first()
            if studio_db:
                studio_logo = studio_db.logo_path
        
        if not studio_logo:
            studio_images = studio_data.get("images") or []
            studio_logo = studio_images[0].get("url") if studio_images else (studio_data.get("logo") or studio_data.get("image") or studio_data.get("poster"))
        
        parent_data = studio_data.get("parent") or studio_data.get("network") or {}
        parent_name = parent_data.get("name")
        
        parent_logo = None
        if parent_name:
            parent_studio_db = db.query(Studio).filter(Studio.name == parent_name).first()
            if parent_studio_db:
                parent_logo = parent_studio_db.logo_path
                
        if not parent_logo:
            parent_images = parent_data.get("images") or []
            parent_logo = parent_images[0].get("url") if parent_images else (parent_data.get("logo") or parent_data.get("image") or parent_data.get("poster"))

        match_db = db.query(MetadataMatch).filter(
            MetadataMatch.external_id == scene_uuid,
            MetadataMatch.media_type == MediaType.SCENE
        ).first()

        if match_db and match_db.media_item_id and not item:
            from app.domains.library.models import MediaItem
            item = db.query(MediaItem).filter(MediaItem.id == match_db.media_item_id).first()

        from app.shared_kernel.user_context import get_current_user_id
        current_uid = get_current_user_id() or 1

        # 1. Build performers list using CastBuilder
        cast = self.cast_builder.build_cast(
            db, match_db, scene_data, date_str, current_uid, provider_prefix, self._resolve_img
        )

        metadata_override = None
        if match_db:
            metadata_override = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.metadata_match_id == match_db.id
            ).first()

        physical_override = None
        if match_db and match_db.media_item_id:
            physical_override = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.media_item_id == match_db.media_item_id
            ).first()

        override = metadata_override or physical_override
        if not override:
            override = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.custom_title == title
            ).first()
        
        ext_background = scene_data.get("background")
        if isinstance(ext_background, dict):
            ext_background = ext_background.get("full") or ext_background.get("large") or ext_background.get("medium")
        if not ext_background:
            ext_background = scene_data.get("image") or poster_url

        # 2. Sync metadata via MetadataSyncer
        if match_db:
            self.metadata_syncer.sync_metadata(
                db, match_db, title, scene_data, poster_url, ext_background, date_str
            )

        local_poster = override.custom_poster if override else None
        local_backdrop = override.custom_backdrop if override else None
        
        if match_db:
            if not local_backdrop:
                local_backdrop = match_db.local_backdrop_path or match_db.backdrop_path
            loc_db = next((x for x in match_db.localizations if x.locale == "en"), None)
            if loc_db:
                if not local_poster:
                    local_poster = loc_db.local_poster_path or loc_db.poster_path
            
        poster_resolved = self._resolve_img(local_poster or poster_url, "posters")
        backdrop_resolved = self._resolve_img(local_backdrop or ext_background, "backdrops", size="original")

        # 3. Resolve playback details using PlaybackResolver
        is_watched, watch_count, resume_position, last_watched_str, playback_logs, peaks_count, peaks_history = \
            self.playback_resolver.resolve_playback_and_peaks(
                db, match_db, metadata_override, override, physical_override, current_uid
            )

        effective_override = metadata_override if metadata_override else override

        technical = None
        if item:
            technical = {
                "resolution": item.resolution,
                "video_codec": item.video_codec,
                "audio_codec": item.audio_codec,
                "audio_channels": item.audio_channels,
                "hdr_type": item.hdr_type,
                "bit_depth": item.bit_depth,
                "framerate": item.framerate,
                "duration": item.duration,
                "size_bytes": item.size,
                "source": item.source.value if hasattr(item.source, "value") else str(item.source),
                "edition": item.edition.value if hasattr(item.edition, "value") else str(item.edition),
                "audio_type": item.audio_type.value if hasattr(item.audio_type, "value") else str(item.audio_type),
            }

        result = {
            "id": f"scene_{scene_uuid}",
            "title": title,
            "keywords": [],
            "trailer_key": None,
            "logo_path": self._resolve_img(override.custom_logo if (override and override.custom_logo) else (studio_logo or parent_logo), "logos"),
            "original_poster_path": poster_url,
            "original_backdrop_path": poster_url,
            "original_title": None,
            "tagline": None,
            "overview": scene_data.get("details"),
            "genres": [],
            "year": year,
            "release_date": date_str,
            "runtime": duration_sec,
            "formatted_duration": duration_str,
            "rating_tmdb": 0.0,
            "vote_count_tmdb": 0,
            "companies": [{"name": studio_name, "logo_path": self._resolve_img(studio_logo, "logos")}] if studio_name else [],
            "networks": [{"name": parent_name, "logo_path": self._resolve_img(parent_logo, "logos")}] if parent_name else [],
            "poster_path": poster_resolved,
            "backdrop_path": backdrop_resolved,
            "original_language": None,
            "type": "scene",
            "technical": technical,
            "cast": cast,
            "cast_total": len(cast),
            "people_complete": True,
            "directors": [],
            "writers": [],
            "is_adult": True,
            "is_favorite": effective_override.is_favorite if effective_override else False,
            "user_rating": effective_override.user_rating if effective_override else None,
            "user_comment": effective_override.user_comment if effective_override else None,
            "external_ids": {
                "stash_id": scene_uuid,
                "source": provider_prefix or "stash",
            },
            "custom_tags": [t.name for t in effective_override.tags if t.is_adult] if (effective_override and effective_override.tags) else [],
            "suggested_tags": [t.get("name") for t in scene_data.get("tags") or [] if t.get("name")] if scene_data.get("tags") else (match_db.suggested_tags if (match_db and match_db.suggested_tags) else []),
            "tags": [],
            "is_tracked": effective_override.is_tracked if effective_override else False,
            "watch_count": watch_count,
            "is_watched": is_watched,
            "resume_position": resume_position,
            "last_watched_at": last_watched_str,
            "playback_logs": playback_logs,
            "in_library": match_db is not None and match_db.media_item_id is not None,
            "library_item_id": match_db.media_item_id if match_db else None,
            "peaks_count": peaks_count,
            "peaks_history": peaks_history,
        }
        
        from app.domains.library.services.detail.external_links import generate_external_links
        result["external_links"] = generate_external_links(result["external_ids"], "scene")
        return SceneDetailResponse(**result)
