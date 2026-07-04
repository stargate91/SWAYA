import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.domains.users.models import UserOverride
from app.domains.users.schemas import (
    ItemOverridesUpdate,
    BulkOverridesUpdate,
    BulkTagsUpdate,
    BulkWatchedUpdate,
)
from app.shared_kernel.ports.media_resolver import MediaResolverPort
from app.shared_kernel.ports.library_port import LibraryPort
from app.shared_kernel.ports.image_download_port import ImageDownloadPort
from app.domains.users.services.overrides.title_lock_service import TitleLockService
from app.domains.users.services.overrides.image_override_service import ImageOverrideService
from app.domains.users.services.overrides.tag_override_service import TagOverrideService
from app.domains.users.services.overrides.title_lock_reader import TitleLockReader

logger = logging.getLogger(__name__)

class OverridesService:
    def __init__(self, db: Session, resolver: MediaResolverPort, user_id: Optional[int] = None, image_downloader: Optional[ImageDownloadPort] = None, scrapers: Optional[Any] = None, mainstream_enricher: Optional[Any] = None):
        self.db = db
        self.resolver = resolver
        self.library_port: LibraryPort = resolver  # type: ignore[assignment]
        self.image_downloader = image_downloader
        if user_id is None:
            from app.shared_kernel.user_context import get_current_user_id
            user_id = get_current_user_id()
        self.user_id = user_id
        self.scrapers = scrapers
        self.mainstream_enricher = mainstream_enricher

        self.title_lock_reader = TitleLockReader(db, resolver, self.library_port, self.user_id)
        self.title_lock_service = TitleLockService(self)
        self.image_override_service = ImageOverrideService(self)
        self.tag_override_service = TagOverrideService(self)

    def _enrich_language_if_needed(self, media_item_id: int, language: str):
        if not language or language == "none":
            return
        try:
            self.library_port.enrich_item_language(media_item_id, language)
        except Exception as e:
            logger.error(f"Error enriching language {language} for item {media_item_id}: {e}")

    def _get_or_create_metadata_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        return self.title_lock_reader.get_or_create_metadata_override(item_id, media_type)

    def _get_or_create_physical_override(self, item_id: str) -> Optional[UserOverride]:
        return self.title_lock_reader.get_or_create_physical_override(item_id)

    def _get_or_create_override(self, item_id: str, media_type: Optional[str] = None) -> Optional[UserOverride]:
        return self.title_lock_reader.get_or_create_override(item_id, media_type)

    def get_or_create_media_item_override(self, media_item_id: int) -> UserOverride:
        return self.title_lock_reader.get_or_create_media_item_override(media_item_id)

    def update_item_overrides(self, request: ItemOverridesUpdate) -> Dict[str, Any]:
        return self.title_lock_service.update_item_overrides(request)

    def update_item_status(self, item_id: int, status: str) -> Dict[str, Any]:
        return self.resolver.update_item_status(item_id, status)

    def update_item_image(self, item_id: str, image_type: str, path: str, media_type: Optional[str] = None) -> Dict[str, Any]:
        return self.image_override_service.update_item_image(item_id, image_type, path, media_type=media_type)

    def handle_image_upload(self, item_id: str, image_type: str, filename: str, file_stream, media_type: Optional[str] = None) -> Dict[str, Any]:
        return self.image_override_service.handle_image_upload(item_id, image_type, filename, file_stream, media_type=media_type)

    def bulk_update(self, request: BulkOverridesUpdate) -> Dict[str, Any]:
        return self.title_lock_service.bulk_update(request)

    def bulk_tags(self, request: BulkTagsUpdate) -> Dict[str, Any]:
        return self.tag_override_service.bulk_tags(request)

    def bulk_watched(self, request: BulkWatchedUpdate) -> Dict[str, Any]:
        return self.title_lock_service.bulk_watched(request)

    def track_item(self, item_id: str, is_tracked: bool, media_type: Optional[str] = None) -> Dict[str, Any]:
        return self.title_lock_service.track_item(item_id, is_tracked, media_type=media_type)
