import logging
from typing import Optional, List, Dict, Any, Tuple
from app.modules.people.helpers import select_known_for
from app.modules.people.services.filmography.prioritizer import CreditsPrioritizer
from app.core.date_utils import get_year_from_date

logger = logging.getLogger(__name__)

class CombinedFilmographyResolver:
    def __init__(self, prioritizer: CreditsPrioritizer, resolve_img_fn: Any):
        self.prioritizer = prioritizer
        self.resolve_img_fn = resolve_img_fn

    def get_combined_filmography(
        self,
        person_id: int,
        tmdb_id: Optional[str],
        ui_lang: str,
        tmdb_client: Any,
        is_adult: bool,
        known_for_department: Optional[str],
        local_movies: List[Dict[str, Any]],
        local_tv: List[Dict[str, Any]],
        local_scenes: List[Dict[str, Any]],
        person_name: Optional[str] = None,
        remote_scenes: Optional[List[Dict[str, Any]]] = None,
        sort_by: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Combines local database records with TMDB details to compile actor filmography lists."""
        if not tmdb_id:
            local_movies.sort(key=lambda x: x.get("year") or 0, reverse=True)
            local_tv.sort(key=lambda x: x.get("year") or 0, reverse=True)
            local_scenes.sort(key=lambda x: x.get("year") or 0, reverse=True)
            
            known_for = []
            if is_adult and remote_scenes:
                # We resolve image URLs for the remote scenes
                for s in remote_scenes:
                    s["poster_path"] = self.resolve_img_fn(s.get("poster_path"), "posters")
                    s["backdrop_path"] = self.resolve_img_fn(s.get("backdrop_path"), "backdrops", size="original")
                known_for = remote_scenes[:10]
                
            return local_movies, local_tv, local_scenes, known_for

        try:
            tmdb_data = tmdb_client.get_person_details(int(tmdb_id), language=ui_lang)
        except Exception as e:
            logger.error(f"Failed to fetch TMDB credits for person {person_id}: {e}")
            tmdb_data = {}

        credits_data = tmdb_data.get("combined_credits", {})
        cast_list = credits_data.get("cast", []) or []
        crew_list = credits_data.get("crew", []) or []

        local_movies_map = {m["tmdb_id"]: m for m in local_movies if m.get("tmdb_id")}
        local_tv_map = {t["tmdb_id"]: t for t in local_tv if t.get("tmdb_id")}

        combined_credits = {}
        lead_cast_order_threshold = 3

        for credit in cast_list + crew_list:
            cid = credit.get("id")
            media_type = credit.get("media_type")
            if not cid or media_type not in {"movie", "tv"}:
                continue

            key = (cid, media_type)
            
            if "character" in credit and credit["character"]:
                role = f"as {credit['character']}"
            elif "job" in credit and credit["job"]:
                role = credit["job"]
            else:
                role = "Actor" if media_type == "movie" else "Cast"

            is_lead = (
                media_type in ("movie", "tv")
                and bool(credit.get("character"))
                and isinstance(credit.get("order"), int)
                and credit["order"] <= lead_cast_order_threshold
            )

            if key not in combined_credits:
                date_str = credit.get("release_date") if media_type == "movie" else credit.get("first_air_date")
                year = get_year_from_date(date_str)

                title = credit.get("title") if media_type == "movie" else credit.get("name")
                in_library = False
                library_item_id = None

                if media_type == "movie" and cid in local_movies_map:
                    in_library = True
                    library_item_id = local_movies_map[cid]["id"]
                elif media_type == "tv" and cid in local_tv_map:
                    in_library = True
                    library_item_id = local_tv_map[cid]["id"]

                combined_credits[key] = {
                    "id": library_item_id or cid,
                    "tmdb_id": cid,
                    "title": title or "Unknown",
                    "type": "movie" if media_type == "movie" else "tv",
                    "media_type": media_type,
                    "year": year,
                    "poster_path": self.resolve_img_fn(credit.get("poster_path"), "posters"),
                    "backdrop_path": credit.get("backdrop_path"),
                    "rating": credit.get("vote_average") or 0.0,
                    "rating_tmdb": credit.get("vote_average") or 0.0,
                    "vote_count": credit.get("vote_count") or 0,
                    "popularity": credit.get("popularity") or 0.0,
                    "genre_ids": credit.get("genre_ids") or [],
                    "roles": [role],
                    "is_lead": is_lead,
                    "order": credit.get("order") if isinstance(credit.get("order"), int) else None,
                    "character": credit.get("character"),
                    "in_library": in_library,
                }
            else:
                if role and role not in combined_credits[key]["roles"]:
                    combined_credits[key]["roles"].append(role)
                if is_lead:
                    combined_credits[key]["is_lead"] = True

        parsed_movies = []
        parsed_tv = []
        ordered_credits = []

        for credit in combined_credits.values():
            serialized_credit = {
                **credit,
                "job": ", ".join(credit["roles"]),
            }
            del serialized_credit["roles"]
            serialized_credit["backdrop_path"] = self.resolve_img_fn(serialized_credit["backdrop_path"], "backdrops", size="original")
            ordered_credits.append(serialized_credit)
            if serialized_credit["media_type"] == "movie":
                parsed_movies.append(serialized_credit)
            else:
                parsed_tv.append(serialized_credit)

        matched_local_movie_ids = {c["tmdb_id"] for c in parsed_movies if c.get("tmdb_id")}
        for m in local_movies:
            if m.get("tmdb_id") and m["tmdb_id"] not in matched_local_movie_ids:
                parsed_movies.append(m)
                ordered_credits.append(m)

        matched_local_tv_ids = {c["tmdb_id"] for c in parsed_tv if c.get("tmdb_id")}
        for t in local_tv:
            if t.get("tmdb_id") and t["tmdb_id"] not in matched_local_tv_ids:
                parsed_tv.append(t)
                ordered_credits.append(t)

        known_for = select_known_for(
            ordered_credits,
            known_for_department,
            limit=10,
            adult_only=is_adult,
            person_name=person_name
        )

        parsed_movies = self.prioritizer.prioritize_person_credits(parsed_movies, known_for, sort_by=sort_by)
        parsed_tv = self.prioritizer.prioritize_person_credits(parsed_tv, known_for, sort_by=sort_by)
        local_scenes.sort(key=lambda x: x.get("year") or 0, reverse=True)

        return parsed_movies, parsed_tv, local_scenes, known_for
