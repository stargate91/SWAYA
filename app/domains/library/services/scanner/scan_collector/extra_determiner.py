from typing import Tuple, Optional, Any
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.enums import ScanMode, ExtraCategory, ExtraSubtype

class ExtraDeterminer:
    def __init__(self, categorizer: Any, mode: ScanMode, settings_port: Optional[Any] = None):
        self.categorizer = categorizer
        self.mode = mode
        self.settings = settings_port

    def determine_extra(self, path: Path, db: Session, is_audio_only: bool = False) -> Tuple[Optional[ExtraCategory], Optional[ExtraSubtype]]:
        category, subtype = self.categorizer.categorize(path, settings_port=self.settings, is_audio_only=is_audio_only)
        if category is None:
            return None, None

        # Scene profiles support sidecar metadata, images, subtitles, and audio tracks.
        if self.mode == ScanMode.SCENES and category not in (
            ExtraCategory.METADATA,
            ExtraCategory.IMAGE,
            ExtraCategory.SUBTITLE,
            ExtraCategory.AUDIO,
        ):
            return None, None

        return category, subtype
