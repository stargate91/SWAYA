from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PersonRead(BaseSchema):
    id: int
    name: str
    aliases: Optional[List[str]] = None
    birthday: Optional[str] = None
    deathday: Optional[str] = None
    place_of_birth: Optional[str] = None
    gender: Optional[int] = None
    known_for_department: Optional[str] = None
    popularity: Optional[float] = None
    rating_porndb: Optional[float] = None
    scene_count: Optional[int] = None
    profile_path: Optional[str] = None
    local_profile_path: Optional[str] = None
    external_ids: Optional[dict[str, Any]] = None
    is_adult: bool
    
    # Extended/Adult Attributes
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    ethnicity: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    measurements: Optional[str] = None
    cup_size: Optional[str] = None
    tattoos: Optional[str] = None
    piercings: Optional[str] = None
    orientation: Optional[str] = None
