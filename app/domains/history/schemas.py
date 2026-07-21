from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from app.core.enums import ActionType, ActionStatus

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Playback History ---

class PlaybackLogRead(BaseSchema):
    id: int
    user_id: int
    media_item_id: int
    watched_at: datetime
    position_seconds: int


class PlaybackPeakLogRead(BaseSchema):
    id: int
    user_id: int
    media_item_id: int
    video_position: int
    created_at: datetime
    snapshot_path: Optional[str] = None


# --- Action History (Audit) ---

class ActionLogRead(BaseSchema):
    id: int
    batch_id: int
    media_item_id: Optional[int] = None
    action_type: ActionType
    status: ActionStatus
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    error_message: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: datetime


class ActionBatchRead(BaseSchema):
    id: int
    user_id: int
    name: Optional[str] = None
    created_at: datetime
    logs: List[ActionLogRead] = []


class HistoryLogItem(BaseModel):
    id: int
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    status: str
    error_message: Optional[str] = None


class HistoryBatchItem(BaseModel):
    id: int
    name: str
    created_at: str
    success_count: int
    failed_count: int
    movie_count: int
    episode_count: int
    extra_count: int
    remaining_count: int
    undone_count: int
    status: str
    logs: List[HistoryLogItem]


class HistoryResponse(BaseModel):
    items: List[HistoryBatchItem]
    page: int
    has_more: bool
