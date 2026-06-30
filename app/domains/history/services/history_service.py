import logging
from typing import Dict, Any
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.domains.history.models import ActionBatch, ActionLog
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.enums import ActionStatus, MediaType
from app.domains.history.schemas import HistoryResponse

logger = logging.getLogger(__name__)

class HistoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_history(self, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * limit
        batches = self.db.query(ActionBatch).order_by(desc(ActionBatch.created_at)).offset(offset).limit(limit + 1).all()
        
        has_more = len(batches) > limit
        if has_more:
            batches = batches[:limit]
            
        result = []
        for b in batches:
            success_count = self.db.query(ActionLog).filter(
                ActionLog.batch_id == b.id,
                ActionLog.status == ActionStatus.SUCCESS
            ).count()
            
            failed_count = self.db.query(ActionLog).filter(
                ActionLog.batch_id == b.id,
                ActionLog.status == ActionStatus.FAILED
            ).count()
            
            undone_count = self.db.query(ActionLog).filter(
                ActionLog.batch_id == b.id,
                ActionLog.status == ActionStatus.UNDONE
            ).count()
            
            movie_count = self.db.query(ActionLog).join(MediaItem, ActionLog.media_item_id == MediaItem.id).filter(
                ActionLog.batch_id == b.id,
                ActionLog.status.in_([ActionStatus.SUCCESS, ActionStatus.UNDONE])
            ).filter(
                MediaItem.matches.any(MetadataMatch.media_type == MediaType.MOVIE)
            ).count()
            
            episode_count = self.db.query(ActionLog).join(MediaItem, ActionLog.media_item_id == MediaItem.id).filter(
                ActionLog.batch_id == b.id,
                ActionLog.status.in_([ActionStatus.SUCCESS, ActionStatus.UNDONE])
            ).filter(
                MediaItem.matches.any(MetadataMatch.media_type == MediaType.EPISODE)
            ).count()
            
            extra_count = self.db.query(ActionLog).filter(
                ActionLog.batch_id == b.id,
                ActionLog.status.in_([ActionStatus.SUCCESS, ActionStatus.UNDONE]),
                ActionLog.extra_file_id != None
            ).count()
            
            is_undone = (success_count == 0) and (undone_count > 0 or failed_count == 0)
            status = "undone" if is_undone else "completed" if failed_count == 0 else "partial"
            
            logs_query = self.db.query(ActionLog).filter(ActionLog.batch_id == b.id).all()
            logs_list = [{
                "id": log.id,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "status": log.status.value,
                "error_message": log.error_message
            } for log in logs_query]
            
            result.append({
                "id": b.id,
                "name": b.name or f"Batch #{b.id}",
                "created_at": b.created_at.isoformat() + "Z",
                "success_count": success_count + undone_count,
                "failed_count": failed_count,
                "movie_count": movie_count,
                "episode_count": episode_count,
                "extra_count": extra_count,
                "remaining_count": success_count,
                "undone_count": undone_count,
                "status": status,
                "logs": logs_list
            })
            
        return HistoryResponse(
            items=result,
            page=page,
            has_more=has_more
        )
