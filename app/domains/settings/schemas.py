from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class SystemSettingRead(BaseSchema):
    key: str
    value: Any
    description: Optional[str] = None
    updated_at: datetime

class SystemSettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None

class UserSettingRead(BaseSchema):
    id: int
    user_id: int
    key: str
    value: Any
    description: Optional[str] = None
    updated_at: datetime

class UserSettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None
