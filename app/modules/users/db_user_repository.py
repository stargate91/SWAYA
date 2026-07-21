import logging
from sqlalchemy import text
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)

class DbUserRepository:
    def __init__(self, db_session: Session):
        self.db = db_session

    def auto_heal_adult_tags(self) -> None:
        try:
            self.db.execute(text("""
                UPDATE tags 
                SET is_adult = 1 
                WHERE is_adult = 0 AND id IN (
                    SELECT uot.tag_id 
                    FROM user_override_tags uot
                    JOIN user_overrides uo ON uot.user_override_id = uo.id
                    JOIN metadata_matches mm ON uo.metadata_match_id = mm.id
                    WHERE mm.is_adult = 1
                )
            """))
            self.db.execute(text("""
                UPDATE tags 
                SET is_adult = 1 
                WHERE is_adult = 0 AND id IN (
                    SELECT uot.tag_id 
                    FROM user_override_tags uot
                    JOIN user_overrides uo ON uot.user_override_id = uo.id
                    JOIN people p ON uo.person_id = p.id
                    WHERE p.is_adult = 1
                )
            """))
            self.db.commit()
        except Exception as e:
            logger.debug(f"Failed to auto-heal adult tags: {e}")
