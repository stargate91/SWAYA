from typing import Optional
from sqlalchemy.orm import Session
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch, MetadataLocalization
from app.core.enums import Provider, MediaType, ItemStatus
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.scrapers.pipelines.base import BaseResolverPipeline

class OfflineResolverPipeline(BaseResolverPipeline):
    def __init__(self, mainstream_resolver, include_adult: bool = False):
        self.db: Session = mainstream_resolver.db
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

        # 2. Create the offline metadata match (using Provider.MANUAL and MediaType.SCENE)
        match = MetadataMatch(
            media_item_id=item.id,
            provider=Provider.MANUAL,
            external_id=f"offline_{item.id}",
            media_type=MediaType.SCENE,
            original_title=filename_stem,
            confidence_score=1.0,
            is_active=True,
            is_adult=self.include_adult,
            is_home_video=True,
        )

        # Extract still frame at 50% mark using ffmpeg/ffprobe
        from app.modules.library.filesystem.fs_utils import to_win_long_path
        from app.modules.media_assets.services.images import image_processing_service
        import subprocess
        
        image_filename = f"offline_{item.id}.jpg"
        
        img_service = image_processing_service
        img_service.ensure_folders()
        target_image_path = img_service.get_original_path("scene_stills", image_filename)
        
        if Path(item.current_path).exists():
            long_path = to_win_long_path(item.current_path)
            cmd_duration = [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                long_path
            ]
            try:
                res_duration = subprocess.run(cmd_duration, capture_output=True, text=True, check=True, timeout=10)
                duration = float(res_duration.stdout.strip())
            except Exception:
                duration = 0.0

            seek_seconds = duration * 0.5
            cmd_extract = [
                'ffmpeg', '-y',
                '-ss', f'{seek_seconds:.3f}',
                '-i', long_path,
                '-vframes', '1',
                '-q:v', '2',
                str(target_image_path)
            ]
            try:
                subprocess.run(cmd_extract, capture_output=True, check=True, timeout=15)
                db_rel_path = f"scene_stills/{image_filename}"
                match.still_path = db_rel_path
                match.backdrop_path = db_rel_path
                match.local_still_path = db_rel_path
                match.local_backdrop_path = db_rel_path
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to extract 50% still for offline video {item.id}: {e}")

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
