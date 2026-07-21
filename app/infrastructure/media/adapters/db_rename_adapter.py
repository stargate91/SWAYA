from typing import List, Optional, Any

from app.core.enums import ItemStatus
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.shared_kernel.ports.rename_port import RenamePort

class DbRenameAdapter(RenamePort):
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
