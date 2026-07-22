from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict
from app.core.enums import Provider, MediaType

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class MetadataLocalizationRead(BaseSchema):
    id: int
    match_id: int
    locale: str
    is_default: bool = False
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

class MetadataResolveRequest(BaseSchema):
    item_id: int
    tmdb_id: Optional[Any] = None
    external_id: Optional[str] = None
    type: Optional[str] = "movie"
    media_type: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[Any] = None
    provider: Optional[str] = "tmdb"
    is_adult: Optional[bool] = False

class BulkResolveRequest(BaseSchema):
    resolutions: List[MetadataResolveRequest]

class GenericSuccessResponse(BaseSchema):
    status: str = "success"
    message: Optional[str] = None

class BulkActionResponse(BaseSchema):
    status: str = "success"
    count: int = 0

# --- Unified Frontend DTOs ---

class MediaCardDTO(BaseSchema):
    """Clean, light-weight card DTO used across UI grids, search, recommendations & lists."""
    id: int
    media_item_id: Optional[int] = None
    title: str
    year: Optional[int] = None
    media_type: str
    availability_type: str # "in_library" or "tracked_only"
    is_adult: bool
    rating: Optional[float] = None
    poster_url: str
    backdrop_url: str
    user_rating: Optional[float] = None
    is_favorite: bool = False
    is_watched: bool = False
    display_episode_code: Optional[str] = None

class MediaDetailDTO(MediaCardDTO):
    """Extended detail page DTO inheriting all card fields + adding full metadata context."""
    release_date: Optional[str] = None
    overview: Optional[str] = None
    tagline: Optional[str] = None
    runtime: Optional[int] = None
    vote_count_tmdb: Optional[int] = None
    vote_count_imdb: Optional[int] = None
    genres: List[str] = []
    studios: List[str] = []
    director: Optional[str] = None
    cast: List[dict[str, Any]] = []
    stills: List[str] = []
    provider_ids: dict[str, str] = {}
    user_comment: Optional[str] = None
    custom_tags: List[str] = []
    file_info: Optional[dict[str, Any]] = None
