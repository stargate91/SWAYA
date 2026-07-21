import logging
from datetime import datetime
from typing import Any, Optional, List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.modules.people.models import Person
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

class TvCreditsFormatter:
    def calculate_age_at_release(self, birthday_str: Optional[str], release_date_str: Optional[str]) -> Any:
        """Helper to calculate a performer's age when the show first aired."""
        if not birthday_str or not release_date_str:
            return None
        try:
            b_date = datetime.strptime(birthday_str[:10], "%Y-%m-%d")
            r_date = datetime.strptime(release_date_str[:10], "%Y-%m-%d")
            age = r_date.year - b_date.year
            if (r_date.month, r_date.day) < (b_date.month, b_date.day):
                age -= 1
            return age
        except Exception:
            return None

    def query_local_profiles(self, db: Session, person_ids: set, current_uid: int) -> Dict[int, Dict[str, Any]]:
        """Queries local performers and returns override profiles mapped by TMDB ID."""
        local_profiles = {}
        if not person_ids:
            return local_profiles
        try:
            quoted_pids = [f'"{pid}"' for pid in person_ids]
            raw_pids = list(person_ids)
            local_people = db.query(Person).filter(
                or_(
                    Person.external_ids["tmdb"].as_string().in_(raw_pids),
                    Person.external_ids["tmdb"].as_string().in_(quoted_pids)
                )
            ).all()
            
            local_person_ids = [lp.id for lp in local_people]
            overrides_people = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.person_id.in_(local_person_ids)
            ).all()
            override_map = {ov.person_id: ov.custom_poster for ov in overrides_people if ov.custom_poster}

            for lp in local_people:
                tmdb_id_str = lp.external_ids.get("tmdb")
                if tmdb_id_str:
                    custom_img = override_map.get(lp.id)
                    local_profiles[int(tmdb_id_str)] = {
                        "profile_path": custom_img or lp.local_profile_path or lp.profile_path,
                        "birthday": lp.birthday
                    }
            
            missing_birthday_ids = [lp.id for lp in local_people if lp.birthday is None]
            if missing_birthday_ids:
                try:
                    from app.modules.tasks import task_manager
                    if task_manager.people_enrich_worker:
                        task_manager.people_enrich_worker.enqueue_people(missing_birthday_ids)
                except Exception as ex:
                    logger.error(f"Failed to auto-enqueue missing birthdays: {ex}")
        except Exception as e:
            logger.error(f"Failed to query custom performer avatars for TV detail: {e}")
        return local_profiles

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

        local_profiles = self.query_local_profiles(db, person_ids, current_uid)
        first_air_date = tmdb_data.get("first_air_date")

        for creator in tmdb_data.get("created_by", []) or []:
            creator_id = creator.get("id")
            resolved = local_profiles.get(creator_id) if creator_id else None
            resolved_img = resolved.get("profile_path") if resolved else None
            birthday_str = resolved.get("birthday") if resolved else None
            directors.append({
                "id": f"tmdb:{creator_id}" if creator_id else None,
                "name": creator.get("name"),
                "job": "Creator",
                "gender": creator.get("gender"),
                "profile_path": resolve_img_fn(resolved_img or creator.get("profile_path"), "people"),
                "age_at_release": self.calculate_age_at_release(birthday_str, first_air_date)
            })
            
        for actor in tv_credits.get("cast", [])[:15]:
            actor_id = actor.get("id")
            resolved = local_profiles.get(actor_id) if actor_id else None
            resolved_img = resolved.get("profile_path") if resolved else None
            birthday_str = resolved.get("birthday") if resolved else None
            character = actor.get("character")
            if not character and "roles" in actor:
                roles = actor.get("roles", [])
                if roles:
                    character = ", ".join(filter(None, [r.get("character") for r in roles]))
            cast.append({
                "id": f"tmdb:{actor_id}" if actor_id else None,
                "name": actor.get("name"),
                "character": character,
                "gender": actor.get("gender"),
                "profile_path": resolve_img_fn(resolved_img or actor.get("profile_path"), "people"),
                "age_at_release": self.calculate_age_at_release(birthday_str, first_air_date)
            })
            
        crew_list = tmdb_data.get("credits", {}).get("crew", [])
        for crew in crew_list:
            crew_id = crew.get("id")
            resolved = local_profiles.get(crew_id) if crew_id else None
            resolved_img = resolved.get("profile_path") if resolved else None
            birthday_str = resolved.get("birthday") if resolved else None
            crew_member = {
                "id": f"tmdb:{crew_id}" if crew_id else None,
                "name": crew.get("name"),
                "job": crew.get("job"),
                "gender": crew.get("gender"),
                "profile_path": resolve_img_fn(resolved_img or crew.get("profile_path"), "people"),
                "age_at_release": self.calculate_age_at_release(birthday_str, first_air_date)
            }
            if crew.get("job") == "Director":
                directors.append(crew_member)
            elif crew.get("job") in ("Writer", "Screenplay"):
                writers.append(crew_member)
            elif crew.get("department") == "Sound" or crew.get("job") in ("Original Music Composer", "Music", "Composer"):
                sound.append(crew_member)

        return cast, directors, writers, sound
