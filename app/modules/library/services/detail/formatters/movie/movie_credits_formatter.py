import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.modules.people.models import Person
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

class MovieCreditsFormatter:
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

        local_profiles = {}
        if person_ids:
            try:
                from sqlalchemy import or_
                quoted_pids = [f'"{pid}"' for pid in person_ids]
                from app.core.enums import Provider
                from app.modules.people.models import ExternalSourceLink
                local_people = db.query(Person).join(ExternalSourceLink).filter(
                    ExternalSourceLink.provider == Provider.TMDB,
                    ExternalSourceLink.external_id.in_([str(pid) for pid in person_ids])
                ).all()
                
                local_person_ids = [lp.id for lp in local_people]
                overrides = db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.person_id.in_(local_person_ids)
                ).all()
                override_map = {ov.person_id: ov.custom_poster for ov in overrides if ov.custom_poster}

                for lp in local_people:
                    tmdb_id_str = lp.get_external_id("tmdb")
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
                logger.error(f"Failed to query custom performer avatars for movie detail: {e}")

        from app.core.date_utils import calculate_age_at_release

        cast = []
        directors = []
        writers = []
        sound = []
        
        for actor in credits.get("cast", [])[:15]:
            actor_id = actor.get("id")
            resolved = local_profiles.get(actor_id) if actor_id else None
            resolved_img = resolved.get("profile_path") if resolved else None
            birthday_str = resolved.get("birthday") if resolved else None
            cast.append({
                "id": f"tmdb:{actor_id}" if actor_id else None,
                "name": actor.get("name"),
                "character": actor.get("character"),
                "job": "Actor",
                "profile_path": resolve_img_fn(resolved_img or actor.get("profile_path"), "people"),
                "popularity": actor.get("popularity", 0),
                "gender": actor.get("gender"),
                "age_at_release": calculate_age_at_release(birthday_str, release_date)
            })
        
        for crew in credits.get("crew", []):
            crew_id = crew.get("id")
            resolved = local_profiles.get(crew_id) if crew_id else None
            resolved_img = resolved.get("profile_path") if resolved else None
            birthday_str = resolved.get("birthday") if resolved else None
            crew_member = {
                "id": f"tmdb:{crew_id}" if crew_id else None,
                "name": crew.get("name"),
                "job": crew.get("job"),
                "profile_path": resolve_img_fn(resolved_img or crew.get("profile_path"), "people"),
                "popularity": crew.get("popularity", 0),
                "gender": crew.get("gender"),
                "age_at_release": calculate_age_at_release(birthday_str, release_date)
            }
            if crew.get("job") == "Director":
                directors.append(crew_member)
            elif crew.get("job") in ("Writer", "Screenplay"):
                writers.append(crew_member)
            elif crew.get("department") == "Sound" or crew.get("job") in ("Original Music Composer", "Music", "Composer"):
                sound.append(crew_member)

        return cast, directors, writers, sound
