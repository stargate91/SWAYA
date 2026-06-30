import logging
from typing import List, Dict, Any

from app.shared_kernel.enums import Provider, ItemStatus
from app.domains.metadata.models import MetadataMatch
from app.infrastructure.media.adapters.structure.structure_updater import StructureUpdater

logger = logging.getLogger(__name__)

class DbMediaItemStructureAdapter:
    def __init__(self):
        self.updater = StructureUpdater()

    def get_local_library_map_by_external_ids(self, provider: str, external_ids: List[str]) -> Dict[str, int]:
        """Maps external IDs from a specific provider to local media item IDs."""
        try:
            prov_enum = Provider(provider.lower())
        except ValueError:
            return {}

        matches = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == prov_enum,
            MetadataMatch.external_id.in_(external_ids),
            MetadataMatch.is_active == True
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
