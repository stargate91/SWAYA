from typing import Protocol, Optional, Dict, Any
from app.shared_kernel.enums import Provider

class ScraperLogPort(Protocol):
    def log_search(
        self,
        task_id: Optional[int],
        media_item_id: Optional[int],
        provider: Provider,
        search_query: str,
        result_count: int,
        details: Dict[str, Any]
    ) -> None:
        """Logs a scraper search query and its results."""
        ...
