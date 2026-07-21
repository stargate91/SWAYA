import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.enums import Provider
from app.modules.tasks.models import ScraperLog

logger = logging.getLogger(__name__)

class DbScraperLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_search(
        self,
        task_id: Optional[int],
        media_item_id: Optional[int],
        provider: Provider,
        search_query: str,
        result_count: int,
        details: Dict[str, Any]
    ) -> None:
        try:
            log_entry = ScraperLog(
                task_id=task_id,
                media_item_id=media_item_id,
                provider=provider,
                search_query=search_query,
                result_count=result_count,
                details=details
            )
            self.db.add(log_entry)
            self.db.flush()
        except Exception as e:
            logger.warning(f"Failed to save structured scraper search log: {e}")
