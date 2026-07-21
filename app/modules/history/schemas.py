from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from app.core.enums import ActionType, ActionStatus

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PlaybackLogRead(BaseSchema):
    id: int
    user_id: int
    media_item_id: int
    watched_at: datetime
    position_seconds: int
    session_id: Optional[str] = None
    completion_rate: float = 0.0
    is_completed: bool = False
    watched_ranges: Optional[List[Any]] = None
    seek_events: Optional[List[Any]] = None

class PlaybackPeakLogRead(BaseSchema):
    id: int
    user_id: int
    media_item_id: int
    peak_type: str = "peak"
    video_position: int
    end_position: Optional[int] = None
    label: Optional[str] = None
    snapshot_path: Optional[str] = None
    created_at: datetime

class ActionLogRead(BaseSchema):
    id: int
    batch_id: int
    media_item_id: Optional[int] = None
    action_type: ActionType
    status: ActionStatus
    is_reversible: bool
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    snapshot_data: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: datetime

class ActionBatchRead(BaseSchema):
    id: int
    user_id: int
    name: Optional[str] = None
    is_reversible: bool
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
