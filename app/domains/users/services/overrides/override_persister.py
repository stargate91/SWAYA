import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.domains.metadata.models import MetadataMatch
from app.domains.users.schemas import (
    ItemOverridesUpdate,
    BulkOverridesUpdate,
    BulkWatchedUpdate,
)
from app.shared_kernel.exceptions import NotFoundException
from app.domains.users.services.overrides.lock_validator import LockValidator

logger = logging.getLogger(__name__)

class OverridePersister:
    def __init__(self):
        self.validator = LockValidator()

    def update_item_overrides(
        self,
        db: Session,
        resolver: Any,
        library_port: Any,
        title_lock_reader: Any,
        enrich_language_fn: Any,
        track_item_fn: Any,
        request: ItemOverridesUpdate
    ) -> Dict[str, Any]:
        """Saves custom override values for a single media item, updating its database representation."""
        item_id = request.item_id
        is_extra = request.type == 'extra'

        if is_extra or request.main_type in ("bonus", "movie", "episode", "scene"):
            payload = {
                "type": request.type,
                "main_type": request.main_type,
                "parent_id": request.parent_id,
                "subtype": request.subtype,
                "language": request.language,
                "season": request.season,
                "episode": request.episode,
                "custom_language": request.custom_language,
                "custom_edition": request.custom_edition,
                "custom_audio_type": request.custom_audio_type,
                "custom_source": request.custom_source,
                "reset_match": request.reset_match,
                "media_type": request.media_type,
            }
            result = library_port.update_library_item_type_or_hierarchy(str(item_id), payload)
            if result.get("converted") and result.get("new_item_id"):
                item_id = result["new_item_id"]
            elif is_extra or result.get("converted"):
                return {"status": "success", "item_id": item_id}

        media_item_id, metadata_match_id = resolver.resolve_ids(item_id, media_type=request.media_type)

        metadata_override = title_lock_reader.get_or_create_metadata_override(str(item_id), media_type=request.media_type)
        physical_override = title_lock_reader.get_or_create_physical_override(str(item_id))

        m_override = metadata_override or physical_override
        p_override = physical_override or metadata_override

        if not m_override:
            raise NotFoundException("Target item not found")

        if request.custom_title is not None:
            m_override.custom_title = request.custom_title
        if request.custom_overview is not None:
            m_override.custom_overview = request.custom_overview
        
        language_updated = False
        if request.custom_language is not None:
            m_override.custom_language = request.custom_language
            language_updated = True
        elif request.language is not None:
            m_override.custom_language = request.language
            language_updated = True

        if media_item_id and language_updated and m_override.custom_language:
            enrich_language_fn(media_item_id, m_override.custom_language)

        has_active_interaction = False
        if "user_rating" in request.model_fields_set:
            if m_override.set_rating(request.user_rating):
                has_active_interaction = True

        if "user_comment" in request.model_fields_set:
            if m_override.set_comment(request.user_comment):
                has_active_interaction = True

        if request.is_favorite is not None:
            if m_override.set_favorite(request.is_favorite):
                has_active_interaction = True

        if request.is_watched is not None:
            is_watched_val = bool(request.is_watched)
            if is_watched_val:
                m_override.is_watched = True
                m_override.watch_count = max(m_override.watch_count or 0, 1)
                has_active_interaction = True
                self._track_parent_tv_show_if_episode(db, str(item_id), media_item_id, metadata_match_id, track_item_fn)
                if media_item_id:
                    from app.domains.history.models import PlaybackLog
                    from app.domains.library.models import MediaItem
                    from datetime import datetime, timezone
                    item = db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
                    duration = item.duration if (item and item.duration) else 0
                    has_completed = False
                    logs = db.query(PlaybackLog).filter(PlaybackLog.media_item_id == media_item_id).all()
                    for log in logs:
                        if duration > 0 and log.position_seconds / duration >= 0.90:
                            has_completed = True
                            break
                        elif duration == 0 and log.position_seconds > 0:
                            has_completed = True
                            break
                    if not has_completed:
                        new_log = PlaybackLog(
                            media_item_id=media_item_id,
                            user_id=m_override.user_id,
                            watched_at=datetime.now(timezone.utc),
                            position_seconds=duration if duration > 0 else 1
                        )
                        db.add(new_log)
            else:
                m_override.is_watched = False
                m_override.watch_count = 0
                m_override.last_watched_at = None
                if media_item_id:
                    from app.domains.history.models import PlaybackLog
                    db.query(PlaybackLog).filter(PlaybackLog.media_item_id == media_item_id).delete()

        if has_active_interaction:
            m_override.is_tracked = True

        if request.resume_position is not None:
            p_override.resume_position = int(request.resume_position or 0)

        tags_input = request.tags
        if tags_input is not None:
            is_adult_item = self.validator.resolve_item_is_adult(db, media_item_id, metadata_match_id)
            m_override.tags = self.validator.resolve_tags(db, tags_input, is_adult_item)
            m_override.is_tracked = True

        db.commit()
        return {
            "status": "success",
            "item_id": item_id,
            "user_rating": m_override.user_rating if m_override else None,
            "user_comment": m_override.user_comment if m_override else None,
            "is_watched": m_override.is_watched if m_override else False,
            "is_favorite": m_override.is_favorite if m_override else False,
            "tags": [t.name for t in m_override.tags] if m_override and m_override.tags else [],
        }

    def bulk_update(
        self,
        db: Session,
        library_port: Any,
        title_lock_reader: Any,
        enrich_language_fn: Any,
        request: BulkOverridesUpdate
    ) -> Dict[str, Any]:
        """Applies bulk user override updates across multiple items."""
        item_ids = request.item_ids or []
        is_extra = request.type == 'extra'

        library_payload = {
            "parent_id": request.parent_id,
            "subtype": request.subtype,
            "language": request.language,
            "main_type": request.main_type,
            "season": request.season,
            "episode": request.episode,
            "reset_match": request.reset_match,
            "custom_edition": request.custom_edition,
            "custom_audio_type": request.custom_audio_type,
            "custom_source": request.custom_source,
            "custom_language": request.custom_language if request.custom_language is not None else request.language,
        }
        
        library_port.bulk_update_library_items(item_ids, is_extra, library_payload)

        count = 0
        if not is_extra:
            is_converting_to_bonus = request.main_type == "bonus" and request.parent_id is not None
            if not is_converting_to_bonus:
                for item_id in item_ids:
                    m_override = title_lock_reader.get_or_create_metadata_override(str(item_id)) or title_lock_reader.get_or_create_physical_override(str(item_id))
                    if m_override:
                        language_val = request.custom_language if request.custom_language is not None else request.language
                        if language_val is not None:
                            m_override.custom_language = language_val
                            enrich_language_fn(int(item_id), language_val)
                    count += 1
            else:
                count = len(item_ids)
        else:
            count = len(item_ids)

        if request.item_updates:
            for it_up in request.item_updates:
                u_id = it_up.get("id")
                u_updates = it_up.get("updates") or {}
                if not u_id:
                    continue
                
                if is_extra:
                    payload = {
                        "type": "extra",
                        "parent_id": u_updates.get("parent_id"),
                        "subtype": u_updates.get("subtype"),
                        "language": u_updates.get("language"),
                    }
                    library_port.update_library_item_type_or_hierarchy(str(u_id), payload)
                else:
                    is_converting_to_bonus = u_updates.get("main_type") == "bonus" and u_updates.get("parent_id") is not None
                    
                    payload = {
                        "type": "media_item",
                        "main_type": u_updates.get("main_type"),
                        "parent_id": u_updates.get("parent_id"),
                        "custom_edition": u_updates.get("custom_edition"),
                        "custom_audio_type": u_updates.get("custom_audio_type"),
                        "custom_source": u_updates.get("custom_source"),
                        "season": u_updates.get("season"),
                        "episode": u_updates.get("episode"),
                        "reset_match": u_updates.get("reset_match") or request.reset_match,
                        "custom_language": u_updates.get("custom_language") or u_updates.get("language"),
                    }
                    library_port.update_library_item_type_or_hierarchy(str(u_id), payload)
                    
                    if not is_converting_to_bonus:
                        m_override = title_lock_reader.get_or_create_metadata_override(str(u_id)) or title_lock_reader.get_or_create_physical_override(str(u_id))
                        if m_override:
                            language_val = u_updates.get("custom_language") if "custom_language" in u_updates else u_updates.get("language")
                            if language_val is not None:
                                m_override.custom_language = language_val
                                enrich_language_fn(int(u_id), language_val)

        db.commit()
        return {"status": "success", "count": count}

    def bulk_watched(
        self,
        db: Session,
        title_lock_reader: Any,
        track_item_fn: Any,
        request: BulkWatchedUpdate
    ) -> Dict[str, Any]:
        """Toggles watched status in bulk across multiple items."""
        item_ids = request.item_ids or []
        is_watched = bool(request.is_watched)
        watched_at = request.watched_at or request.last_watched_at
        
        parsed_date = self.validator.parse_watched_date(watched_at)

        if not item_ids:
            return {"status": "success", "count": 0}

        # Pre-resolve overrides and find associated media_item_ids to bulk-check PlaybackLogs
        overrides_map = {}
        media_item_ids = []
        for item_id in item_ids:
            override = title_lock_reader.get_or_create_override(str(item_id))
            if override:
                overrides_map[item_id] = override
                if override.media_item_id:
                    media_item_ids.append(override.media_item_id)

        from app.domains.history.models import PlaybackLog
        has_playback_log = set()
        if media_item_ids:
            logs = db.query(PlaybackLog.media_item_id).filter(PlaybackLog.media_item_id.in_(media_item_ids)).all()
            has_playback_log = {log[0] for log in logs}

        tracked_parent_ids = set()
        count = 0
        for item_id in item_ids:
            override = overrides_map.get(item_id)
            if override:
                # Skip changing status if the item has a real play-button playback history
                if override.media_item_id in has_playback_log:
                    continue

                if is_watched:
                    if override.is_watched:
                        continue
                    override.is_watched = True
                    override.watch_count = max(override.watch_count or 0, 1)
                    if watched_at:
                        override.last_watched_at = parsed_date
                    override.is_tracked = True
                    self._track_parent_tv_show_if_episode(db, str(item_id), override.media_item_id, override.metadata_match_id, track_item_fn, tracked_parent_ids)
                else:
                    override.is_watched = False
                    override.watch_count = 0
                    override.last_watched_at = None
                    if override.media_item_id:
                        from app.domains.history.models import PlaybackLog
                        db.query(PlaybackLog).filter(PlaybackLog.media_item_id == override.media_item_id).delete()
                count += 1

        db.commit()
        return {"status": "success", "count": count}

    def track_item(
        self,
        db: Session,
        scrapers: Any,
        mainstream_enricher: Any,
        title_lock_reader: Any,
        item_id: str,
        is_tracked: bool,
        media_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Flags an override as tracked and launches auto-enrichment processes."""
        override = title_lock_reader.get_or_create_override(item_id, media_type=media_type)
        if not override:
            raise NotFoundException("Target item not found")

        override.is_tracked = is_tracked
        
        if is_tracked:
            media_type = None
            match_id = override.metadata_match_id
            match = None
            if match_id:
                match = db.query(MetadataMatch).filter(MetadataMatch.id == match_id).first()
                if match:
                    m_type = match.media_type
                    media_type = m_type.value if hasattr(m_type, "value") else str(m_type)
            
            scraper_gateway = scrapers
            if scraper_gateway:
                if media_type == 'scene':
                    from app.domains.library.services.detail.scene_detail_service import SceneDetailService
                    try:
                        SceneDetailService(db, scraper_gateway).get_scene_detail(item_id)
                    except Exception as e:
                        logger.error(f"Auto-enrich failed for scene {item_id}: {e}")
                elif media_type == 'tv':
                    from app.domains.library.services.detail.tv_detail_service import TvDetailService
                    try:
                        TvDetailService(db, scraper_gateway).get_library_tv_detail(item_id)
                    except Exception as e:
                        logger.error(f"Auto-enrich failed for tv {item_id}: {e}")
                elif media_type == 'movie':
                    from app.domains.library.services.detail.movie_detail_service import MovieDetailService
                    try:
                        MovieDetailService(db, scraper_gateway).get_library_item_detail(item_id)
                    except Exception as e:
                        logger.error(f"Auto-enrich failed for movie {item_id}: {e}")

            if match and not match.is_adult and mainstream_enricher:
                try:
                    mainstream_enricher(db).enrich_match(match, commit=True)
                except Exception as e:
                    logger.error(f"Mainstream auto-enrich failed for tracked match {match_id}: {e}")

        db.commit()
        return {"status": "success", "item_id": item_id, "is_tracked": is_tracked}

    def _track_parent_tv_show_if_episode(
        self,
        db: Session,
        item_id: str,
        media_item_id: Optional[int],
        metadata_match_id: Optional[int],
        track_item_fn: Any,
        tracked_parent_ids: Optional[set] = None
    ):
        tv_tmdb_id = None
        if isinstance(item_id, str) and item_id.startswith("tmdb_"):
            parts = item_id.split("_")
            if len(parts) >= 3:
                tv_tmdb_id = parts[1]
        
        if not tv_tmdb_id:
            from app.shared_kernel.enums import MediaType
            match = None
            if metadata_match_id:
                match = db.query(MetadataMatch).filter(MetadataMatch.id == metadata_match_id).first()
            elif media_item_id:
                match = db.query(MetadataMatch).filter(
                    MetadataMatch.media_item_id == media_item_id
                ).first()
            
            if match and match.media_type == MediaType.EPISODE:
                season_match = db.query(MetadataMatch).filter(MetadataMatch.id == match.parent_id).first()
                if season_match:
                    series_match = db.query(MetadataMatch).filter(MetadataMatch.id == season_match.parent_id).first()
                    if series_match and series_match.media_type == MediaType.TV:
                        tv_tmdb_id = series_match.external_id

        if tv_tmdb_id:
            tv_show_id = f"tmdb_{tv_tmdb_id}"
            if tracked_parent_ids is not None:
                if tv_show_id in tracked_parent_ids:
                    return
                tracked_parent_ids.add(tv_show_id)
            try:
                track_item_fn(tv_show_id, True)
            except Exception as e:
                logger.error(f"Auto-enrich/track for parent TV show {tv_show_id} failed: {e}")
