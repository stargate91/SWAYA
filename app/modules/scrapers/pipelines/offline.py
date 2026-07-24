from typing import Optional
from sqlalchemy.orm import Session
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch, MetadataLocalization
from app.core.enums import Provider, MediaType, ItemStatus
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.scrapers.pipelines.base import BaseResolverPipeline

class OfflineResolverPipeline(BaseResolverPipeline):
    def __init__(self, mainstream_resolver=None, include_adult: bool = False, *, db=None):
        if db is not None:
            self.db: Session = db
        elif mainstream_resolver is not None:
            self.db: Session = mainstream_resolver.db if hasattr(mainstream_resolver, 'db') else mainstream_resolver
        else:
            raise ValueError("Either db or mainstream_resolver must be provided")
        self.include_adult = include_adult

    def resolve_item(
        self,
        item: MediaItem,
        *,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
    ):
        # 1. Clear existing matches
        self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).delete()
        self.db.flush()

        from pathlib import Path
        filename_stem = Path(item.filename).stem

        # 2. Create the offline metadata match (using Provider.MANUAL and MediaType.VIDEO)
        match = MetadataMatch(
            media_item_id=item.id,
            provider=Provider.MANUAL,
            external_id=f"offline_{item.id}",
            media_type=MediaType.VIDEO,
            original_title=filename_stem,
            confidence_score=1.0,
            is_active=True,
            is_adult=self.include_adult,
        )

        # Extract still frame at 50% mark using ffmpeg/ffprobe
        from app.modules.library.filesystem.fs_utils import get_video_duration
        from app.modules.media_assets.services.images import image_processing_service
        
        image_filename = f"offline_{item.id}.jpg"
        
        img_service = image_processing_service
        img_service.ensure_folders()
        target_image_path = img_service.get_original_path("scene_stills", image_filename)
        
        if Path(item.current_path).exists():
            duration = get_video_duration(item.current_path)

            seek_seconds = duration * 0.5
            from app.modules.library.filesystem.fs_utils import extract_video_still
            if extract_video_still(item.current_path, target_image_path, seek_seconds):
                db_rel_path = f"scene_stills/{image_filename}"
                match.still_path = db_rel_path
                match.backdrop_path = db_rel_path
                match.local_still_path = db_rel_path
                match.local_backdrop_path = db_rel_path

        self.db.add(match)
        self.db.flush()

        # 3. Create the localization
        loc = MetadataLocalization(
            match_id=match.id,
            locale=language,
            title=filename_stem,
        )
        self.db.add(loc)
        self.db.flush()
        # 4. Update the item's status to MATCHED
        item.status = ItemStatus.MATCHED
        self.db.flush()
        return match
