from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict

from app.core.enums import (
    ItemStatus,
    MovieEdition,
    MediaSource,
    MediaAudioType,
    ExtraCategory,
    ExtraSubtype,
)

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class LibraryCreate(BaseSchema):
    name: str
    root_path: str
    watch_for_changes: bool = True

class LibraryUpdate(BaseSchema):
    name: Optional[str] = None
    root_path: Optional[str] = None
    watch_for_changes: Optional[bool] = None

class LibraryRead(BaseSchema):
    id: int
    name: str
    root_path: str
    watch_for_changes: bool
    created_at: datetime

class ExtraFileRead(BaseSchema):
    id: int
    media_item_id: int
    relative_path: str
    filename: str
    extension: str
    category: ExtraCategory
    subtype: Optional[ExtraSubtype] = None
    language: Optional[str] = None
    file_hash: Optional[str] = None

class MediaItemRead(BaseSchema):
    id: int
    library_id: int
    relative_path: str
    folder_name: Optional[str] = None
    filename: str
    extension: str
    size: int
    mtime: Optional[float] = None
    duration: Optional[float] = None
    resolution: Optional[str] = None
    video_codec: Optional[str] = None
    edition: MovieEdition
    audio_type: MediaAudioType
    source: MediaSource
    status: ItemStatus
    created_at: datetime
    updated_at: datetime
