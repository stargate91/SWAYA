import logging
from typing import Any, List, Dict, Tuple
from sqlalchemy.orm import Session

from app.modules.library.services.detail.formatters.base import BaseCreditsFormatter

logger = logging.getLogger(__name__)

class TvCreditsFormatter(BaseCreditsFormatter):
    def format_credits(
        self,
        db: Session,
        tmdb_data: Dict[str, Any],
        current_uid: int,
        resolve_img_fn: Any
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Processes and formats TV show cast and crew credits."""
        tv_credits = tmdb_data.get("aggregate_credits", {}) or tmdb_data.get("credits", {})
        cast = []
        directors = []
        writers = []
        sound = []

        person_ids = set()
        for creator in tmdb_data.get("created_by", []) or []:
            if creator.get("id"):
                person_ids.add(str(creator["id"]))
        for actor in tv_credits.get("cast", []):
            if actor.get("id"):
                person_ids.add(str(actor["id"]))
        for crew in tmdb_data.get("credits", {}).get("crew", []):
            if crew.get("id"):
                person_ids.add(str(crew["id"]))

        from app.modules.people.helpers import query_local_profiles_by_tmdb_ids
        local_profiles = query_local_profiles_by_tmdb_ids(db, person_ids, current_uid)
        first_air_date = tmdb_data.get("first_air_date")

        for creator in tmdb_data.get("created_by", []) or []:
            directors.append(
                self.format_member(creator, local_profiles, first_air_date, resolve_img_fn, job="Creator")
            )
            
        cast = [
            self.format_member(actor, local_profiles, first_air_date, resolve_img_fn)
            for actor in tv_credits.get("cast", [])[:15]
        ]
            
        crew_list = tmdb_data.get("credits", {}).get("crew", [])
        for crew in crew_list:
            crew_member = self.format_member(crew, local_profiles, first_air_date, resolve_img_fn)
            job = crew.get("job")
            if job == "Director":
                directors.append(crew_member)
            elif job in ("Writer", "Screenplay"):
                writers.append(crew_member)
            elif crew.get("department") == "Sound" or job in ("Original Music Composer", "Music", "Composer"):
                sound.append(crew_member)

        return cast, directors, writers, sound
