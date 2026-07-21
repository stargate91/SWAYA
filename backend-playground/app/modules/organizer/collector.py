import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.enums import ItemStatus
from app.core.scan_profiles import ScanProfileRegistry, ScanProfile
from app.modules.library.models import Library, MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.organizer.classifier import FileClassifier
from app.modules.organizer.duplicate_finder import DuplicateFinder
from app.modules.organizer.prober import TechnicalProber

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {
    ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm",
    ".m4v", ".mpg", ".mpeg", ".ts", ".m2ts", ".iso"
}

class ScanCollector:
    """
    Phase 1 Intelligent File & Scan Collector (Part of Organizer Module):
    - Resolves dynamic scan profile thresholds (min_size_mb, min_duration_minutes) per library.
    - Classifies forced extras (samples, trailers, promos) to prevent cluttering main MediaItem library.
    - Creates initial MediaItem & MetadataMatch records.
    """

    def __init__(
        self,
        profile_id: Optional[str] = None,
        min_size_mb_override: Optional[float] = None,
        min_duration_minutes_override: Optional[float] = None,
        video_extensions: Optional[set] = None
    ):
        self.profile_id = profile_id
        self.min_size_mb_override = min_size_mb_override
        self.min_duration_minutes_override = min_duration_minutes_override
        self.video_extensions = video_extensions or VIDEO_EXTENSIONS

    def _resolve_profile(self, library: Library) -> ScanProfile:
        profile_id = self.profile_id or getattr(library, "scan_profile_id", None) or "movies_tv"
        profile = ScanProfileRegistry.get(profile_id)
        if not profile:
            profile = ScanProfileRegistry.get("movies_tv")
        return profile

    def collect_from_directory(
        self,
        db: Session,
        library: Library
    ) -> Dict[str, Any]:
        root_path = Path(library.root_path)
        if not root_path.exists() or not root_path.is_dir():
            logger.warning(f"Library root directory does not exist: {library.root_path}")
            return {"collected_items": [], "ignored_samples": 0}

        profile = self._resolve_profile(library)
        
        # Calculate dynamic size threshold in bytes
        min_size_mb = self.min_size_mb_override if self.min_size_mb_override is not None else profile.min_size_mb
        min_size_bytes = int(min_size_mb * 1024 * 1024)

        existing_items_list = db.query(MediaItem).filter(MediaItem.library_id == library.id).all()
        existing_items = {item.relative_path: item for item in existing_items_list}
        hash_lookup = DuplicateFinder.build_media_hash_lookup(existing_items_list)

        collected_items: List[MediaItem] = []
        ignored_samples = 0

        for root, _, files in os.walk(root_path):
            for file in files:
                file_path = Path(root) / file
                ext = file_path.suffix.lower()

                if ext not in self.video_extensions:
                    continue

                try:
                    stat = file_path.stat()
                except OSError:
                    continue

                # 1. Size threshold filter (dynamic per profile)
                if stat.st_size < min_size_bytes:
                    ignored_samples += 1
                    continue

                # 2. Forced Extra Classifier filter (samples/trailers in extra subfolders)
                if FileClassifier.is_forced_extra(file_path, is_adult=profile.requires_adult):
                    ignored_samples += 1
                    continue

                rel_path = str(file_path.relative_to(root_path)).replace("\\", "/")
                part_num, total_parts = FileClassifier.parse_part_number(file_path)
                
                # Check if item already exists by relative path
                media_item = existing_items.get(rel_path)
                if not media_item:
                    # Calculate OSHash to detect moved/renamed files
                    file_hash = TechnicalProber.calculate_oshash(file_path)
                    moved_item = DuplicateFinder.find_moved_media_item(library, file_hash, hash_lookup)
                    
                    if moved_item:
                        # File was moved/renamed! Update relative_path and filename while preserving status & metadata matches!
                        moved_item.relative_path = rel_path
                        moved_item.filename = file_path.name
                        moved_item.size = stat.st_size
                        moved_item.mtime = stat.st_mtime
                        media_item = moved_item
                    else:
                        media_item = MediaItem(
                            library_id=library.id,
                            relative_path=rel_path,
                            filename=file_path.name,
                            extension=ext,
                            size=stat.st_size,
                            mtime=stat.st_mtime,
                            hash_oshash=file_hash,
                            part_number=part_num,
                            total_parts=total_parts,
                            status=ItemStatus.NEW
                        )
                        db.add(media_item)
                        db.flush()

                        # Create initial offline MetadataMatch placeholder
                        initial_match = MetadataMatch(
                            media_item_id=media_item.id,
                            provider="offline",
                            external_id=rel_path,
                            media_type="scene" if profile.pipeline_type == "scene" else "movie",
                            is_active=True,
                            is_adult=profile.requires_adult
                        )
                        db.add(initial_match)
                else:
                    # Update existing file stat if modified on disk
                    if media_item.size != stat.st_size or media_item.mtime != stat.st_mtime:
                        media_item.size = stat.st_size
                        media_item.mtime = stat.st_mtime
                        media_item.part_number = part_num

                collected_items.append(media_item)

        db.commit()
        return {
            "collected_items": collected_items,
            "ignored_samples": ignored_samples,
            "profile_used": profile.id,
            "min_size_mb": min_size_mb
        }
