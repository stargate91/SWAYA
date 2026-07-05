from typing import List, Any, Optional

from app.shared_kernel.enums import ItemStatus
from app.domains.library.models import MediaItem, Library, ExtraFile

class DbMediaItemWriteAdapter:
    def create_library(self, name: str, root_path: str) -> Any:
        new_lib = Library(name=name, root_path=root_path)
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
