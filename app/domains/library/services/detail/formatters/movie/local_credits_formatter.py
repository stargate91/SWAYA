import logging
from typing import Any, Tuple, List, Dict
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.modules.people.models import Person, MediaPersonLink
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

class LocalCreditsFormatter:
    def format_credits(
        self,
        db: Session,
        active_match: Any,
        current_uid: int,
        resolve_img_fn: Any
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Formats cast, directors, and writers list from MediaPersonLink records."""
        cast = []
        directors = []
        writers = []

        if not active_match:
            return cast, directors, writers

        people_links = db.query(MediaPersonLink).options(
            joinedload(MediaPersonLink.person).joinedload(Person.localizations)
        ).filter(MediaPersonLink.match_id == active_match.id).all()

        local_person_ids = [link.person.id for link in people_links if link.person]
        overrides = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            UserOverride.person_id.in_(local_person_ids)
        ).all() if local_person_ids else []
        override_map = {ov.person_id: ov.custom_poster for ov in overrides if ov.custom_poster}
        release_date_str = active_match.release_date.strftime("%Y-%m-%d") if active_match.release_date else None

        missing_birthday_ids = [link.person.id for link in people_links if link.person and link.person.birthday is None]
        if missing_birthday_ids:
            try:
                from app.domains.tasks import task_manager
                if task_manager.people_enrich_worker:
                    task_manager.people_enrich_worker.enqueue_people(missing_birthday_ids)
            except Exception as ex:
                logger.error(f"Failed to auto-enqueue missing birthdays in local movie credits: {ex}")

        for link in sorted(people_links, key=lambda x: x.order):
            person = link.person
            if not person:
                continue
            custom_img = override_map.get(person.id)
            person_data = {
                "id": person.id,
                "name": person.name,
                "character": link.character_name,
                "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                "profile_path": resolve_img_fn(custom_img or person.local_profile_path or person.profile_path, "people"),
                "popularity": (
                    person.rating_porndb
                    if person.is_adult and person.rating_porndb is not None
                    else person.popularity or 0
                ),
                "scene_count": person.scene_count,
                "rating_porndb": person.rating_porndb,
                "gender": person.gender,
                "age_at_release": self._calculate_age_at_release(person.birthday, release_date_str)
            }
            if person_data["job"].lower() == "director":
                directors.append(person_data)
            elif person_data["job"].lower() == "writer":
                writers.append(person_data)
            elif person_data["job"].lower() == "actor":
                cast.append(person_data)

        return cast, directors, writers

    def _calculate_age_at_release(self, birthday_str: str, release_date_str: str) -> Any:
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
