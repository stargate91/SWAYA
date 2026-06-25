import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.domains.users.models import UserOverride, Tag
from app.domains.media_assets.services.images import image_processing_service
from app.application.users.schemas import (
    ItemOverridesUpdate,
    BulkOverridesUpdate,
    BulkTagsUpdate,
    BulkWatchedUpdate,
)
from app.shared_kernel.ports.media_resolver import MediaResolverPort
from app.shared_kernel.ports.library_port import LibraryPort
from app.shared_kernel.ports.image_download_port import ImageDownloadPort
from app.shared_kernel.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

class OverridesService:
    def __init__(self, db: Session, resolver: MediaResolverPort, user_id: Optional[int] = None, image_downloader: Optional[ImageDownloadPort] = None):
        self.db = db
        self.resolver = resolver
        # resolver implements both MediaResolverPort and LibraryPort
        self.library_port: LibraryPort = resolver  # type: ignore[assignment]
        self.image_downloader = image_downloader
        if user_id is None:
            from app.shared_kernel.user_context import get_current_user_id
            user_id = get_current_user_id()
        self.user_id = user_id

    def _enrich_language_if_needed(self, media_item_id: int, language: str):
        if not language or language == "none":
            return
        try:
            self.library_port.enrich_item_language(media_item_id, language)
        except Exception as e:
            logger.error(f"Error enriching language {language} for item {media_item_id}: {e}")

    def _get_or_create_metadata_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        media_item_id, metadata_match_id = self.resolver.resolve_ids(item_id, media_type)

        if not media_item_id and not metadata_match_id:
            return None

        # Try to resolve metadata_match_id from active match if only media_item_id is present
        if media_item_id and not metadata_match_id:
            metadata_match_id = self.library_port.get_active_match_id(media_item_id)

        if not metadata_match_id:
            return None

        from sqlalchemy.exc import IntegrityError

        def query_meta():
            return self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.metadata_match_id == metadata_match_id
            ).first()

        override = query_meta()
        
        # Migration: Split old overrides associated with physical media_item_id
        if not override and media_item_id:
            physical_override = self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.media_item_id == media_item_id,
                UserOverride.metadata_match_id == None
            ).first()
            if physical_override:
                try:
                    with self.db.begin_nested():
                        existing_meta = query_meta()
                        if existing_meta:
                            # Merge fields from physical override to existing metadata override
                            for field in ["custom_title", "custom_overview", "custom_poster", "custom_backdrop", "custom_logo", "custom_language", "user_rating", "user_comment", "is_favorite", "is_watched"]:
                                val = getattr(physical_override, field, None)
                                if val is not None and getattr(existing_meta, field, None) is None:
                                    setattr(existing_meta, field, val)
                            if physical_override.resume_position:
                                physical_override.custom_title = None
                                physical_override.custom_overview = None
                                physical_override.custom_poster = None
                                physical_override.custom_backdrop = None
                                physical_override.custom_logo = None
                                physical_override.custom_language = None
                                physical_override.user_rating = None
                                physical_override.user_comment = None
                                physical_override.is_favorite = False
                                physical_override.is_watched = False
                            else:
                                self.db.delete(physical_override)
                            override = existing_meta
                        else:
                            physical_override.metadata_match_id = metadata_match_id
                            if physical_override.resume_position:
                                new_physical = UserOverride(
                                    user_id=self.user_id,
                                    media_item_id=media_item_id,
                                    resume_position=physical_override.resume_position
                                )
                                self.db.add(new_physical)
                                physical_override.resume_position = 0
                            physical_override.media_item_id = None
                            override = physical_override
                        self.db.flush()
                except IntegrityError:
                    override = query_meta()
                    if override and physical_override in self.db:
                        if not physical_override.resume_position:
                            self.db.delete(physical_override)

        if not override:
            try:
                with self.db.begin_nested():
                    override = UserOverride(
                        user_id=self.user_id,
                        metadata_match_id=metadata_match_id
                    )
                    self.db.add(override)
                    self.db.flush()
            except IntegrityError:
                override = query_meta()
        return override

    def _get_or_create_physical_override(self, item_id: str) -> Optional[UserOverride]:
        media_item_id, _ = self.resolver.resolve_ids(item_id)
        if not media_item_id:
            return None

        def query_physical():
            return self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.media_item_id == media_item_id,
                UserOverride.metadata_match_id == None
            ).first()

        override = query_physical()
        if not override:
            from sqlalchemy.exc import IntegrityError
            try:
                with self.db.begin_nested():
                    override = UserOverride(
                        user_id=self.user_id,
                        media_item_id=media_item_id
                    )
                    self.db.add(override)
                    self.db.flush()
            except IntegrityError:
                override = query_physical()
        return override

    def _get_or_create_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        if isinstance(item_id, str) and item_id.startswith("collection_"):
            collection_tmdb_id = item_id.split("_")[1]
            collection_id = self.library_port.get_or_create_collection_id(collection_tmdb_id, "tmdb")
            
            def query_coll():
                return self.db.query(UserOverride).filter(
                    UserOverride.user_id == self.user_id,
                    UserOverride.collection_id == collection_id
                ).first()

            override = query_coll()
            if not override:
                from sqlalchemy.exc import IntegrityError
                try:
                    with self.db.begin_nested():
                        override = UserOverride(
                            user_id=self.user_id,
                            collection_id=collection_id
                        )
                        self.db.add(override)
                        self.db.flush()
                except IntegrityError:
                    override = query_coll()
            return override

        return self._get_or_create_metadata_override(item_id, media_type) or self._get_or_create_physical_override(item_id)

    def get_or_create_media_item_override(self, media_item_id: int) -> UserOverride:
        """Helper to fetch or create a UserOverride specifically by media_item_id (physical file)."""
        def query_override():
            return self.db.query(UserOverride).filter(
                UserOverride.user_id == self.user_id,
                UserOverride.media_item_id == media_item_id
            ).first()

        override = query_override()
        if not override:
            from sqlalchemy.exc import IntegrityError
            try:
                with self.db.begin_nested():
                    override = UserOverride(user_id=self.user_id, media_item_id=media_item_id)
                    self.db.add(override)
                    self.db.flush()
            except IntegrityError:
                override = query_override()
        return override

    def update_item_overrides(self, request: ItemOverridesUpdate) -> Dict[str, Any]:
        logger.info(f"update_item_overrides payload: {request.model_dump()}")
        item_id = request.item_id
        is_extra = request.type == 'extra'

        # Delegate all structural library mutations (extra conversion, type changes, etc.)
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
            result = self.library_port.update_library_item_type_or_hierarchy(str(item_id), payload)
            if is_extra or result.get("converted"):
                return {"status": "success", "item_id": item_id}

        media_item_id, metadata_match_id = self.resolver.resolve_ids(item_id, media_type=request.media_type)

        metadata_override = self._get_or_create_metadata_override(str(item_id), media_type=request.media_type)
        physical_override = self._get_or_create_physical_override(str(item_id))

        m_override = metadata_override or physical_override
        p_override = physical_override or metadata_override

        if not m_override:
            raise NotFoundException("Target item not found")

        # Custom text and details
        if request.custom_title is not None:
            m_override.custom_title = request.custom_title
        if request.custom_overview is not None:
            m_override.custom_overview = request.custom_overview
        
        # Language override
        language_updated = False
        if request.custom_language is not None:
            m_override.custom_language = request.custom_language
            language_updated = True
        elif request.language is not None:
            m_override.custom_language = request.language
            language_updated = True

        if media_item_id and language_updated and m_override.custom_language:
            self._enrich_language_if_needed(media_item_id, m_override.custom_language)

        # Rating, comments, favorite
        if "user_rating" in request.model_fields_set:
            m_override.user_rating = request.user_rating
            m_override.user_rating_at = datetime.now(timezone.utc) if request.user_rating is not None else None

        if "user_comment" in request.model_fields_set:
            m_override.user_comment = request.user_comment
            m_override.user_comment_at = datetime.now(timezone.utc) if request.user_comment is not None else None

        if request.is_favorite is not None:
            m_override.is_favorite = bool(request.is_favorite)
            m_override.is_favorite_at = datetime.now(timezone.utc) if m_override.is_favorite else None

        if request.is_watched is not None:
            m_override.is_watched = bool(request.is_watched)
            if m_override.is_watched:
                m_override.watch_count = max(m_override.watch_count or 0, 1)
                m_override.last_watched_at = datetime.now(timezone.utc)

        if request.resume_position is not None:
            p_override.resume_position = int(request.resume_position or 0)

        # Tags resolution
        tags_input = request.tags
        if tags_input is not None:
            tags_list = []
            for t in tags_input:
                tag_obj = None
                if isinstance(t, dict):
                    tag_id = t.get("id")
                    tag_name = t.get("name")
                    if tag_id:
                        tag_obj = self.db.query(Tag).filter(Tag.id == tag_id).first()
                    elif tag_name:
                        tag_obj = self.db.query(Tag).filter(func.lower(Tag.name) == func.lower(tag_name)).first()
                elif isinstance(t, int):
                    tag_obj = self.db.query(Tag).filter(Tag.id == t).first()
                elif isinstance(t, str):
                    tag_obj = self.db.query(Tag).filter(func.lower(Tag.name) == func.lower(t)).first()
                    if not tag_obj:
                        tag_obj = Tag(name=t)
                        self.db.add(tag_obj)
                        self.db.flush()
                if tag_obj and tag_obj not in tags_list:
                    tags_list.append(tag_obj)
            m_override.tags = tags_list

        self.db.commit()
        return {
            "status": "success",
            "item_id": item_id,
            "user_rating": m_override.user_rating if m_override else None,
            "user_comment": m_override.user_comment if m_override else None,
            "is_watched": m_override.is_watched if m_override else False,
            "is_favorite": m_override.is_favorite if m_override else False,
            "tags": [t.name for t in m_override.tags] if m_override and m_override.tags else [],
        }

    def update_item_status(self, item_id: int, status: str) -> Dict[str, Any]:
        return self.resolver.update_item_status(item_id, status)

    def update_item_image(self, item_id: str, image_type: str, path: str, media_type: Optional[str] = None) -> Dict[str, Any]:
        override = self._get_or_create_override(item_id, media_type=media_type)
        if not override:
            raise NotFoundException("Target item not found")

        if image_type not in ("poster", "backdrop", "logo"):
            raise BadRequestException(f"Invalid image type: {image_type}")

        subfolder = "posters"
        if image_type == "backdrop":
            subfolder = "backdrops"
        elif image_type == "logo":
            subfolder = "logos"

        if path and (path.startswith("/") or path.startswith(("http://", "https://"))):
            try:
                if self.image_downloader:
                    url = self.image_downloader.get_download_url(path, subfolder)
                    if url:
                        import re
                        from urllib.parse import urlparse
                        basename = os.path.basename(urlparse(path).path)
                        ext = os.path.splitext(basename)[1].lower() or ".jpg"
                        prefix = f"user_override_{override.user_id}_{item_id}"
                        safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", prefix).strip("_")
                        filename = f"{safe_prefix}_{basename}{ext}"
                        self.image_downloader.download_now(url, subfolder, filename)
                        path = f"{subfolder}/{filename}"
                else:
                    logger.warning("No image_downloader available for user override image download")
            except Exception as e:
                logger.error(f"Failed to queue image download for user override: {e}")

        if image_type == "poster":
            override.custom_poster = path
        elif image_type == "backdrop":
            override.custom_backdrop = path
        elif image_type == "logo":
            override.custom_logo = path

        self.db.commit()
        return {"status": "success", "image_type": image_type, "path": path}

    def handle_image_upload(self, item_id: str, image_type: str, filename: str, file_stream, media_type: Optional[str] = None) -> Dict[str, Any]:
        override = self._get_or_create_override(item_id, media_type=media_type)
        if not override:
            raise NotFoundException("Target item not found")

        subfolder = "posters"
        if image_type == "backdrop":
            subfolder = "backdrops"
        elif image_type == "logo":
            subfolder = "logos"

        img_service = image_processing_service
        img_service.ensure_folders()

        ext = os.path.splitext(filename)[1] or ".jpg"
        new_filename = f"upload_{uuid.uuid4().hex}{ext}"
        original_path = img_service.get_original_path(subfolder, new_filename)
        thumbnail_path = img_service.get_thumbnail_path(subfolder, new_filename)

        # Write uploaded image file stream
        saved_path = img_service.write_upload(original_path, file_stream)
        if not saved_path:
            raise BadRequestException("Failed to save uploaded image")

        # Try to generate a thumbnail
        img_service.generate_thumbnail(original_path, thumbnail_path, subfolder)

        # Store in UserOverride
        relative_path_for_db = new_filename
        if image_type == "poster":
            override.custom_poster = relative_path_for_db
        elif image_type == "backdrop":
            override.custom_backdrop = relative_path_for_db
        elif image_type == "logo":
            override.custom_logo = relative_path_for_db

        self.db.commit()
        
        # Resolve path for returning to front-end
        resolved_url = img_service.resolve_image_url(relative_path_for_db, subfolder)
        return {"status": "success", "path": relative_path_for_db, "url": resolved_url}

    def bulk_update(self, request: BulkOverridesUpdate) -> Dict[str, Any]:
        logger.info(f"bulk_update payload: {request.model_dump()}")
        item_ids = request.item_ids or []
        is_extra = request.type == 'extra'

        # 1. Apply common updates to library structure via LibraryPort
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
        
        self.library_port.bulk_update_library_items(item_ids, is_extra, library_payload)

        # 2. Update user overrides if not extra and not converting to bonus (which deletes the MediaItem)
        count = 0
        if not is_extra:
            is_converting_to_bonus = request.main_type == "bonus" and request.parent_id is not None
            if not is_converting_to_bonus:
                for item_id in item_ids:
                    m_override = self._get_or_create_metadata_override(str(item_id)) or self._get_or_create_physical_override(str(item_id))
                    if m_override:
                        language_val = request.custom_language if request.custom_language is not None else request.language
                        if language_val is not None:
                            m_override.custom_language = language_val
                            self._enrich_language_if_needed(int(item_id), language_val)
                    count += 1
            else:
                count = len(item_ids)
        else:
            count = len(item_ids)

        # 3. Apply individual item updates (e.g. auto numbering)
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
                    self.library_port.update_library_item_type_or_hierarchy(str(u_id), payload)
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
                    self.library_port.update_library_item_type_or_hierarchy(str(u_id), payload)
                    
                    if not is_converting_to_bonus:
                        m_override = self._get_or_create_metadata_override(str(u_id)) or self._get_or_create_physical_override(str(u_id))
                        if m_override:
                            language_val = u_updates.get("custom_language") if "custom_language" in u_updates else u_updates.get("language")
                            if language_val is not None:
                                m_override.custom_language = language_val
                                self._enrich_language_if_needed(int(u_id), language_val)

        self.db.commit()
        return {"status": "success", "count": count}

    def bulk_tags(self, request: BulkTagsUpdate) -> Dict[str, Any]:
        item_ids = request.item_ids or []
        tag_ids = request.tag_ids or []
        tags_input = request.tags or []
        action = request.action or "add" # 'add', 'remove', or 'set'

        if not item_ids:
            return {"status": "success", "count": 0}

        # Resolve tags first
        resolved_tags = []
        for tid in tag_ids:
            tag_obj = self.db.query(Tag).filter(Tag.id == tid).first()
            if tag_obj:
                resolved_tags.append(tag_obj)
        for tname in tags_input:
            tag_obj = self.db.query(Tag).filter(func.lower(Tag.name) == func.lower(tname)).first()
            if not tag_obj:
                tag_obj = Tag(name=tname)
                self.db.add(tag_obj)
                self.db.flush()
            if tag_obj not in resolved_tags:
                resolved_tags.append(tag_obj)

        count = 0
        for item_id in item_ids:
            override = self._get_or_create_override(str(item_id))
            if override:
                current_tags = list(override.tags)
                if action == "add":
                    for t in resolved_tags:
                        if t not in current_tags:
                            current_tags.append(t)
                elif action == "remove":
                    current_tags = [t for t in current_tags if t not in resolved_tags]
                elif action == "set":
                    current_tags = resolved_tags
                override.tags = current_tags
                count += 1

        self.db.commit()
        return {"status": "success", "count": count}

    def bulk_watched(self, request: BulkWatchedUpdate) -> Dict[str, Any]:
        item_ids = request.item_ids or []
        is_watched = bool(request.is_watched)
        watched_at = request.watched_at or request.last_watched_at
        
        parsed_date = datetime.now(timezone.utc)
        if watched_at:
            try:
                parsed_date = datetime.fromisoformat(str(watched_at).replace("Z", "+00:00"))
            except ValueError:
                pass

        if not item_ids:
            return {"status": "success", "count": 0}

        count = 0
        for item_id in item_ids:
            override = self._get_or_create_override(str(item_id))
            if override:
                override.is_watched = is_watched
                if is_watched:
                    override.watch_count = max(override.watch_count or 0, 1)
                    override.last_watched_at = parsed_date
                else:
                    override.watch_count = 0
                    override.last_watched_at = None
                count += 1

        self.db.commit()
        return {"status": "success", "count": count}

    def track_item(self, item_id: str, is_tracked: bool) -> Dict[str, Any]:
        override = self._get_or_create_override(item_id)
        if not override:
            raise NotFoundException("Target item not found")

        override.is_tracked = is_tracked
        self.db.commit()
        return {"status": "success", "item_id": item_id, "is_tracked": is_tracked}
