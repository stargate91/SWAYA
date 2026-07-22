from typing import Tuple, Optional, Any
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.enums import ExtraCategory, ExtraSubtype

class ExtraDeterminer:
    def __init__(self, categorizer: Any, is_adult: bool, settings: Optional[Any] = None):
        self.categorizer = categorizer
        self.is_adult = is_adult
        self.settings = settings

    def determine_extra(self, path: Path, db: Session, is_audio_only: bool = False) -> Tuple[Optional[ExtraCategory], Optional[ExtraSubtype]]:
        category, subtype = self.categorizer.categorize(path, settings=self.settings, is_audio_only=is_audio_only)
        if category is None:
            return None, None

        # Scene profiles support sidecar metadata, images, subtitles, and audio tracks.
        if self.is_adult and category not in (
            ExtraCategory.METADATA,
            ExtraCategory.IMAGE,
            ExtraCategory.SUBTITLE,
            ExtraCategory.AUDIO,
        ):
            return None, None

        return category, subtype
