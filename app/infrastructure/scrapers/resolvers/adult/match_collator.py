from typing import List, Tuple, Dict, Any
from app.domains.library.models import MediaItem
from app.infrastructure.scrapers.resolvers.adult.confidence_calculator import AdultConfidenceCalculator

class AdultMatchCollator:
    def collate_candidates(
        self,
        item: MediaItem,
        all_candidates: List[Tuple[float, Dict[str, Any], str, List[Dict[str, Any]]]],
        calculator: AdultConfidenceCalculator
    ) -> Tuple[List[Tuple[float, Dict[str, Any], str, List[Dict[str, Any]]]], List[Tuple[float, Dict[str, Any], str, List[Dict[str, Any]]]]]:
        matched_candidates = []
        uncertain_candidates = []

        for score, scene, q, s in all_candidates:
            match_status = calculator.evaluate_candidate_match(item, scene, score)
            if match_status == "matched":
                matched_candidates.append((score, scene, q, s))
            elif match_status == "uncertain":
                uncertain_candidates.append((score, scene, q, s))

        return matched_candidates, uncertain_candidates
