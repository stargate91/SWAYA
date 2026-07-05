from typing import Set, List, Optional, Any

from app.shared_kernel.enums import Provider, MediaType, ItemStatus
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.ports.scan_port import ScanPort

class DbScanAdapter(ScanPort):
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
                logger.debug(f"Swallowed exception in infrastructure/media/adapters/db_scan_adapter.py:27: {e}", exc_info=True)

        library_match_ids = {r[0] for r in query.all()}
        
        parent_ids = set()
        parent_query = self.db.query(MetadataMatch.parent_id).join(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).filter(MediaItem.status.in_(lib_statuses), MetadataMatch.parent_id != None)

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
                logger.debug(f"Swallowed exception in infrastructure/media/adapters/db_scan_adapter.py:48: {e}", exc_info=True)

        current_parents = {r[0] for r in parent_query.all()}
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents), MetadataMatch.parent_id != None
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
                    logger.debug(f"Swallowed exception in infrastructure/media/adapters/db_scan_adapter.py:69: {e}", exc_info=True)
            elif isinstance(s, ItemStatus):
                status_enums.append(s)
            
        matched_match_ids = {
            m.id for m in self.db.query(MetadataMatch).join(MediaItem).filter(
                MediaItem.status.in_(status_enums)
            ).filter(MetadataMatch.is_active == True).all()
        }

        # Traverse parent IDs to include TV show and season matches
        parent_ids = set()
        current_parents = {
            m.parent_id for m in self.db.query(MetadataMatch).join(MediaItem).filter(
                MediaItem.status.in_(status_enums)
            ).filter(MetadataMatch.is_active == True, MetadataMatch.parent_id != None).all()
        }
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents), MetadataMatch.parent_id != None
                ).all()
            }
            
        all_valid_match_ids = list(matched_match_ids.union(parent_ids))
        return all_valid_match_ids

    def get_active_match_id(self, media_item_id: int) -> Optional[int]:
        active_match = self.db.query(MetadataMatch).filter(
            MetadataMatch.media_item_id == media_item_id,
            MetadataMatch.is_active == True
        ).first()
        return active_match.id if active_match else None

    def get_metadata_match_ids_for_media_items(self, item_ids: List[int]) -> List[int]:
        matches = self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id.in_(item_ids)).all()
        return [m.id for m in matches]

    def get_items_for_scan_retry(self, scan_mode: Any) -> List[Any]:
        review_statuses = [ItemStatus.NO_MATCH, ItemStatus.UNCERTAIN, ItemStatus.MULTIPLE, ItemStatus.ERROR]
        all_items = self.db.query(MediaItem).filter(MediaItem.status.in_(review_statuses)).all()
        
        items_to_retry = []
        for item in all_items:
            item_scan_mode = (item.parsed_info or {}).get("scan_mode") or ""
            from app.shared_kernel.enums import ScanMode
            if scan_mode == ScanMode.SCENES:
                match = (item_scan_mode == "scenes")
            elif scan_mode == ScanMode.MOVIES_TV:
                match = (item_scan_mode in {"", "movies_tv", "porndb_movie"})
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
            from app.infrastructure.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
            enricher = MainstreamEnricher(self.db)
            enricher.enrich_matched_item(item, language=language)
        except Exception as e:
            from app.infrastructure.media.db_media_resolver import logger
            logger.error(f"Error enriching language {language} for item {item.id}: {e}")
