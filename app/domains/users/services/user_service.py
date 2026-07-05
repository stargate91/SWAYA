import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.domains.users.models import User, UserOverride, CustomList
from app.shared_kernel.exceptions import BadRequestException

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self, db: Session, library_port: Optional[Any] = None):
        self.db = db
        self.library_port = library_port

    def list_users(self) -> List[User]:
        """Retrieve all users."""
        return self.db.query(User).all()

    def list_user_custom_lists(self, user_id: int) -> List[CustomList]:
        """Retrieve custom user lists."""
        return self.db.query(CustomList).filter(CustomList.user_id == user_id).all()

    def create_user(
        self,
        username: str,
        email: Optional[str] = None,
        password_hash: Optional[str] = None,
        pin_hash: Optional[str] = None,
        role: Optional[str] = None,
        managed_by_user_id: Optional[int] = None,
        allow_adult: Optional[bool] = None,
    ) -> User:
        """Create a new user profile."""
        existing = self.db.query(User).filter(User.username == username).first()
        if existing:
            raise BadRequestException("Username already registered")
        
        is_first_user = self.db.query(User.id).first() is None
        resolved_role = "owner" if is_first_user else (role or "member")
        
        if resolved_role not in {"owner", "member", "child"}:
            raise BadRequestException("Invalid user role")
        
        if resolved_role == "owner" and not is_first_user:
            raise BadRequestException("Owner profile already exists")
        
        if resolved_role == "child" and not managed_by_user_id:
            raise BadRequestException("Child profile requires a managing user")
        
        if managed_by_user_id:
            manager = self.db.get(User, managed_by_user_id)
            if not manager or manager.role not in {"owner", "member"}:
                raise BadRequestException("Invalid managing user")

        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            pin_hash=pin_hash,
            role=resolved_role,
            managed_by_user_id=managed_by_user_id,
            allow_adult=allow_adult if resolved_role != "child" else False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_user_overrides(self, user_id: int) -> List[UserOverride]:
        """Retrieve all metadata and physical asset overrides for a user."""
        return self.db.query(UserOverride).filter(UserOverride.user_id == user_id).all()

    def create_or_update_override(self, user_id: int, override_data_dict: Dict[str, Any]) -> UserOverride:
        """Create or update a user override for a specific media item, performer, or collection."""
        media_item_id = override_data_dict.get("media_item_id")
        metadata_match_id = override_data_dict.get("metadata_match_id")
        person_id = override_data_dict.get("person_id")
        studio_id = override_data_dict.get("studio_id")
        collection_id = override_data_dict.get("collection_id")

        if not any([media_item_id, metadata_match_id, person_id, studio_id, collection_id]):
            raise BadRequestException("Must target at least one resource ID")

        query = self.db.query(UserOverride).filter(UserOverride.user_id == user_id)
        if media_item_id:
            query = query.filter(UserOverride.media_item_id == media_item_id)
        elif metadata_match_id:
            query = query.filter(UserOverride.metadata_match_id == metadata_match_id)
        elif person_id:
            query = query.filter(UserOverride.person_id == person_id)
        elif studio_id:
            query = query.filter(UserOverride.studio_id == studio_id)
        elif collection_id:
            query = query.filter(UserOverride.collection_id == collection_id)

        override = query.first()
        if not override:
            override = UserOverride(
                user_id=user_id,
                media_item_id=media_item_id,
                metadata_match_id=metadata_match_id,
                person_id=person_id,
                studio_id=studio_id,
                collection_id=collection_id,
            )
            self.db.add(override)

        override.custom_title = override_data_dict.get("custom_title")
        override.custom_overview = override_data_dict.get("custom_overview")
        override.custom_poster = override_data_dict.get("custom_poster")
        override.custom_backdrop = override_data_dict.get("custom_backdrop")
        override.custom_logo = override_data_dict.get("custom_logo")
        override.custom_language = override_data_dict.get("custom_language")

        if media_item_id and self.library_port:
            self.library_port.update_custom_media_item_fields(
                media_item_id,
                edition=override_data_dict.get("custom_edition"),
                audio_type=override_data_dict.get("custom_audio_type"),
                source=override_data_dict.get("custom_source")
            )

        override.user_rating = override_data_dict.get("user_rating")
        override.user_comment = override_data_dict.get("user_comment")
        override.is_favorite = override_data_dict.get("is_favorite")
        override.is_watched = override_data_dict.get("is_watched")
        override.is_tracked = override_data_dict.get("is_tracked")

        self.db.commit()
        self.db.refresh(override)
        return override

    def update_item_status_composite(
        self,
        item_id: str,
        payload_data: Dict[str, Any],
        model_fields_set: set,
        resolver,
    ) -> Dict[str, Any]:
        """Composite update status and overrides."""
        from app.domains.users.services.overrides_service import OverridesService
        from app.domains.users.schemas import ItemOverridesUpdate

        service = OverridesService(self.db, resolver)
        res = {}
        status = payload_data.get("status")
        if status is not None:
            try:
                item_id_int = int(item_id)
                res.update(service.update_item_status(item_id_int, status))
            except ValueError as e:
                logger.debug(f"Swallowed exception in domains/users/services/user_service.py:149: {e}", exc_info=True)

        has_overrides = any(
            field in model_fields_set
            for field in ["user_rating", "user_comment", "is_favorite", "is_watched", "custom_tags", "tags", "resume_position"]
        )
        if has_overrides:
            update_dict = {
                "item_id": item_id,
                "media_type": payload_data.get("media_type"),
            }
            for field in ["user_rating", "user_comment", "is_favorite", "is_watched", "resume_position"]:
                if field in model_fields_set:
                    update_dict[field] = payload_data.get(field)
            if "custom_tags" in model_fields_set:
                update_dict["tags"] = payload_data.get("custom_tags")
            elif "tags" in model_fields_set:
                update_dict["tags"] = payload_data.get("tags")

            overrides_payload = ItemOverridesUpdate(**update_dict)
            res.update(service.update_item_overrides(overrides_payload))
        return res
