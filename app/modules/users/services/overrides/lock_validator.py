import logging
from datetime import datetime, timezone
from typing import List, Any, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.users.models import Tag
from app.modules.metadata.models import MetadataMatch
from app.core.date_utils import parse_datetime_utc

logger = logging.getLogger(__name__)

class LockValidator:
    def resolve_item_is_adult(self, db: Session, media_item_id: Optional[int], metadata_match_id: Optional[int]) -> bool:
        """Determines if a target item is adult-only based on match metadata."""
        is_adult_item = False
        if metadata_match_id:
            match_db = db.query(MetadataMatch).filter(MetadataMatch.id == metadata_match_id).first()
            if match_db:
                is_adult_item = bool(match_db.is_adult)
        elif media_item_id:
            match_db = db.query(MetadataMatch).filter(
                MetadataMatch.media_item_id == media_item_id,
                MetadataMatch.is_active
            ).first()
            if match_db:
                is_adult_item = bool(match_db.is_adult)
        return is_adult_item

    def resolve_tags(self, db: Session, tags_input: List[Any], is_adult_item: bool) -> List[Tag]:
        """Resolves tags input (dictionary, IDs, or text strings) into Tag database objects."""
        tags_list = []
        for t in tags_input:
            tag_obj = None
            if isinstance(t, dict):
                tag_id = t.get("id")
                tag_name = t.get("name")
                if tag_id:
                    tag_obj = db.query(Tag).filter(Tag.id == tag_id).first()
                elif tag_name:
                    tag_obj = db.query(Tag).filter(func.lower(Tag.name) == func.lower(tag_name), Tag.is_adult == is_adult_item).first()
            elif isinstance(t, int):
                tag_obj = db.query(Tag).filter(Tag.id == t).first()
            elif isinstance(t, str):
                tag_obj = db.query(Tag).filter(func.lower(Tag.name) == func.lower(t), Tag.is_adult == is_adult_item).first()
                if not tag_obj:
                    tag_obj = Tag(name=t, is_adult=is_adult_item)
                    db.add(tag_obj)
                    db.flush()
            if tag_obj and tag_obj not in tags_list:
                tags_list.append(tag_obj)
        return tags_list

