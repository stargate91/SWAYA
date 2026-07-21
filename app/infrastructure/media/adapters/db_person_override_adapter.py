from typing import Optional, Dict, Any

from app.modules.users.models import UserOverride
from app.shared_kernel.ports.person_override_port import PersonOverridePort

class DbPersonOverrideAdapter(PersonOverridePort):
    def get_person_user_override(self, user_id: int, person_id: int) -> Optional[Dict[str, Any]]:
        override = self.db.query(UserOverride).filter(
            UserOverride.user_id == user_id,
            UserOverride.person_id == person_id
        ).first()
        if not override:
            return None
        return {
            "id": override.id,
            "user_id": override.user_id,
            "person_id": override.person_id,
            "custom_poster": override.custom_poster,
            "custom_backdrop": override.custom_backdrop,
            "is_favorite": override.is_favorite,
            "user_rating": override.user_rating,
            "user_comment": override.user_comment,
            "custom_tags": [t.name for t in override.tags] if override.tags else [],
        }

    def update_person_user_override(
        self,
        user_id: int,
        person_id: int,
        custom_poster: Optional[str] = None,
        custom_backdrop: Optional[str] = None,
        update_poster: bool = False,
        update_backdrop: bool = False,
    ) -> None:
        override = self.db.query(UserOverride).filter(
            UserOverride.user_id == user_id,
            UserOverride.person_id == person_id
        ).first()
        if not override:
            override = UserOverride(user_id=user_id, person_id=person_id)
            self.db.add(override)
        
        if update_poster:
            override.custom_poster = custom_poster
        if update_backdrop:
            override.custom_backdrop = custom_backdrop
            
        self.db.commit()
