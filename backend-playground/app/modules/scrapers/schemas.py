from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime
from app.core.enums import Provider, MediaType, CacheStatus

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class APICacheRead(BaseSchema):
    id: int
    provider: Provider
    cache_key: str
    external_id: Optional[str] = None
    media_type: Optional[MediaType] = None
    status_code: Optional[int] = None
    status: CacheStatus
    updated_at: datetime
    expires_at: Optional[datetime] = None
