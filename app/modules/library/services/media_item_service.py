from typing import Tuple, Optional, Dict, Any, List, Set
import logging
import pathlib
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.enums import Provider, MediaType, ItemStatus
from app.modules.library.models import MediaItem, Library, ExtraFile
from app.modules.metadata.models import MetadataMatch, MediaCollection
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)


class MediaItemService:
    def __init__(self, db: Session):
        self.db = db
        from app.modules.library.services.structure_updater import StructureUpdater
        self.updater = StructureUpdater()

    # --- Core Methods ---
    def resolve_ids(self, item_id: str, media_type: Optional[str] = None) -> Tuple[Optional[int], Optional[int]]:
        media_item_id = None
        metadata_match_id = None

        if isinstance(item_id, str) and item_id.startswith("tmdb_"):
            parts = item_id.split("_")
            if len(parts) >= 4:
                # TV Episode format: tmdb_{tv_id}_{season}_{episode}
                tv_id = parts[1]
                season_num = int(parts[2])
                episode_num = int(parts[3])
                
                # 1. TV show match
                tv_match = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.TMDB,
                    MetadataMatch.external_id == tv_id,
                    MetadataMatch.media_type == MediaType.TV
                ).first()
                if not tv_match:
                    tv_match = MetadataMatch(provider=Provider.TMDB, external_id=tv_id, media_type=MediaType.TV)
                    self.db.add(tv_match)
                    self.db.flush()
                
                # 2. Season match
                season_match = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.TMDB,
                    MetadataMatch.parent_id == tv_match.id,
                    MetadataMatch.media_type == MediaType.SEASON,
                    MetadataMatch.season_number == season_num
                ).first()
                if not season_match:
                    season_match = MetadataMatch(
                        provider=Provider.TMDB,
                        external_id=f"{tv_id}-s{season_num}",
                        media_type=MediaType.SEASON,
                        season_number=season_num,
                        parent_id=tv_match.id
                    )
                    self.db.add(season_match)
                    self.db.flush()
                
                # 3. Episode match
                all_season_episodes = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.TMDB,
                    MetadataMatch.parent_id == season_match.id,
                    MetadataMatch.media_type == MediaType.EPISODE
                ).all()
                
                episode_match = None
                for m in all_season_episodes:
                    if m.episode_number == episode_num:
                        episode_match = m
                        break
                    elif isinstance(m.episode_number, list) and episode_num in m.episode_number:
                        episode_match = m
                        break
                    elif isinstance(m.episode_number, str):
                        import json
                        try:
                            parsed_ep = json.loads(m.episode_number)
                            if isinstance(parsed_ep, list) and episode_num in parsed_ep:
                                episode_match = m
                                break
                            elif parsed_ep == episode_num:
                                episode_match = m
                                break
                        except Exception:
                            if str(episode_num) == m.episode_number:
                                episode_match = m
                                break
                if not episode_match:
                    episode_match = MetadataMatch(
                        provider=Provider.TMDB,
                        external_id=tv_id,
                        media_type=MediaType.EPISODE,
                        season_number=season_num,
                        episode_number=episode_num,
                        parent_id=season_match.id
                    )
                    self.db.add(episode_match)
                    self.db.flush()
                
                metadata_match_id = episode_match.id
                media_item_id = episode_match.media_item_id
            else:
                tmdb_id = parts[1]
                query = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.TMDB,
                    MetadataMatch.external_id == tmdb_id
                )
                if media_type:
                    try:
                        resolved_type = MediaType(media_type.lower())
                    except ValueError:
                        resolved_type = MediaType.TV if media_type.lower() == 'tv' else MediaType.MOVIE
                    query = query.filter(MetadataMatch.media_type == resolved_type)
                
                match = query.first()
                
                # When multiple matches share the same external_id (e.g. TV shows
                # and their episodes), prefer the parent type over episodes
                if match and match.media_type == MediaType.EPISODE and not media_type:
                    preferred = self.db.query(MetadataMatch).filter(
                        MetadataMatch.provider == Provider.TMDB,
                        MetadataMatch.external_id == tmdb_id,
                        MetadataMatch.media_type.in_([MediaType.TV, MediaType.MOVIE])
                    ).first()
                    if preferred:
                        match = preferred
                
                if not match:
                    resolved_type = MediaType.MOVIE
                    if media_type:
                        try:
                            resolved_type = MediaType(media_type.lower())
                        except ValueError:
                            if media_type.lower() == 'tv':
                                resolved_type = MediaType.TV
                    # Create a placeholder match record to link the override to
                    match = MetadataMatch(provider=Provider.TMDB, external_id=tmdb_id, media_type=resolved_type, is_adult=False)
                    self.db.add(match)
                    self.db.flush()
                metadata_match_id = match.id
                media_item_id = match.media_item_id
        elif isinstance(item_id, str) and "_" in item_id:
            from app.modules.scrapers.support.registry import ProviderRegistry
            try:
                if item_id.startswith("scene_"):
                    scene_id = item_id.split("_", 1)[1]
                    match = self.db.query(MetadataMatch).filter(
                        MetadataMatch.external_id == scene_id,
                        MetadataMatch.media_type.in_([MediaType.SCENE, MediaType.VIDEO]),
                        MetadataMatch.media_item_id.isnot(None)
                    ).first()
                    if not match:
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.external_id == scene_id,
                            MetadataMatch.media_type.in_([MediaType.SCENE, MediaType.VIDEO])
                        ).first()
                    
                    if not match and not scene_id.startswith("scene_"):
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.external_id == f"scene_{scene_id}",
                            MetadataMatch.media_type.in_([MediaType.SCENE, MediaType.VIDEO]),
                            MetadataMatch.media_item_id.isnot(None)
                        ).first()
                        if not match:
                            match = self.db.query(MetadataMatch).filter(
                                MetadataMatch.external_id == f"scene_{scene_id}",
                                MetadataMatch.media_type.in_([MediaType.SCENE, MediaType.VIDEO])
                            ).first()
                    
                    if not match:
                        adult_providers = ProviderRegistry.get_adult_providers()
                        provider = adult_providers[0] if adult_providers else Provider.STASHDB
                        match = MetadataMatch(
                            provider=provider,
                            external_id=scene_id,
                            media_type=MediaType.SCENE,
                            is_adult=True
                        )
                        self.db.add(match)
                        self.db.flush()
                else:
                    provider, scene_id = ProviderRegistry.clean_id(item_id)
                    config = ProviderRegistry.get_config(provider)
                    is_adult = config.is_adult if config else False
                    
                    default_adult_type = next((t for t in MediaType if t.is_adult), MediaType.SCENE)
                    resolved_media_type = default_adult_type if is_adult else MediaType.MOVIE
                    if media_type:
                        try:
                            resolved_media_type = MediaType(media_type.lower())
                        except ValueError:
                            if media_type.lower() == 'movie':
                                resolved_media_type = MediaType.MOVIE
                            elif media_type.lower() == 'tv':
                                resolved_media_type = MediaType.TV
     
                    if is_adult:
                        types = [MediaType.SCENE, MediaType.VIDEO]
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.provider == provider,
                            MetadataMatch.external_id == scene_id,
                            MetadataMatch.media_type.in_(types),
                            MetadataMatch.media_item_id.isnot(None)
                        ).first()
                        if not match:
                            match = self.db.query(MetadataMatch).filter(
                                MetadataMatch.provider == provider,
                                MetadataMatch.external_id == scene_id,
                                MetadataMatch.media_type.in_(types)
                            ).first()
                    else:
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.provider == provider,
                            MetadataMatch.external_id == scene_id,
                            MetadataMatch.media_type == resolved_media_type
                        ).first()
     
                    if not match:
                        match = MetadataMatch(
                            provider=provider, 
                            external_id=scene_id, 
                            media_type=resolved_media_type,
                            is_adult=is_adult
                        )
                        self.db.add(match)
                        self.db.flush()
                metadata_match_id = match.id
                media_item_id = match.media_item_id
            except ValueError:
                pass
        else:
            if item_id is None:
                return None, None
            is_numeric = False
            possible_id = None
            try:
                possible_id = int(item_id)
                is_numeric = True
            except (ValueError, TypeError) as e:
                try:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
                except Exception:
                    pass
                pass
 
            if is_numeric and self.db.query(MediaItem).filter(MediaItem.id == possible_id).count() > 0:
                media_item_id = possible_id
            else:
                match = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == Provider.TMDB,
                    MetadataMatch.external_id == str(item_id)
                ).first()
                if match:
                    metadata_match_id = match.id
                    media_item_id = match.media_item_id
                elif media_type and media_type.lower() in ('tv', 'movie'):
                    try:
                        resolved_type = MediaType(media_type.lower())
                    except ValueError:
                        resolved_type = MediaType.TV if media_type.lower() == 'tv' else MediaType.MOVIE
                    match = MetadataMatch(
                        provider=Provider.TMDB,
                        external_id=str(item_id),
                        media_type=resolved_type,
                        is_adult=False
                    )
                    self.db.add(match)
                    self.db.flush()
                    metadata_match_id = match.id
                    media_item_id = match.media_item_id
                else:
                    return None, None
 
        return media_item_id, metadata_match_id

    def update_item_status(self, item_id: int, status: str) -> Dict[str, Any]:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Item not found")
 
        try:
            new_status = ItemStatus(status.lower())
        except ValueError:
            from app.core.exceptions import BadRequestException
            raise BadRequestException(f"Invalid status: {status}")
 
        if new_status == ItemStatus.IGNORED and item.status != ItemStatus.IGNORED:
            item.ignored_previous_status = item.status
            item.ignored_at = datetime.now(timezone.utc)
        elif new_status != ItemStatus.IGNORED:
            item.ignored_previous_status = None
            item.ignored_at = None
 
        item.status = new_status
        self.db.commit()
        return {"status": "success", "item_id": item_id, "new_status": item.status.value}

    # --- Collections ---
    def get_or_create_collection_id(self, external_id: str, provider: str = "tmdb") -> int:
        try:
            prov_enum = Provider(provider.lower())
        except ValueError:
            prov_enum = Provider.TMDB

        collection = self.db.query(MediaCollection).filter(
            MediaCollection.provider == prov_enum,
            MediaCollection.external_id == external_id
        ).first()
        if not collection:
            collection = MediaCollection(
                provider=prov_enum,
                external_id=external_id
            )
            self.db.add(collection)
            self.db.flush()
        return collection.id

    # --- Media Item Read ---
    def get_ignored_items(self, search: str = "", offset: int = 0, limit: int = 40) -> Dict[str, Any]:
        query = self.db.query(MediaItem).filter(MediaItem.status == ItemStatus.IGNORED)
        if search:
            pattern = f"%{search}%"
            query = query.filter(MediaItem.filename.ilike(pattern))
            
        total = query.count()
        items = query.order_by(MediaItem.ignored_at.desc()).offset(offset).limit(limit).all()
        
        serialized = [{
            "id": item.id,
            "filename": item.filename,
            "current_path": item.current_path,
            "item_type": (item.matches[0].media_type.value if hasattr(item.matches[0].media_type, "value") else item.matches[0].media_type) if item.matches else None,
            "status": item.status.value,
            "ignored_at": item.ignored_at.isoformat() if item.ignored_at else None,
        } for item in items]
        
        return {
            "items": serialized,
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": offset + len(items) < total,
        }

    def get_all_libraries(self) -> List[Any]:
        return self.db.query(Library).all()

    def get_item_by_id(self, item_id: int) -> Optional[Any]:
        return self.db.query(MediaItem).filter(MediaItem.id == item_id).first()

    def get_extra_by_id(self, extra_id: int) -> Optional[Any]:
        return self.db.query(ExtraFile).filter(ExtraFile.id == extra_id).first()

    def get_item_by_relative_path(self, relative_path: str) -> Optional[Any]:
        return self.db.query(MediaItem).filter(MediaItem.relative_path == relative_path).first()

    def get_item_by_absolute_path(self, absolute_path: str) -> Optional[Any]:
        target_path = pathlib.Path(absolute_path).resolve()
        for item in self.db.query(MediaItem).all():
            if pathlib.Path(item.current_path).resolve() == target_path:
                return item
        return None

    # --- Media Item Structure ---
    def get_local_library_map_by_external_ids(self, provider: str, external_ids: List[str]) -> Dict[str, int]:
        """Maps external IDs from a specific provider to local media item IDs."""
        try:
            prov_enum = Provider(provider.lower())
        except ValueError:
            return {}

        matches = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == prov_enum,
            MetadataMatch.external_id.in_(external_ids),
            MetadataMatch.is_active
        ).all()
        
        local_map = {}
        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]
        for m in matches:
            item = m.media_item
            if item and item.status in lib_statuses:
                local_map[m.external_id] = item.id
        return local_map

    def update_library_item_type_or_hierarchy(self, item_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Updates a single library item's type, parent, custom metadata attributes or sub-hierarchy."""
        return self.updater.update_library_item_type_or_hierarchy(
            db=self.db,
            item_id=item_id,
            payload=payload,
            resolve_ids_fn=self.resolve_ids
        )

    def bulk_update_library_items(self, item_ids: List[str], is_extra: bool, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Performs bulk updates for media item custom attributes, genres, types, or parent assignments."""
        return self.updater.bulk_update_library_items(
            db=self.db,
            item_ids=item_ids,
            is_extra=is_extra,
            payload=payload
        )

    # --- Media Item Write ---
    def create_library(
        self,
        name: str,
        root_path: str,
        target_media_types: Optional[List[str]] = None,
        providers: Optional[List[str]] = None,
        is_adult: bool = False
    ) -> Any:
        new_lib = Library(
            name=name,
            root_path=root_path,
            target_media_types=target_media_types,
            providers=providers,
            is_adult=is_adult
        )
        self.db.add(new_lib)
        self.db.commit()
        return new_lib

    def set_item_status(self, item_id: int, status: Any) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if item:
            item.status = status
            self.db.commit()

    def delete_item(self, item_id: int) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if item:
            self.db.delete(item)
            self.db.flush()

    def delete_extra(self, extra_id: int) -> None:
        extra = self.db.query(ExtraFile).filter(ExtraFile.id == extra_id).first()
        if extra:
            self.db.delete(extra)
            self.db.flush()

    def update_item_path_and_status(self, item_id: int, path: str, status: Any) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if item:
            item.current_path = path
            item.status = status
            self.db.flush()

    def update_extra_path(self, extra_id: int, path: str) -> None:
        extra = self.db.query(ExtraFile).filter(ExtraFile.id == extra_id).first()
        if extra:
            extra.current_path = path
            self.db.flush()

    def update_custom_media_item_fields(self, item_id: int, edition: Optional[str] = None, audio_type: Optional[str] = None, source: Optional[str] = None) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if item:
            item.custom_edition = edition
            item.custom_audio_type = audio_type
            item.custom_source = source
            self.db.flush()

    def restore_ignored_items(self, item_ids: List[int]) -> int:
        items = self.db.query(MediaItem).filter(MediaItem.id.in_(item_ids), MediaItem.status == ItemStatus.IGNORED).all()
        for item in items:
            item.status = item.ignored_previous_status or ItemStatus.NEW
            item.ignored_previous_status = None
            item.ignored_at = None
        self.db.commit()
        return len(items)

    def repair_inconsistent_matched_items(self) -> int:
        inconsistent_items = self.db.query(MediaItem).filter(
            MediaItem.status.in_([ItemStatus.MATCHED, ItemStatus.ORGANIZED, ItemStatus.RENAMED])
        ).all()
        repaired_count = 0
        for item in inconsistent_items:
            if not item.matches:
                item.status = ItemStatus.NEW
                repaired_count += 1
        if repaired_count > 0:
            self.db.commit()
        return repaired_count

    # --- Person Overrides ---
    def get_person_user_override(self, user_id: int, person_id: int) -> Optional[Dict[str, Any]]:
        override = self.db.query(UserOverride).filter(
            UserOverride.user_id == user_id,
            UserOverride.person_id == person_id
        ).first()
        if not override:
            return None
        return {
            "id": override.id,
            "user_id": override.user_id,
            "person_id": override.person_id,
            "custom_poster": override.custom_poster,
            "custom_backdrop": override.custom_backdrop,
            "is_favorite": override.is_favorite,
            "user_rating": override.user_rating,
            "user_comment": override.user_comment,
            "custom_tags": [t.name for t in override.tags] if override.tags else [],
        }

    def update_person_user_override(
        self,
        user_id: int,
        person_id: int,
        custom_poster: Optional[str] = None,
        custom_backdrop: Optional[str] = None,
        update_poster: bool = False,
        update_backdrop: bool = False,
    ) -> None:
        override = self.db.query(UserOverride).filter(
            UserOverride.user_id == user_id,
            UserOverride.person_id == person_id
        ).first()
        if not override:
            override = UserOverride(user_id=user_id, person_id=person_id)
            self.db.add(override)
        
        if update_poster:
            override.custom_poster = custom_poster
        if update_backdrop:
            override.custom_backdrop = custom_backdrop
            
        self.db.commit()

    # --- Playback ---
    def save_playback_position(self, item_id: int, current_time: int, total_length: int, user_id: int) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if item:
            if total_length > 0:
                item.duration = total_length
            override = self.db.query(UserOverride).filter(
                UserOverride.user_id == user_id, 
                UserOverride.media_item_id == item_id
            ).first()
            if not override:
                override = UserOverride(user_id=user_id, media_item_id=item_id)
                self.db.add(override)
            
            # Find the latest playback log to update
            from app.modules.history.models import PlaybackLog
            log = self.db.query(PlaybackLog).filter(
                PlaybackLog.media_item_id == item_id,
                PlaybackLog.user_id == user_id
            ).order_by(PlaybackLog.watched_at.desc()).first()
            
            override.resume_position = current_time
            override.last_watched_at = datetime.now(timezone.utc)
            if log:
                log.position_seconds = current_time
                
            if total_length > 0 and current_time / total_length > 0.90:
                if not override.is_watched:
                    override.is_watched = True
                    override.watch_count = (override.watch_count or 0) + 1
                override.resume_position = 0
                if log:
                    log.position_seconds = total_length
            self.db.flush()

    # --- Rename ---
    def get_items_for_renaming(self, item_ids: Optional[List[int]] = None) -> List[Any]:
        from sqlalchemy.orm import joinedload
        query = self.db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MetadataMatch.localizations),
            joinedload(MediaItem.extras),
            joinedload(MediaItem.overrides)
        ).filter(MediaItem.status == ItemStatus.MATCHED)
        if item_ids is not None:
            query = query.filter(MediaItem.id.in_(item_ids))
        return query.all()

    def relink_relations_for_collision(self, target_item_id: int, source_item_id: int) -> None:
        from app.modules.users.models import CustomListItem
        list_items = self.db.query(CustomListItem).filter(CustomListItem.media_item_id == target_item_id).all()
        for li in list_items:
            li.media_item_id = source_item_id

        target_item = self.db.query(MediaItem).filter(MediaItem.id == target_item_id).first()
        source_item = self.db.query(MediaItem).filter(MediaItem.id == source_item_id).first()
        if target_item and source_item:
            for log in target_item.playback_logs:
                log.media_item_id = source_item_id

            new_extra_paths = {e.relative_path for e in source_item.extras}
            for ext in target_item.extras:
                if ext.relative_path not in new_extra_paths:
                    ext.media_item_id = source_item_id
        self.db.flush()

    def log_rename_action(self, batch_id: int, item_id: Optional[int], extra_id: Optional[int], action_type: Any, status: Any, old_val: Optional[str], new_val: Optional[str], error: Optional[str] = None) -> None:
        from app.modules.history.models import ActionLog
        log = ActionLog(
            batch_id=batch_id,
            media_item_id=item_id,
            extra_file_id=extra_id,
            action_type=action_type,
            status=status,
            old_value=old_val,
            new_value=new_val,
            error_message=error
        )
        self.db.add(log)
        self.db.flush()

    def get_action_logs_for_undo(self, batch_id: int) -> List[Any]:
        from app.modules.history.models import ActionLog
        from app.core.enums import ActionStatus
        return self.db.query(ActionLog).filter(
            ActionLog.batch_id == batch_id,
            ActionLog.status == ActionStatus.SUCCESS
        ).order_by(ActionLog.id.desc()).all()

    def update_action_log_status(self, log_id: int, status: Any, error: Optional[str] = None) -> None:
        from app.modules.history.models import ActionLog
        log = self.db.query(ActionLog).filter(ActionLog.id == log_id).first()
        if log:
            log.status = status
            if error is not None:
                log.error_message = error
            self.db.flush()

    def create_action_batch(self, name: str) -> int:
        from app.modules.history.models import ActionBatch
        batch = ActionBatch(name=name)
        self.db.add(batch)
        self.db.flush()
        return batch.id

    def get_siblings_by_group_hash(self, group_hash: str, exclude_item_id: int) -> List[Any]:
        return self.db.query(MediaItem).filter(
            MediaItem.group_hash == group_hash,
            MediaItem.id != exclude_item_id,
            MediaItem.status == ItemStatus.MATCHED,
        ).all()

    # --- Scan ---
    def get_active_match_ids(self, media_type: Optional[str] = None, provider: Optional[str] = None) -> Set[int]:
        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]
        
        query = self.db.query(MetadataMatch.id).join(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).filter(MediaItem.status.in_(lib_statuses))

        if media_type == "movie":
            query = query.filter(MetadataMatch.media_type == MediaType.MOVIE)
        elif media_type == "scene":
            query = query.filter(MetadataMatch.media_type == MediaType.SCENE)
        elif media_type == "tv_or_episode":
            query = query.filter(MetadataMatch.media_type.in_([MediaType.TV, MediaType.EPISODE]))

        if provider:
            try:
                prov_enum = Provider(provider.lower())
                query = query.filter(MetadataMatch.provider == prov_enum)
            except ValueError as e:
                logger.debug(f"Swallowed exception in modules/library/media_repository.py:608: {e}", exc_info=True)

        library_match_ids = {r[0] for r in query.all()}
        
        parent_ids = set()
        parent_query = self.db.query(MetadataMatch.parent_id).join(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).filter(MediaItem.status.in_(lib_statuses), MetadataMatch.parent_id.isnot(None))

        if media_type == "movie":
            parent_query = parent_query.filter(MetadataMatch.media_type == MediaType.MOVIE)
        elif media_type == "scene":
            parent_query = parent_query.filter(MetadataMatch.media_type == MediaType.SCENE)
        elif media_type == "tv_or_episode":
            parent_query = parent_query.filter(MetadataMatch.media_type.in_([MediaType.TV, MediaType.EPISODE]))

        if provider:
            try:
                prov_enum = Provider(provider.lower())
                parent_query = parent_query.filter(MetadataMatch.provider == prov_enum)
            except ValueError as e:
                logger.debug(f"Swallowed exception in modules/library/media_repository.py:629: {e}", exc_info=True)

        current_parents = {r[0] for r in parent_query.all()}
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents), MetadataMatch.parent_id.isnot(None)
                ).all()
            }
            
        all_valid_match_ids = library_match_ids.union(parent_ids)
        return all_valid_match_ids

    def get_matched_match_ids(self, statuses: List[str]) -> List[int]:
        status_enums = []
        for s in statuses:
            if isinstance(s, str):
                try:
                    status_enums.append(ItemStatus(s.lower()))
                except ValueError as e:
                    logger.debug(f"Swallowed exception in modules/library/media_repository.py:650: {e}", exc_info=True)
            elif isinstance(s, ItemStatus):
                status_enums.append(s)
            
        matched_match_ids = {
            m.id for m in self.db.query(MetadataMatch).join(MediaItem).filter(
                MediaItem.status.in_(status_enums)
            ).filter(MetadataMatch.is_active).all()
        }

        # Traverse parent IDs to include TV show and season matches
        parent_ids = set()
        current_parents = {
            m.parent_id for m in self.db.query(MetadataMatch).join(MediaItem).filter(
                MediaItem.status.in_(status_enums)
            ).filter(MetadataMatch.is_active, MetadataMatch.parent_id.isnot(None)).all()
        }
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents), MetadataMatch.parent_id.isnot(None)
                ).all()
            }
            
        all_valid_match_ids = list(matched_match_ids.union(parent_ids))
        return all_valid_match_ids

    def get_active_match_id(self, media_item_id: int) -> Optional[int]:
        active_match = self.db.query(MetadataMatch).filter(
            MetadataMatch.media_item_id == media_item_id,
            MetadataMatch.is_active
        ).first()
        return active_match.id if active_match else None

    def get_metadata_match_ids_for_media_items(self, item_ids: List[int]) -> List[int]:
        matches = self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id.in_(item_ids)).all()
        result_ids = set(m.id for m in matches)
        for m in matches:
            curr = m
            while curr and curr.parent_id:
                result_ids.add(curr.parent_id)
                curr = self.db.get(MetadataMatch, curr.parent_id)
        return list(result_ids)

    def get_items_for_scan_retry(self, scan_mode: Any) -> List[Any]:
        review_statuses = [ItemStatus.NO_MATCH, ItemStatus.UNCERTAIN, ItemStatus.MULTIPLE, ItemStatus.ERROR]
        all_items = self.db.query(MediaItem).filter(MediaItem.status.in_(review_statuses)).all()
        
        items_to_retry = []
        for item in all_items:
            item_scan_mode = (item.parsed_info or {}).get("scan_mode") or ""
            from app.core.enums import ScanMode
            if scan_mode == ScanMode.SCENES:
                match = (item_scan_mode == "scenes")
            elif scan_mode == ScanMode.MOVIES_TV:
                match = (item_scan_mode in {"", "movies_tv"})
            else:
                match = (item_scan_mode == scan_mode.value)
            
            if match:
                items_to_retry.append(item)
        return items_to_retry

    def reset_items_for_retry(self, item_ids: List[int]) -> None:
        if not item_ids:
            return
        items = self.db.query(MediaItem).filter(MediaItem.id.in_(item_ids)).all()
        for item in items:
            item.status = ItemStatus.NEW
            self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).delete()
        self.db.commit()

    def enrich_item_language(self, item_id: int, language: str) -> None:
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item or not language or language == "none":
            return
        
        active_match = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
        if not active_match or not active_match.provider:
            return
            
        try:
            from app.modules.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
            enricher = MainstreamEnricher(self.db)
            enricher.enrich_matched_item(item, language=language)
        except Exception as e:
            logger.error(f"Error enriching language {language} for item {item.id}: {e}")