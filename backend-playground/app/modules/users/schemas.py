from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.core.enums import MovieEdition, MediaAudioType, MediaSource, CustomListType

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseSchema):
    username: str
    email: Optional[str] = None
    password_hash: Optional[str] = None
    pin_hash: Optional[str] = None
    role: Optional[str] = None
    managed_by_user_id: Optional[int] = None
    allow_adult: bool = False

class UserRead(BaseSchema):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    managed_by_user_id: Optional[int] = None
    is_active: bool
    allow_adult: bool
    created_at: datetime

class UserOverrideCreate(BaseSchema):
    user_id: int
    media_item_id: Optional[int] = None
    metadata_match_id: Optional[int] = None
    person_id: Optional[int] = None
    studio_id: Optional[int] = None
    collection_id: Optional[int] = None
    custom_title: Optional[str] = None
    custom_overview: Optional[str] = None
    custom_poster: Optional[str] = None
    custom_backdrop: Optional[str] = None
    custom_logo: Optional[str] = None
    custom_language: Optional[str] = None
    custom_edition: Optional[MovieEdition] = None
    custom_audio_type: Optional[MediaAudioType] = None
    custom_source: Optional[MediaSource] = None
    user_rating: Optional[float] = None
    user_comment: Optional[str] = None
    is_favorite: bool = False
    is_watched: bool = False
    is_tracked: bool = False

class UserOverrideRead(BaseSchema):
    id: int
    user_id: int
    media_item_id: Optional[int] = None
    metadata_match_id: Optional[int] = None
    person_id: Optional[int] = None
    studio_id: Optional[int] = None
    collection_id: Optional[int] = None
    custom_title: Optional[str] = None
    custom_overview: Optional[str] = None
    custom_poster: Optional[str] = None
    custom_backdrop: Optional[str] = None
    custom_logo: Optional[str] = None
    custom_language: Optional[str] = None
    custom_edition: Optional[MovieEdition] = None
    custom_audio_type: Optional[MediaAudioType] = None
    custom_source: Optional[MediaSource] = None
    user_rating: Optional[float] = None
    user_rating_at: Optional[datetime] = None
    user_comment: Optional[str] = None
    user_comment_at: Optional[datetime] = None
    is_favorite: bool
    is_favorite_at: Optional[datetime] = None
    is_watched: bool
    last_watched_at: Optional[datetime] = None
    watch_count: int
    resume_position: int
    is_tracked: bool

class CustomListCreate(BaseSchema):
    user_id: int
    name: str
    description: Optional[str] = None
    list_type: CustomListType = CustomListType.MEDIA
    is_adult: bool = False
    color: Optional[str] = None

class CustomListRead(BaseSchema):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    list_type: CustomListType
    is_adult: bool
    color: Optional[str] = None
    custom_image_path: Optional[str] = None
    created_at: datetime
