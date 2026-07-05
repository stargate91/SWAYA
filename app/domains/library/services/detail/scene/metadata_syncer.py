import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.domains.metadata.models import MetadataMatch

logger = logging.getLogger(__name__)

class SceneMetadataSyncer:
    def sync_metadata(
        self,
        db: Session,
        match_db: MetadataMatch,
        title: str,
        scene_data: Dict[str, Any],
        poster_url: Optional[str],
        ext_background: Optional[str],
        date_str: Optional[str]
    ):
        db_updated = False
        if not match_db.backdrop_path and ext_background:
            match_db.backdrop_path = ext_background
            db_updated = True
        if not match_db.release_date and date_str:
            try:
                match_db.release_date = datetime.strptime(date_str, "%Y-%m-%d")
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        if scene_data.get("rating") is not None and float(scene_data.get("rating")) > 0:
            try:
                match_db.rating_porndb = float(scene_data.get("rating"))
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        
        loc_db = next((x for x in match_db.localizations if x.locale == "en"), None)
        if not loc_db:
            from app.domains.metadata.models import MetadataLocalization
            loc_db = MetadataLocalization(
                match_id=match_db.id,
                locale="en",
                title=title,
                overview=scene_data.get("details"),
                poster_path=poster_url
            )
            db.add(loc_db)
            db_updated = True
        else:
            if not loc_db.title and title:
                loc_db.title = title
                db_updated = True
            if not loc_db.overview and scene_data.get("details"):
                loc_db.overview = scene_data.get("details")
                db_updated = True
            if not loc_db.poster_path and poster_url:
                loc_db.poster_path = poster_url
                db_updated = True
        
        if db_updated:
            db.commit()
