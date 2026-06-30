import difflib
import logging
from typing import Dict, Any, Optional
from app.domains.library.models import MediaItem
from app.infrastructure.scrapers.resolver import normalize_title

logger = logging.getLogger(__name__)

class AdultConfidenceCalculator:
    def calculate_title_score(self, search_title: str, candidate_title: str) -> float:
        return difflib.SequenceMatcher(
            None,
            normalize_title(search_title),
            normalize_title(candidate_title or '')
        ).ratio()

    def evaluate_candidate_match(self, item: MediaItem, candidate: Dict[str, Any], score: float) -> Optional[str]:
        s_duration = candidate.get("duration") or candidate.get("length")
        scene_sec = None
        if s_duration not in (None, ""):
            try:
                scene_sec = float(s_duration)
            except (TypeError, ValueError) as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)

        if score >= 0.8:
            if item.duration and scene_sec is not None:
                diff = abs(float(item.duration) - scene_sec)
                if diff <= 10:
                    return "matched"
                elif diff <= 120:
                    return "uncertain"
            else:
                return "uncertain"
        elif score >= 0.5:
            if item.duration and scene_sec is not None:
                diff = abs(float(item.duration) - scene_sec)
                if diff <= 120:
                    return "uncertain"
        return None
