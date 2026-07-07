from pydantic import BaseModel
from typing import Optional, List, Union

class PlayMediaRequest(BaseModel):
    item_id: Union[str, int]

class PreviewMediaRequest(BaseModel):
    file_path: str
    start_seconds: Optional[float] = 0.0

class PathPayloadRequest(BaseModel):
    path: str

class WatchHistoryPayload(BaseModel):
    watched_at: Optional[str] = None

class PlaybackStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None
    player_type: Optional[str] = None
    port: Optional[int] = None
    resume_position: Optional[int] = None
    is_watched: Optional[bool] = None

class PlaybackLogDto(BaseModel):
    id: int
    watched_at: str

class WatchHistoryResponse(BaseModel):
    status: str
    watch_count: int
    is_watched: bool
    resume_position: int
    last_watched_at: Optional[str] = None
    playback_logs: List[PlaybackLogDto]

class WatchedHistoryItem(BaseModel):
    id: int
    media_item_id: int
    watched_at: str
    title: str
    type: str
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    resume_position: int
    duration: int
    is_watched: bool
    is_active: Optional[bool] = False
    tv_title: Optional[str] = None
    episode_title: Optional[str] = None
    tv_poster_path: Optional[str] = None

class WatchedHistoryResponse(BaseModel):
    items: List[WatchedHistoryItem]
    page: int
    has_more: bool

class PlaybackExtra(BaseModel):
    category: str
    path: str
    language: Optional[str] = None
    filename: Optional[str] = None

class DiscoveryItem(BaseModel):
    id: Union[int, str]
    title: str
    poster_path: Optional[str] = None
    media_type: str
    overview: Optional[str] = None

class NextEpisodeInfo(BaseModel):
    id: Union[int, str]
    title: str
    still_path: Optional[str] = None

class PlaybackInfoResponse(BaseModel):
    file_path: str
    start_seconds: int
    title: str
    logo_path: Optional[str] = None
    media_image: Optional[str] = None
    is_adult: Optional[bool] = False
    media_type: Optional[str] = None
    extras: Optional[List[PlaybackExtra]] = []
    user_rating: Optional[float] = None
    peaks_count: Optional[int] = 0
    collection_next: Optional[DiscoveryItem] = None
    next_episode: Optional[NextEpisodeInfo] = None
    first_episode: Optional[NextEpisodeInfo] = None
    performer_unwatched: Optional[DiscoveryItem] = None
    studio_unwatched: Optional[DiscoveryItem] = None
    surprise_me: Optional[DiscoveryItem] = None
    tv_show_id: Optional[str] = None
    tv_show_title: Optional[str] = None
    tv_show_poster: Optional[str] = None
    tv_show_rating: Optional[float] = None
    season_number: Optional[int] = None
    season_poster: Optional[str] = None
    episode_number: Optional[int] = None

class UpdatePlaybackProgressRequest(BaseModel):
    item_id: Union[str, int]
    current_time: int
    total_length: int
