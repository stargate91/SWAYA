from typing import List, Optional
import math

class CreditsPrioritizer:
    @staticmethod
    def prioritize_person_credits(items: List[dict], known_for_items: List[dict], sort_by: Optional[str] = None) -> List[dict]:
        if not items:
            return []
        
        known_for_keys = {}
        for index, entry in enumerate(known_for_items or []):
            tid = entry.get("tmdb_id")
            mtype = entry.get("media_type") or entry.get("type")
            if tid:
                known_for_keys[(tid, mtype)] = index

        prioritized = []
        for entry in items:
            tid = entry.get("tmdb_id")
            mtype = entry.get("media_type") or entry.get("type")
            rank = known_for_keys.get((tid, mtype))
            is_known = rank is not None
            prioritized.append({
                **entry,
                "is_known_for": is_known,
                "known_for_rank": rank if is_known else 10**9
            })

        if sort_by == "backdrop_score":
            def get_backdrop_score(item):
                rating = float(item.get("rating_tmdb") or item.get("rating") or 0.0)
                vote_count = float(item.get("vote_count") or 0.0)
                return (rating * 100.0) + (math.log10(max(vote_count, 1.0)) * 24.0)

            prioritized.sort(
                key=lambda entry: (
                    0 if entry.get("is_known_for") else 1,
                    entry.get("known_for_rank") or 10**9,
                    0 if entry.get("in_library") else 1,
                    -get_backdrop_score(entry),
                    -(int(entry.get("year") or 0)),
                    entry.get("title", "").lower()
                )
            )
        else:
            prioritized.sort(
                key=lambda entry: (
                    -(int(entry.get("year") or 0))
                )
            )
        return prioritized
