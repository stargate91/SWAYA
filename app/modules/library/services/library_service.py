from sqlalchemy.orm import Session
from typing import List

from app.modules.library.models import MediaItem, Library
from app.modules.metadata.models import MetadataMatch


class LibraryService:
    def __init__(self, db: Session):
        self.db = db

    def list_mainstream_metadata(self, limit: int = 50) -> List[MetadataMatch]:
        """List mainstream metadata matches (SFW)."""
        return self.db.query(MetadataMatch).filter(~MetadataMatch.is_adult).limit(limit).all()

    def list_adult_metadata(self, limit: int = 50) -> List[MetadataMatch]:
        """List adult metadata matches (NSFW)."""
        return self.db.query(MetadataMatch).filter(MetadataMatch.is_adult).limit(limit).all()

    def list_media_items(self, limit: int = 50) -> List[MediaItem]:
        """Retrieve indexed physical media files."""
        return self.db.query(MediaItem).limit(limit).all()

    def list_libraries(self) -> List[Library]:
        """Retrieve registered media source roots."""
        return self.db.query(Library).all()
