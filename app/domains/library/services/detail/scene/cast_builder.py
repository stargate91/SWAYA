import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload

from app.shared_kernel.enums import Provider
from app.domains.people.models import Person, MediaPersonLink, ExternalSourceLink
from app.domains.users.models import UserOverride
from app.domains.metadata.models import MetadataMatch

logger = logging.getLogger(__name__)

class SceneCastBuilder:
    def build_cast(
        self,
        db: Session,
        match_db: Optional[MetadataMatch],
        scene_data: Dict[str, Any],
        date_str: Optional[str],
        current_uid: int,
        provider_prefix: Optional[str],
        resolve_img_fn: Any
    ) -> List[Dict[str, Any]]:
        cast_by_name = {}

        def calculate_age_at_release(birthday_str: str, release_date_str: str) -> Any:
            if not birthday_str or not release_date_str:
                return None
            try:
                from datetime import datetime
                b_date = datetime.strptime(birthday_str[:10], "%Y-%m-%d")
                r_date = datetime.strptime(release_date_str[:10], "%Y-%m-%d")
                age = r_date.year - b_date.year
                if (r_date.month, r_date.day) < (b_date.month, b_date.day):
                    age -= 1
                return age
            except Exception:
                return None

        # 1. Add performers from local database match
        if match_db:
            people_links = db.query(MediaPersonLink).options(
                joinedload(MediaPersonLink.person)
            ).filter(MediaPersonLink.match_id == match_db.id).all()
            
            person_ids = [x.person_id for x in people_links]
            override_map = {}
            if person_ids:
                overrides = db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.person_id.in_(person_ids)
                ).all()
                override_map = {ov.person_id: ov.custom_poster for ov in overrides if ov.custom_poster}

            for link in sorted(people_links, key=lambda x: x.order if x.order is not None else 0):
                person = link.person
                custom_img = override_map.get(person.id)
                cast_by_name[person.name.lower()] = {
                    "id": f"local:{person.id}",
                    "name": person.name,
                    "character": link.character_name,
                    "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                    "profile_path": resolve_img_fn(custom_img or person.local_profile_path or person.profile_path, "people"),
                    "popularity": person.rating_porndb if person.rating_porndb is not None else person.popularity or 0,
                    "rating_porndb": person.rating_porndb,
                    "scene_count": person.scene_count,
                    "gender": person.gender,
                    "age_at_release": calculate_age_at_release(person.birthday, date_str)
                }

        # 2. Add/merge performers from external scraper details
        for p_entry in scene_data.get("performers") or []:
            perf = p_entry.get("performer") or {}
            perf_name = perf.get("name")
            if not perf_name:
                continue
            if perf_name.lower() in cast_by_name:
                continue

            p_images = perf.get("images") or []
            p_img = p_images[0].get("url") if p_images else None
            gender_str = str(perf.get("gender") or "").upper()
            mapped_gender = 0
            if "FEMALE" in gender_str:
                mapped_gender = 1
            elif "MALE" in gender_str:
                mapped_gender = 2
            elif gender_str:
                mapped_gender = 3

            person_db = None
            perf_ext_id = perf.get("id")
            if perf_ext_id and provider_prefix:
                try:
                    prov_enum = Provider(provider_prefix)
                    link = db.query(ExternalSourceLink).filter(
                        ExternalSourceLink.provider == prov_enum,
                        ExternalSourceLink.external_id == str(perf_ext_id)
                    ).first()
                    if link:
                        person_db = link.person
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}")

            if not person_db:
                person_db = db.query(Person).filter(Person.name == perf_name).first()

            birthday_val = None
            if person_db:
                override_obj = db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.person_id == person_db.id
                ).first()
                custom_img = override_obj.custom_poster if override_obj else None
                resolved_img = resolve_img_fn(custom_img or person_db.local_profile_path or person_db.profile_path, "people")
                p_id = f"local:{person_db.id}"
                birthday_val = person_db.birthday
            else:
                resolved_img = p_img
                p_id = f"{provider_prefix}:{perf.get('id')}" if provider_prefix else perf.get("id")

            cast_by_name[perf_name.lower()] = {
                "id": p_id,
                "name": perf_name,
                "character": None,
                "job": "Actor",
                "profile_path": resolved_img,
                "popularity": perf.get("rating_porndb") or 0,
                "rating_porndb": perf.get("rating_porndb"),
                "scene_count": perf.get("scene_count"),
                "gender": mapped_gender,
                "age_at_release": calculate_age_at_release(birthday_val, date_str)
            }

        return list(cast_by_name.values())
