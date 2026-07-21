from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch

class BaseMediaOrganizer:
    def __init__(self, db: Session, img_service: Any):
        self.db = db
        self.img_service = img_service

    def _resolve_image_with_fallback(self, local_path: Optional[str], remote_path: Optional[str], subfolder: str) -> Optional[str]:
        resolved = self.img_service.resolve_image_url(local_path, subfolder)
        if resolved:
            return resolved
        return self.img_service.resolve_image_url(remote_path, subfolder)

    def build_images_list(self, item: MediaItem, active_m: Optional[MetadataMatch], target_lang: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement build_images_list")

    @staticmethod
    def get_strategy(itype: str, db: Session, img_service: Any) -> "BaseMediaOrganizer":
        from app.modules.organizer.services.strategies.movie_organizer import MovieOrganizer
        from app.modules.organizer.services.strategies.episode_organizer import EpisodeOrganizer
        from app.modules.organizer.services.strategies.scene_organizer import SceneOrganizer

        itype_lower = str(itype or "").lower()
        if itype_lower == "episode":
            return EpisodeOrganizer(db, img_service)
        elif itype_lower == "scene":
            return SceneOrganizer(db, img_service)
        else:
            return MovieOrganizer(db, img_service)
