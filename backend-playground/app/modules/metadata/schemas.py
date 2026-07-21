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
    popularity: Optional[float] = None
    runtime: Optional[int] = None
    imdb_id: Optional[str] = None
    original_title: Optional[str] = None
    is_active: bool
    is_adult: bool

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
