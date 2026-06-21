from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import (
    Provider,
    MediaType,
    ItemStatus,
    RoleType,
    TaskStatus,
    AssetStatus,
    CacheStatus,
    MovieEdition,
    MediaSource,
    MediaAudioType,
    ActionType,
    ActionStatus,
    ExtraCategory,
    ExtraSubtype,
    CustomListType,
)


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Library Schemas ---

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


# --- ExtraFile Schemas ---

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


# --- MediaItem Schemas ---

class MediaItemRead(BaseSchema):
    id: int
    library_id: int
    relative_path: str
    folder_name: Optional[str] = None
    filename: str
    extension: str
    size: int
    mtime: Optional[float] = None
    hash_md5: Optional[str] = None
    hash_oshash: Optional[str] = None
    hash_sha256: Optional[str] = None
    group_hash: Optional[str] = None
    part_number: Optional[int] = None
    total_parts: Optional[int] = None
    internal_title: Optional[str] = None
    nfo_imdb_id: Optional[str] = None
    parsed_info: Optional[dict[str, Any]] = None
    duration: Optional[float] = None
    resolution: Optional[str] = None
    video_codec: Optional[str] = None
    video_bitrate: Optional[int] = None
    framerate: Optional[str] = None
    bit_depth: Optional[int] = None
    hdr_type: Optional[str] = None
    audio_codec: Optional[str] = None
    audio_channels: Optional[str] = None
    audio_bitrate: Optional[int] = None
    audio_streams: Optional[List[dict]] = None
    subtitle_streams: Optional[List[dict]] = None
    edition: MovieEdition
    audio_type: MediaAudioType
    source: MediaSource
    status: ItemStatus
    ignored_previous_status: Optional[ItemStatus] = None
    ignored_at: Optional[datetime] = None
    planned_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# --- MetadataMatch & Localization Schemas ---

class MetadataLocalizationRead(BaseSchema):
    id: int
    match_id: int
    locale: str
    title: str
    tagline: Optional[str] = None
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    local_poster_path: Optional[str] = None
    logo_path: Optional[str] = None
    local_logo_path: Optional[str] = None
    trailer_url: Optional[str] = None
    origin_country: Optional[List[str]] = None
    original_language: Optional[str] = None
    spoken_languages: Optional[List[str]] = None
    genres: Optional[List[str]] = None


class MetadataMatchRead(BaseSchema):
    id: int
    media_item_id: Optional[int] = None
    parent_id: Optional[int] = None
    collection_id: Optional[int] = None
    provider: Provider
    external_id: str
    media_type: MediaType
    season_number: Optional[int] = None
    episode_number: Optional[Any] = None
    number_of_seasons: Optional[int] = None
    number_of_episodes: Optional[int] = None

    rating_tmdb: Optional[float] = None
    rating_porndb: Optional[float] = None
    rating_imdb: Optional[float] = None
    rating_rotten: Optional[str] = None
    rating_meta: Optional[int] = None
    vote_count_tmdb: Optional[int] = None
    vote_count_imdb: Optional[int] = None
    budget: Optional[int] = None
    revenue: Optional[int] = None
    release_status: Optional[str] = None
    tv_type: Optional[str] = None
    release_date: Optional[datetime] = None
    last_air_date: Optional[datetime] = None
    popularity: Optional[float] = None
    runtime: Optional[int] = None
    imdb_id: Optional[str] = None
    original_title: Optional[str] = None
    backdrop_path: Optional[str] = None
    local_backdrop_path: Optional[str] = None
    still_path: Optional[str] = None
    local_still_path: Optional[str] = None
    suggested_tags: Optional[List[str]] = None
    stills: Optional[List[str]] = None
    local_stills: Optional[List[str]] = None
    fetched_locales: Optional[List[str]] = None
    raw_metadata: Optional[dict[str, Any]] = None
    is_active: bool
    is_adult: bool
    confidence_score: float

# --- Legacy Endpoints Request and Response Schemas ---

class ItemOverridesUpdate(BaseSchema):
    item_id: str
    custom_title: Optional[str] = None
    custom_overview: Optional[str] = None
    custom_language: Optional[str] = None
    user_rating: Optional[int] = None
    rating: Optional[int] = None
    user_comment: Optional[str] = None
    comment: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_watched: Optional[bool] = None
    resume_position: Optional[int] = None
    tags: Optional[List[Any]] = None


class ItemStatusUpdate(BaseSchema):
    status: str


class ImageOverrideUpdate(BaseSchema):
    path: Optional[str] = None
    url: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    logo_path: Optional[str] = None


class BulkOverridesUpdate(BaseSchema):
    item_ids: List[str]
    updates: dict[str, Any]


class BulkTagsUpdate(BaseSchema):
    item_ids: List[str]
    tag_ids: Optional[List[int]] = None
    tags: Optional[List[str]] = None
    action: str = "add"


class BulkWatchedUpdate(BaseSchema):
    item_ids: List[str]
    is_watched: bool = True
    watched_at: Optional[str] = None
    last_watched_at: Optional[str] = None


class MetadataResolveRequest(BaseSchema):
    item_id: int
    tmdb_id: Optional[int] = None
    external_id: Optional[str] = None
    type: Optional[str] = "movie"
    media_type: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[Any] = None
    provider: Optional[str] = "tmdb"


class BulkResolveRequest(BaseSchema):
    resolutions: List[MetadataResolveRequest]


class GenericSuccessResponse(BaseSchema):
    status: str = "success"
    message: Optional[str] = None


class BulkActionResponse(BaseSchema):
    status: str = "success"
    count: int = 0
