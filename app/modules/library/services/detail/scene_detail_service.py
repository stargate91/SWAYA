import logging
from typing import Any, Optional
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.core.enums import Provider, MediaType
from app.modules.users.models import UserOverride
from app.modules.scrapers.support.registry import ProviderRegistry

from app.modules.metadata.models import Studio, MetadataMatch
from app.modules.library.services.detail._detail_formatter import DetailFormatter
from app.modules.library.services.detail.detail_mixins import OverrideResolver, ExternalLinksBuilder

# Sub-services
from app.modules.library.services.detail.scene.cast_builder import SceneCastBuilder
from app.modules.library.services.detail.scene.playback_resolver import ScenePlaybackResolver
from app.modules.library.services.detail.scene.metadata_syncer import SceneMetadataSyncer, _download_image_now

logger = logging.getLogger(__name__)

PROVIDER_PREFIXES = tuple(ProviderRegistry.get_all_prefixes())

def _strip_provider_prefix(value: str) -> str:
    cleaned = str(value or "")
    while "_" in cleaned:
        prefix, rest = cleaned.split("_", 1)
        if not ProviderRegistry.is_valid_prefix(prefix):
            break
        cleaned = rest
    return cleaned

class SceneDetailService(DetailFormatter):
    def __init__(self, db: Session, scrapers: Any, image_downloader: Optional[Any] = None):
        super().__init__()
        self.db = db
        self.scrapers = scrapers
        self.image_downloader = image_downloader
        self.cast_builder = SceneCastBuilder()
        self.playback_resolver = ScenePlaybackResolver()
        self.metadata_syncer = SceneMetadataSyncer()

    def get_scene_detail(self, item_id: str) -> Any:
        from app.modules.library.schemas import SceneDetailResponse
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
                from app.modules.library.models import MediaItem
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
        # Try to load scene details from the local database
        prov_enum = None
        if provider_prefix:
            prov_enum = ProviderRegistry.get_provider_by_prefix(provider_prefix)
        
        match = None
        if prov_enum:
            from sqlalchemy import or_
            match = db.query(MetadataMatch).filter(
                MetadataMatch.provider == prov_enum,
                or_(
                    MetadataMatch.external_id == scene_uuid,
                    MetadataMatch.external_id == f"scene_{scene_uuid}"
                ) if prov_enum == Provider.PORNDB else MetadataMatch.external_id == scene_uuid,
                MetadataMatch.media_type == MediaType.SCENE
            ).first()
        else:
            from sqlalchemy import or_
            match = db.query(MetadataMatch).filter(
                or_(
                    MetadataMatch.external_id == scene_uuid,
                    MetadataMatch.external_id == f"scene_{scene_uuid}"
                ),
                MetadataMatch.media_type == MediaType.SCENE
            ).first()
            if match:
                prov_enum = match.provider
            
        from app.core.cache_service import CacheService
        cache_srv = CacheService()
        effective_provider = prov_enum
        
        cache_key = f"{effective_provider.value if effective_provider else 'porndb'}_scene_{scene_uuid}"
        
        scene_data = None
        # Check permanent APICache first
        if effective_provider:
            cached_scene = cache_srv.get(effective_provider, cache_key)
            if cached_scene and isinstance(cached_scene, dict) and cached_scene.get("title"):
                scene_data = cached_scene

        if not scene_data:
            if effective_provider:
                scraper = self.scrapers.adult(effective_provider, db)
                try:
                    scene_data = scraper.fetch_scene(scene_uuid)
                    if not scene_data and effective_provider == Provider.PORNDB:
                        scene_data = scraper.fetch_scene(f"scene_{scene_uuid}")
                except Exception:
                    scene_data = None

            # Store in APICache permanently if fetched successfully
            if scene_data and effective_provider:
                cache_srv.set(
                    provider=effective_provider,
                    cache_key=cache_key,
                    raw_data=scene_data,
                    media_type=MediaType.SCENE,
                    external_id=scene_uuid,
                    ttl_seconds=None # Permanent local cache
                )
                # Synchronously download scene still, performer profiles, and studio logo before rendering
                if self.image_downloader:
                    asset_prefix = f"{effective_provider.value}_{scene_uuid}"

                    images_list = scene_data.get("images") or []
                    if images_list:
                        img_url = images_list[0].get("url") if isinstance(images_list[0], dict) else None
                        if img_url and img_url.startswith(("http://", "https://")):
                            _download_image_now(self.image_downloader, img_url, "scene_stills", asset_prefix)

                    # Download performer images — GraphQL structure: performers[].performer.images[].url
                    for p_entry in (scene_data.get("performers") or []):
                        perf = p_entry.get("performer") or p_entry
                        p_images = perf.get("images") or []
                        p_img = p_images[0].get("url") if p_images and isinstance(p_images[0], dict) else None
                        p_name = perf.get("name")
                        p_id_val = perf.get("id")
                        if p_img and p_img.startswith(("http://", "https://")) and p_name:
                            p_prefix = f"{effective_provider.value}_{p_id_val}" if (effective_provider and p_id_val) else f"person_{p_name}"
                            _download_image_now(self.image_downloader, p_img, "people", p_prefix)

                    # Download studio logo — GraphQL structure: studio.image_path or studio.images[].url
                    st_data = scene_data.get("studio") or scene_data.get("site") or {}
                    st_images = st_data.get("images") or []
                    st_logo = st_data.get("image_path") or (st_images[0].get("url") if st_images and isinstance(st_images[0], dict) else None)
                    st_name = st_data.get("name")
                    if st_logo and st_logo.startswith(("http://", "https://")) and st_name:
                        _download_image_now(self.image_downloader, st_logo, "logos", f"studio_{st_name}")

                    # Download parent/network studio logo — GraphQL structure: studio.parent.image_path or studio.parent.images[].url
                    parent_data = st_data.get("parent") or st_data.get("network") or {}
                    parent_images = parent_data.get("images") or []
                    parent_logo = parent_data.get("image_path") or (parent_images[0].get("url") if parent_images and isinstance(parent_images[0], dict) else None)
                    parent_name = parent_data.get("name")
                    if parent_logo and parent_logo.startswith(("http://", "https://")) and parent_name:
                        _download_image_now(self.image_downloader, parent_logo, "logos", f"studio_{parent_name}")

        if not scene_data and match:
            from app.core.language import LanguageService
            from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
            loc_db = LanguageService.get_best_localization(match.localizations, DEFAULT_FALLBACK_LANGUAGE)
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
                    primary_studio = match.studios[0]
                    parent_data = None
                    if primary_studio.parent_studio:
                        parent_data = {
                            "name": primary_studio.parent_studio.name,
                            "logo_path": primary_studio.parent_studio.logo_path
                        }
                    studio_data = {
                        "name": primary_studio.name,
                        "logo_path": primary_studio.logo_path,
                        "parent": parent_data
                    }
                
                images_list = [{"url": match.backdrop_path}] if match.backdrop_path else []
                if loc_db.poster_path:
                    images_list.insert(0, {"url": loc_db.poster_path})
                
                scene_data = {
                    "title": loc_db.title,
                    "date": match.release_date.isoformat()[:10] if match.release_date else None,
                    "details": loc_db.overview,
                    "images": images_list,
                    "duration": match.runtime * 60 if match.runtime else None,
                    "studio": studio_data,
                    "performers": performers,
                    "tags": [{"name": t} for t in (match.suggested_tags or [])]
                }

        
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
            if studio_name and studio_logo and studio_logo.startswith(("http://", "https://")):
                studio_db = db.query(Studio).filter(Studio.name == studio_name).first()
                if studio_db and not studio_db.logo_path:
                    studio_db.logo_path = studio_logo
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()
        
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
            if parent_name and parent_logo and parent_logo.startswith(("http://", "https://")):
                parent_studio_db = db.query(Studio).filter(Studio.name == parent_name).first()
                if parent_studio_db and not parent_studio_db.logo_path:
                    parent_studio_db.logo_path = parent_logo
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

        match_db = match or db.query(MetadataMatch).filter(
            MetadataMatch.external_id == scene_uuid,
            MetadataMatch.media_type == MediaType.SCENE
        ).first()

        if match_db and match_db.media_item_id and not item:
            from app.modules.library.models import MediaItem
            item = db.query(MediaItem).filter(MediaItem.id == match_db.media_item_id).first()

        from app.core.user_context import get_current_user_id
        current_uid = get_current_user_id() or 1

        # 1. Build performers list using CastBuilder
        cast = self.cast_builder.build_cast(
            db, match_db, scene_data, date_str, current_uid, provider_prefix, self._resolve_img
        )

        metadata_override, physical_override = OverrideResolver.resolve_overrides(
            db, current_uid, match=match_db
        )

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
            # 2b. Sync performer links so they appear in list views
            self._sync_performer_links(db, match_db, scene_data, provider_prefix)
            self._sync_studios(db, match_db, scene_data, image_downloader=self.image_downloader)

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

        is_adult_provider = False
        if provider_prefix:
            p_enum = ProviderRegistry.get_provider_by_prefix(provider_prefix)
            if p_enum:
                cfg = ProviderRegistry.get_config(p_enum)
                is_adult_provider = cfg.is_adult if cfg else False
        is_adult_val = bool(match_db.is_adult if match_db else is_adult_provider)
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
            "is_adult": is_adult_val,
            "is_favorite": effective_override.is_favorite if effective_override else False,
            "user_rating": effective_override.user_rating if effective_override else None,
            "user_comment": effective_override.user_comment if effective_override else None,
            "external_ids": {
                "stash_id": scene_uuid,
                "source": (ProviderRegistry.get_config(ProviderRegistry.resolve_prefix(provider_prefix)).prefix if ProviderRegistry.resolve_prefix(provider_prefix) else None) or provider_prefix or "stashdb",
            },
            "custom_tags": [t.name for t in effective_override.tags if t.is_adult == is_adult_val] if (effective_override and effective_override.tags) else [],
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
        
        ExternalLinksBuilder.append_links(result, result["external_ids"], "scene")
        return SceneDetailResponse(**result)

    def _get_sibling_matches(self, db: Session, match_db: MetadataMatch) -> list:
        from app.modules.metadata.models import MetadataMatch
        from app.core.enums import MediaType
        if not match_db or match_db.media_type != MediaType.SCENE:
            return [match_db] if match_db else []
        
        clean_id = str(match_db.external_id)
        if clean_id.startswith("scene_"):
            clean_id = clean_id.split("_", 1)[1]
            
        candidates = [clean_id, f"scene_{clean_id}"]
        siblings = db.query(MetadataMatch).filter(
            MetadataMatch.media_type == MediaType.SCENE,
            MetadataMatch.external_id.in_(candidates)
        ).all()
        return siblings

    def _sync_performer_links(self, db: Session, match_db: MetadataMatch, scene_data: dict, provider_prefix: str):
        """Ensure performer links exist in the DB for this match so list views can display them."""
        from app.modules.people.models import Person, MediaPersonLink, ExternalSourceLink
        from app.core.enums import RoleType

        performers = scene_data.get("performers") or []
        if not performers:
            return

        sibling_matches = self._get_sibling_matches(db, match_db)
        for target_match in sibling_matches:
            existing_person_ids = {link.person_id for link in target_match.people_links}

            from app.modules.scrapers.support.registry import ProviderRegistry
            prov_enum = ProviderRegistry.resolve_prefix(provider_prefix)

            order = 0
            for p_entry in performers:
                perf = p_entry.get("performer") or p_entry
                perf_name = perf.get("name")
                if not perf_name:
                    continue

                person_db = None
                perf_ext_id = perf.get("id")
                if perf_ext_id and prov_enum:
                    link = db.query(ExternalSourceLink).filter(
                        ExternalSourceLink.provider == prov_enum,
                        ExternalSourceLink.external_id == str(perf_ext_id)
                    ).first()
                    if link:
                        person_db = link.person

                if not person_db:
                    person_db = db.query(Person).filter(Person.name == perf_name).first()

                if not person_db:
                    # Create the performer
                    gender_str = str(perf.get("gender") or "").upper()
                    mapped_gender = 0
                    if "FEMALE" in gender_str:
                        mapped_gender = 1
                    elif "MALE" in gender_str:
                        mapped_gender = 2
                    elif gender_str:
                        mapped_gender = 3
                    
                    p_images = perf.get("images") or []
                    p_img = p_images[0].get("url") if p_images else (perf.get("image") or perf.get("profile_path"))
                    
                    person_db = Person(
                        name=perf_name,
                        is_adult=True,
                        known_for_department="Acting",
                        is_active=False,
                        profile_path=p_img,
                        gender=mapped_gender,
                        popularity=perf.get("rating_porndb") or 0,
                        rating_porndb=perf.get("rating_porndb"),
                        scene_count=perf.get("scene_count"),
                        external_ids={
                            provider_prefix: str(perf_ext_id) if perf_ext_id else "",
                            f"{provider_prefix}_id": str(perf_ext_id) if perf_ext_id else "",
                            "source": provider_prefix
                        } if provider_prefix else {}
                    )
                    db.add(person_db)
                    db.flush()
                    
                    if perf_ext_id and prov_enum:
                        link = ExternalSourceLink(
                            person_id=person_db.id,
                            provider=prov_enum,
                            external_id=str(perf_ext_id),
                            profile_url=p_img
                        )
                        db.add(link)
                        db.flush()

                if person_db.id in existing_person_ids:
                    order += 1
                    continue

                new_link = MediaPersonLink(
                    match_id=target_match.id,
                    person_id=person_db.id,
                    role=RoleType.ACTOR,
                    order=order
                )
                db.add(new_link)
                existing_person_ids.add(person_db.id)
                order += 1

        try:
            db.commit()
        except Exception as e:
            logger.debug(f"Failed to sync performer links: {e}")
            db.rollback()

    def _sync_studios(self, db: Session, match_db: MetadataMatch, scene_data: dict, image_downloader: Optional[Any] = None):
        """Ensure studios exist in the DB and are linked to the match."""
        from app.modules.metadata.models import Studio
        from app.modules.library.services.detail.scene.metadata_syncer import _queue_image

        studio_data = scene_data.get("studio") or scene_data.get("site") or {}
        studio_name = studio_data.get("name")
        if not studio_name:
            return

        studio_images = studio_data.get("images") or []
        studio_logo = studio_images[0].get("url") if studio_images else (studio_data.get("logo") or studio_data.get("image") or studio_data.get("poster"))

        parent_data = studio_data.get("parent") or studio_data.get("network") or {}
        parent_name = parent_data.get("name")
        parent_images = parent_data.get("images") or []
        parent_logo = parent_images[0].get("url") if parent_images else (parent_data.get("logo") or parent_data.get("image") or parent_data.get("poster"))

        try:
            studio_db = db.query(Studio).filter(Studio.name == studio_name).first()
            if not studio_db:
                studio_db = Studio(name=studio_name, logo_path=studio_logo)
                db.add(studio_db)
                db.flush()

            # Queue studio logo and only write to DB if the file is already downloaded
            if image_downloader and studio_db.logo_path and studio_db.logo_path.startswith(("http://", "https://")):
                local_logo = _queue_image(image_downloader, studio_db.logo_path, "logos", f"studio_{studio_name}")
                if local_logo:
                    from app.modules.media_assets.services.images.image_path_resolver import get_original_path, exists
                    from app.modules.media_assets.services.images import image_processing_service
                    
                    image_root = image_processing_service.image_root
                    filename = local_logo.split("/")[-1]
                    if exists(get_original_path(image_root, "logos", filename)):
                        studio_db.logo_path = local_logo

            if parent_name:
                parent_studio_db = db.query(Studio).filter(Studio.name == parent_name).first()
                if not parent_studio_db:
                    parent_studio_db = Studio(name=parent_name, logo_path=parent_logo)
                    db.add(parent_studio_db)
                    db.flush()

                # Queue parent studio logo
                if image_downloader and parent_studio_db.logo_path and parent_studio_db.logo_path.startswith(("http://", "https://")):
                    local_parent_logo = _queue_image(image_downloader, parent_studio_db.logo_path, "logos", f"studio_{parent_name}")
                    if local_parent_logo:
                        from app.modules.media_assets.services.images.image_path_resolver import get_original_path, exists
                        from app.modules.media_assets.services.images import image_processing_service
                        
                        image_root = image_processing_service.image_root
                        filename = local_parent_logo.split("/")[-1]
                        if exists(get_original_path(image_root, "logos", filename)):
                            parent_studio_db.logo_path = local_parent_logo

                studio_db.parent_studio_id = parent_studio_db.id

            sibling_matches = self._get_sibling_matches(db, match_db)
            for target_match in sibling_matches:
                if studio_db not in target_match.studios:
                    target_match.studios.append(studio_db)
            db.commit()
        except Exception as e:
            logger.debug(f"Failed to sync studio: {e}")
            db.rollback()
