from typing import Union, Set
from sqlalchemy.orm import Session
from app.modules.metadata.models import MetadataMatch

def get_all_parent_match_ids(db: Session, initial_ids: Union[Set[int], list]) -> Set[int]:
    """
    Given a set or list of MetadataMatch IDs, queries parent_ids upward in the hierarchy
    and returns the union of all resolved parent IDs.
    """
    parent_ids = set()
    current_parents = {pid for pid in initial_ids if pid is not None}
    while current_parents:
        parent_ids.update(current_parents)
        current_parents = {
            r[0] for r in db.query(MetadataMatch.parent_id).filter(
                MetadataMatch.id.in_(current_parents),
                MetadataMatch.parent_id.isnot(None)
            ).all()
        }
    return parent_ids
