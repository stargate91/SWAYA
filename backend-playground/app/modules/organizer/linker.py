import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.enums import ExtraCategory, ExtraSubtype
from app.modules.library.models import Library, MediaItem, ExtraFile
from app.modules.organizer.classifier import FileClassifier

logger = logging.getLogger(__name__)

class LinkerService:
    """
    Intelligent Pure Linker Service for Swaya (Part of Organizer Module):
    - Scans extra files (subtitles, images, NFOs, trailers, samples) in library directories.
    - Links extra files to their parent MediaItem at any directory depth or sibling folder.
    - Creates ExtraFile records in DB.
    """

    @classmethod
    def link_extra_files(cls, db: Session, library: Library) -> Dict[str, int]:
        """
        Discovers all non-main video files (NFOs, subtitles, covers, trailers) in library.root_path,
        and links them as ExtraFile records to their parent MediaItem.
        """
        root_path = Path(library.root_path)
        if not root_path.exists() or not root_path.is_dir():
            return {"linked_extras": 0}

        # Index existing MediaItems by directory path
        items = db.query(MediaItem).filter(MediaItem.library_id == library.id).all()
        if not items:
            return {"linked_extras": 0}

        # Map parent directory -> List[MediaItem]
        dir_map: Dict[Path, List[MediaItem]] = {}
        for item in items:
            item_path = root_path / item.relative_path
            parent_dir = item_path.parent
            dir_map.setdefault(parent_dir, []).append(item)

        linked_count = 0

        EXTRA_EXTENSIONS = {
            ".nfo", ".txt", ".srt", ".vtt", ".ass", ".ssa", ".sub", ".idx",
            ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".mp4", ".mkv", ".avi"
        }
        MAIN_VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".ts", ".iso"}

        for root, _, files in os.walk(root_path):
            current_dir = Path(root)
            for file in files:
                file_path = current_dir / file
                ext = file_path.suffix.lower()

                if ext not in EXTRA_EXTENSIONS:
                    continue

                rel_path = str(file_path.relative_to(root_path)).replace("\\", "/")

                # Skip if file is already a primary MediaItem
                if any(item.relative_path == rel_path for item in items):
                    continue

                # Find best matching parent MediaItem for this extra file
                parent_item = cls._match_parent_item(file_path, dir_map)
                if not parent_item:
                    continue

                # Classify extra file category & subtype
                category, subtype, lang = cls._classify_extra(file_path)

                # Check if ExtraFile record already exists in DB
                existing_extra = db.query(ExtraFile).filter(
                    ExtraFile.media_item_id == parent_item.id,
                    ExtraFile.relative_path == rel_path
                ).first()

                if not existing_extra:
                    extra = ExtraFile(
                        media_item_id=parent_item.id,
                        relative_path=rel_path,
                        filename=file_path.name,
                        extension=ext,
                        category=category,
                        subtype=subtype,
                        language=lang
                    )
                    db.add(extra)
                    linked_count += 1

        db.commit()
        return {"linked_extras": linked_count}

    @classmethod
    def _match_parent_item(cls, extra_path: Path, dir_map: Dict[Path, List[MediaItem]]) -> Optional[MediaItem]:
        """Finds parent MediaItem at any directory depth or via filename stem matching."""
        curr = extra_path.parent
        while curr != curr.parent:
            if curr in dir_map:
                candidates = dir_map[curr]
                if len(candidates) == 1:
                    return candidates[0]
                
                # If multiple candidates, pick best match by stem name similarity
                extra_stem = extra_path.stem.lower()
                for item in candidates:
                    item_stem = Path(item.filename).stem.lower()
                    if item_stem in extra_stem or extra_stem.startswith(item_stem):
                        return item
                return candidates[0]

            curr = curr.parent

        # Fallback: Sibling Directory lookup (e.g. Inception-Extras/trailer.mp4 -> Inception (2010)/Inception.mp4)
        extra_dir = extra_path.parent
        grandparent = extra_dir.parent
        clean_extra_dir = re.sub(r'[\(\)\.\-_]', ' ', extra_dir.name.lower()).strip()

        for folder, candidates in dir_map.items():
            if folder.parent == grandparent:
                for item in candidates:
                    clean_item_stem = re.sub(r'\b\d{4}\b', '', Path(item.filename).stem.lower())
                    clean_item_stem = re.sub(r'[\(\)\.\-_]', ' ', clean_item_stem).strip()
                    if clean_item_stem and clean_item_stem in clean_extra_dir:
                        return item

        return None

    @classmethod
    def _classify_extra(cls, file_path: Path) -> Tuple[ExtraCategory, Optional[ExtraSubtype], Optional[str]]:
        ext = file_path.suffix.lower()
        lang = FileClassifier.parse_subtitle_language(file_path)

        if ext in (".srt", ".vtt", ".ass", ".ssa", ".sub", ".idx"):
            return ExtraCategory.SUBTITLE, ExtraSubtype.FULL, lang
        if ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp"):
            img_type_str = FileClassifier.categorize_image(file_path)
            subtype_map = {
                "poster": ExtraSubtype.POSTER,
                "backdrop": ExtraSubtype.BACKDROP,
                "logo": ExtraSubtype.LOGO,
                "banner": ExtraSubtype.BANNER,
                "thumb": ExtraSubtype.THUMBNAIL
            }
            return ExtraCategory.IMAGE, subtype_map.get(img_type_str, ExtraSubtype.FANART), None
        if ext in (".nfo", ".txt"):
            return ExtraCategory.METADATA, None, None
        if FileClassifier.is_forced_extra(file_path):
            extra_type_str = FileClassifier.determine_extra_type(file_path)
            subtype_map = {
                "sample": ExtraSubtype.SAMPLE,
                "trailer": ExtraSubtype.TRAILER,
                "featurette": ExtraSubtype.FEATURETTE,
                "behind_the_scenes": ExtraSubtype.BEHIND_THE_SCENES,
                "deleted_scenes": ExtraSubtype.DELETED_SCENES
            }
            return ExtraCategory.VIDEO, subtype_map.get(extra_type_str, ExtraSubtype.PROMO), None

        return ExtraCategory.METADATA, None, None
