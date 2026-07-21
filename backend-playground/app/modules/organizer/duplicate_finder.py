import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
from app.modules.library.models import Library, MediaItem, ExtraFile

logger = logging.getLogger(__name__)

class DuplicateFinder:
    """
    Dedicated DuplicateFinder Service (Part of Organizer Module):
    Builds and queries file hash lookups (OSHASH / hash) to detect moved,
    renamed, or duplicate media items and extra files on disk.
    """

    @classmethod
    def build_media_hash_lookup(cls, items: List[MediaItem]) -> Dict[str, List[MediaItem]]:
        """Indexes existing MediaItems by their file hash."""
        lookup: Dict[str, List[MediaItem]] = {}
        for item in items:
            key = item.hash_oshash or item.hash_md5
            if key:
                lookup.setdefault(key, []).append(item)
        return lookup

    @classmethod
    def build_extra_hash_lookup(cls, extras: List[ExtraFile]) -> Dict[str, List[ExtraFile]]:
        """Indexes existing ExtraFiles by their file hash."""
        lookup: Dict[str, List[ExtraFile]] = {}
        for extra in extras:
            if extra.file_hash:
                lookup.setdefault(extra.file_hash, []).append(extra)
        return lookup

    @classmethod
    def find_moved_media_item(
        cls,
        library: Library,
        file_hash: Optional[str],
        hash_lookup: Dict[str, List[MediaItem]]
    ) -> Optional[MediaItem]:
        """
        Finds a MediaItem whose old file path no longer exists on disk,
        but whose file hash matches a newly discovered file (moved/renamed file).
        """
        if not file_hash:
            return None
        candidates = hash_lookup.get(file_hash) or []
        for cand in candidates:
            cand_full_path = Path(library.root_path) / cand.relative_path
            if not cand_full_path.exists():
                return cand
        return None

    @classmethod
    def find_moved_extra(
        cls,
        library: Library,
        file_hash: Optional[str],
        extra_hash_lookup: Dict[str, List[ExtraFile]]
    ) -> Optional[ExtraFile]:
        """
        Finds an ExtraFile whose old file path no longer exists on disk,
        but whose file hash matches a newly discovered extra file.
        """
        if not file_hash:
            return None
        candidates = extra_hash_lookup.get(file_hash) or []
        for cand in candidates:
            cand_full_path = Path(library.root_path) / cand.relative_path
            if not cand_full_path.exists():
                return cand
        return None
