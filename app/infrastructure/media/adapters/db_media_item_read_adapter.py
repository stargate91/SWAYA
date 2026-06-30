from typing import List, Dict, Any, Optional
import pathlib

from app.shared_kernel.enums import ItemStatus
from app.domains.library.models import MediaItem, Library, ExtraFile

class DbMediaItemReadAdapter:
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
            "item_type": item.matches[0].media_type.value if item.matches else None,
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
