import logging
from datetime import datetime, timezone
from typing import Any, List, Dict, Optional
from sqlalchemy.orm import Session

from app.domains.people.models import Person, ExternalSourceLink
from app.domains.users.models import UserOverride
from app.shared_kernel.enums import Provider
from app.shared_kernel.exceptions import NotFoundException
from app.shared_kernel.user_context import get_current_user_id

logger = logging.getLogger(__name__)

class PeopleStatusService:
    def __init__(self, db: Session):
        self.db = db

    def resolve_person(self, person_id: Any) -> Optional[Person]:
        """Resolves a person by numeric ID or by provider:external_id format."""
        person_id_str = str(person_id)
        if ":" in person_id_str:
            parts = person_id_str.split(":", 1)
            source_name = parts[0]
            uuid_str = parts[1]
            
            scraper_name = "porndb" if source_name == "theporndb" else source_name
            try:
                provider_enum = Provider(scraper_name)
                link = self.db.query(ExternalSourceLink).filter(
                    ExternalSourceLink.provider == provider_enum,
                    ExternalSourceLink.external_id == uuid_str
                ).first()
                if link:
                    return link.person
            except Exception:
                pass
            return None
        else:
            try:
                p_id = int(person_id_str)
                return self.db.query(Person).filter(Person.id == p_id).first()
            except (ValueError, TypeError):
                return None

    def list_people_by_type(self, is_adult: bool, limit: int = 50) -> List[Person]:
        """Retrieve mainstream (is_adult=False) or adult (is_adult=True) people."""
        return self.db.query(Person).filter(Person.is_adult == is_adult).limit(limit).all()

    def update_person_status(self, person_id: str, payload_data: Dict[str, Any], fields_set: set) -> Dict[str, Any]:
        """Updates person active status and/or user-specific overrides (favorite, rating, comment)."""
        person = self.resolve_person(person_id)
        if not person:
            raise NotFoundException("Person not found")

        user_id = get_current_user_id() or 1

        # 1. Update Person level fields
        if "is_active" in fields_set and payload_data.get("is_active") is not None:
            person.is_active = payload_data.get("is_active")

        # Auto-activate on user interaction
        has_user_interaction = (
            ("user_rating" in fields_set and payload_data.get("user_rating") is not None)
            or ("is_favorite" in fields_set and payload_data.get("is_favorite"))
            or ("user_comment" in fields_set and payload_data.get("user_comment") is not None)
        )
        if has_user_interaction:
            person.is_active = True

        # 2. Update UserOverride fields
        has_override_update = (
            "user_rating" in fields_set
            or "is_favorite" in fields_set
            or "user_comment" in fields_set
        )
        if has_override_update:
            override = self.db.query(UserOverride).filter(
                UserOverride.user_id == user_id,
                UserOverride.person_id == person.id
            ).first()

            if not override:
                override = UserOverride(
                    user_id=user_id,
                    person_id=person.id
                )
                self.db.add(override)

            if "user_rating" in fields_set:
                rating_val = payload_data.get("user_rating")
                override.user_rating = float(rating_val) if rating_val is not None else None
                override.user_rating_at = datetime.now(timezone.utc) if rating_val is not None else None

            if "is_favorite" in fields_set:
                fav_val = payload_data.get("is_favorite")
                override.is_favorite = fav_val if fav_val is not None else False
                override.is_favorite_at = datetime.now(timezone.utc) if fav_val else None

            if "user_comment" in fields_set:
                comment_val = payload_data.get("user_comment")
                override.user_comment = comment_val
                override.user_comment_at = datetime.now(timezone.utc) if comment_val else None

        self.db.commit()

        override = self.db.query(UserOverride).filter(
            UserOverride.user_id == user_id,
            UserOverride.person_id == person.id
        ).first()

        return {
            "status": "ok",
            "is_active": person.is_active,
            "is_favorite": override.is_favorite if override else False,
            "user_rating": override.user_rating if override else None,
            "user_comment": override.user_comment if override else None,
        }
