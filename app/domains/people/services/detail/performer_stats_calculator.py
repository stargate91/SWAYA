import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PerformerStatsCalculator:
    def format_credits_stats(self, movies: List[Any], tv: List[Any], scenes: List[Any]) -> Dict[str, Any]:
        """Calculates credit lengths and paginates initial credits listings."""
        return {
            "total_movie_credits": len(movies),
            "total_tv_credits": len(tv),
            "total_scene_credits": len(scenes),
            "initial_movie_credits_page": {"items": movies[:12], "page": 1, "page_size": 12, "total_items": len(movies), "total_pages": 1},
            "initial_tv_credits_page": {"items": tv[:12], "page": 1, "page_size": 12, "total_items": len(tv), "total_pages": 1},
            "initial_scene_credits_page": {"items": scenes[:12], "page": 1, "page_size": 12, "total_items": len(scenes), "total_pages": 1},
        }
