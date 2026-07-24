import logging
from datetime import datetime, timezone
from typing import Any, List, Dict, Optional
from sqlalchemy.orm import Session

from app.modules.people.models import Person
from app.modules.users.models import UserOverride, Tag
from app.core.enums import Provider
from app.core.exceptions import NotFoundException
from app.core.user_context import get_current_user_id
from sqlalchemy import func

logger = logging.getLogger(__name__)


def enqueue_person_enrichment(person_id: int):
    from app.modules.tasks import task_manager
    if task_manager.people_enrich_worker:
        task_manager.people_enrich_worker.enqueue_people([person_id])


class PeopleStatusService:
    def __init__(
        self,
        db: Session,
        scrapers: Optional[Any] = None,
        resolver: Optional[Any] = None,
        image_service: Optional[Any] = None
    ):
        self.db = db
        self.scrapers = scrapers

        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            resolver = MediaItemService(db)
        self.resolver = resolver

        if image_service is None:
            from app.modules.media_assets.services.images import image_processing_service
            image_service = image_processing_service
        self.image_service = image_service

        from app.modules.people.services.person_service import PersonService
        self.people_repo = PersonService(db)

    def resolve_person(self, person_id: Any) -> Optional[Person]:
        """Resolves a person by numeric ID or by provider:external_id format."""
        person_id_str = str(person_id)
        if ":" in person_id_str:
            parts = person_id_str.split(":", 1)
            source_name = parts[0]
            uuid_str = parts[1]
            
            from app.modules.scrapers.support.registry import ProviderRegistry
            provider_enum = ProviderRegistry.resolve_prefix(source_name)
            if not provider_enum:
                return None
            try:
                return self.people_repo.get_person_by_external_id(provider_enum, uuid_str)
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
            return None
        else:
            try:
                p_id = int(person_id_str)
                return self.people_repo.get_person_by_id(p_id)
            except (ValueError, TypeError):
                return None

    def list_people_by_type(self, is_adult: bool, limit: int = 50) -> List[Person]:
        """Retrieve mainstream (is_adult=False) or adult (is_adult=True) people."""
        return self.people_repo.list_people_by_type(is_adult, limit)

    def update_person_status(self, person_id: str, payload_data: Dict[str, Any], fields_set: set) -> Dict[str, Any]:
        """Updates person active status and/or user-specific overrides (favorite, rating, comment)."""
        person = self.resolve_person(person_id)
        if not person:
            # Try to import/create the person dynamically if we have scrapers
            if self.scrapers:
                from app.modules.people.services.people_search_service import PeopleSearchService
                search_service = PeopleSearchService(
                    self.db,
                    self.scrapers,
                    self.resolver,
                    self.image_service
                )
                try:
                    res = search_service.add_person_tmdb(person_id, is_active=True)
                    if res and res.get("status") == "success":
                        person = self.resolve_person(res["id"])
                except Exception as e:
                    logger.error(f"Failed to dynamically import virtual person {person_id}: {e}")

            if not person:
                raise NotFoundException("Person not found")

        user_id = get_current_user_id() or 1

        newly_activated = False

        # 1. Update Person level fields
        if "is_active" in fields_set and payload_data.get("is_active") is not None:
            if payload_data.get("is_active") and not person.is_active:
                newly_activated = True
            person.is_active = payload_data.get("is_active")

        # Auto-activate on user interaction
        has_user_interaction = (
            ("user_rating" in fields_set and payload_data.get("user_rating") is not None)
            or ("is_favorite" in fields_set and payload_data.get("is_favorite"))
            or ("user_comment" in fields_set and payload_data.get("user_comment") is not None)
            or ("custom_tags" in fields_set and payload_data.get("custom_tags") is not None)
        )
        if has_user_interaction:
            if not person.is_active:
                newly_activated = True
            person.is_active = True

        # 2. Update UserOverride fields
        has_override_update = (
            "user_rating" in fields_set
            or "is_favorite" in fields_set
            or "user_comment" in fields_set
            or "custom_tags" in fields_set
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

            if "custom_tags" in fields_set:
                tags_input = payload_data.get("custom_tags")
                if tags_input is not None:
                    tags_list = []
                    for t in tags_input:
                        tag_obj = None
                        if isinstance(t, str):
                            tag_obj = self.db.query(Tag).filter(func.lower(Tag.name) == func.lower(t), Tag.is_adult == bool(person.is_adult)).first()
                            if not tag_obj:
                                tag_obj = Tag(name=t, is_adult=bool(person.is_adult))
                                self.db.add(tag_obj)
                                self.db.flush()
                        if tag_obj and tag_obj not in tags_list:
                            tags_list.append(tag_obj)
                    override.tags = tags_list

        self.db.commit()

        if newly_activated:
            enqueue_person_enrichment(person.id)

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
            "custom_tags": [t.name for t in override.tags if t.is_adult == bool(person.is_adult)] if (override and override.tags) else [],
        }