import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.modules.people.models import Person
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

from app.modules.library.services.detail.formatters.base import BaseCreditsFormatter

class MovieCreditsFormatter(BaseCreditsFormatter):
    def format_credits(
        self,
        db: Session,
        credits: Dict[str, Any],
        release_date: str,
        current_uid: int,
        resolve_img_fn: Any
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        person_ids = set()
        for actor in credits.get("cast", []):
            if actor.get("id"):
                person_ids.add(str(actor["id"]))
        for crew in credits.get("crew", []):
            if crew.get("id"):
                person_ids.add(str(crew["id"]))

        from app.modules.people.helpers import query_local_profiles_by_tmdb_ids
        local_profiles = query_local_profiles_by_tmdb_ids(db, person_ids, current_uid)

        cast = [
            self.format_member(actor, local_profiles, release_date, resolve_img_fn, job="Actor", include_popularity=True)
            for actor in credits.get("cast", [])[:15]
        ]
        
        directors = []
        writers = []
        sound = []
        
        for crew in credits.get("crew", []):
            crew_member = self.format_member(crew, local_profiles, release_date, resolve_img_fn, include_popularity=True)
            job = crew.get("job")
            if job == "Director":
                directors.append(crew_member)
            elif job in ("Writer", "Screenplay"):
                writers.append(crew_member)
            elif crew.get("department") == "Sound" or job in ("Original Music Composer", "Music", "Composer"):
                sound.append(crew_member)

        return cast, directors, writers, sound
