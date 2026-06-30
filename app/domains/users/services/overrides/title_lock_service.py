import logging
from typing import Dict, Any

from app.domains.users.schemas import (
    ItemOverridesUpdate,
    BulkOverridesUpdate,
    BulkWatchedUpdate,
)
from app.domains.users.services.overrides.override_persister import OverridePersister

logger = logging.getLogger(__name__)

class TitleLockService:
    def __init__(self, parent_service):
        self.service = parent_service
        self.persister = OverridePersister()

    @property
    def db(self):
        return self.service.db

    @property
    def resolver(self):
        return self.service.resolver

    @property
    def library_port(self):
        return self.service.library_port

    @property
    def scrapers(self):
        return self.service.scrapers

    @property
    def mainstream_enricher(self):
        return self.service.mainstream_enricher

    def update_item_overrides(self, request: ItemOverridesUpdate) -> Dict[str, Any]:
        """Saves custom override values for a single media item, updating its database representation."""
        return self.persister.update_item_overrides(
            db=self.db,
            resolver=self.resolver,
            library_port=self.library_port,
            title_lock_reader=self.service.title_lock_reader,
            enrich_language_fn=self.service._enrich_language_if_needed,
            track_item_fn=self.track_item,
            request=request
        )

    def bulk_update(self, request: BulkOverridesUpdate) -> Dict[str, Any]:
        """Applies bulk user override updates across multiple items."""
        return self.persister.bulk_update(
            db=self.db,
            library_port=self.library_port,
            title_lock_reader=self.service.title_lock_reader,
            enrich_language_fn=self.service._enrich_language_if_needed,
            request=request
        )

    def bulk_watched(self, request: BulkWatchedUpdate) -> Dict[str, Any]:
        """Toggles watched status in bulk across multiple items."""
        return self.persister.bulk_watched(
            db=self.db,
            title_lock_reader=self.service.title_lock_reader,
            track_item_fn=self.track_item,
            request=request
        )

    def track_item(self, item_id: str, is_tracked: bool) -> Dict[str, Any]:
        """Flags an override as tracked and launches auto-enrichment processes."""
        return self.persister.track_item(
            db=self.db,
            scrapers=self.scrapers,
            mainstream_enricher=self.mainstream_enricher,
            title_lock_reader=self.service.title_lock_reader,
            item_id=item_id,
            is_tracked=is_tracked
        )
