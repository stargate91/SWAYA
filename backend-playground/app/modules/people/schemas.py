from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Optional, Any

class NumericAttributesMixin:
    @field_validator('height', 'weight', 'band_size', 'waist', 'hip', mode='before', check_fields=False)
    @classmethod
    def parse_int_field(cls, v: Any) -> Optional[int]:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return int(v)
        if isinstance(v, str):
            import re
            match = re.search(r'\d+', v)
            if match:
                return int(match.group(0))
        return None

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PersonRead(BaseSchema, NumericAttributesMixin):
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
    backdrop_path: Optional[str] = None
    local_backdrop_path: Optional[str] = None
    homepage: Optional[str] = None
    external_ids: Optional[dict[str, Any]] = None
    is_adult: bool
    
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    ethnicity: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    measurements: Optional[str] = None
    cup_size: Optional[str] = None
    band_size: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None
    tattoos: Optional[str] = None
    piercings: Optional[str] = None
    same_sex_only: Optional[str] = None
    breast_type: Optional[str] = None
    butt_shape: Optional[str] = None
    butt_size: Optional[str] = None
    primary_provider: Optional[str] = None
    field_routing: Optional[dict[str, str]] = None

class PersonSearchItem(BaseModel, NumericAttributesMixin):
    id: int
    name: str
    profile_path: Optional[str] = None
    gender: Optional[int] = None
    scene_count: Optional[int] = None
    rating_porndb: Optional[float] = None
    popularity: float
    is_adult: bool
    is_active: bool
    library_count: int
    known_for: Optional[str] = None
    user_rating: Optional[float] = None
    user_comment: Optional[str] = None
    is_favorite: Optional[bool] = False
    external_ids: Optional[dict[str, Any]] = None

class PeopleSearchResponse(BaseModel):
    items: List[PersonSearchItem]
    total: int
    has_more: bool
    offset: int
    limit: int

# --- Unified Frontend DTOs for People ---

class PersonCardDTO(BaseSchema):
    """Clean, light-weight Person card DTO used for UI performer grids, search & lists."""
    id: int
    name: str
    availability_type: str # "in_library" or "tracked_only"
    person_status: str     # "LOCAL_ACTOR", "TRACKED_REMOTE", "DISCOVERED"
    is_adult: bool
    profile_url: str
    backdrop_url: str
    popularity: Optional[float] = None
    rating_porndb: Optional[float] = None
    library_count: int = 0
    is_favorite: bool = False

class PersonDetailDTO(PersonCardDTO, NumericAttributesMixin):
    """Extended detail page DTO for Person profile views."""
    aliases: List[str] = []
    biography: Optional[str] = None
    birthday: Optional[str] = None
    deathday: Optional[str] = None
    place_of_birth: Optional[str] = None
    gender: Optional[int] = None
    known_for_department: Optional[str] = None
    homepage: Optional[str] = None
    career_start_year: Optional[int] = None
    career_end_year: Optional[int] = None
    
    # Physical / Adult Attributes
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    ethnicity: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    measurements: Optional[str] = None
    cup_size: Optional[str] = None
    band_size: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None
    breast_type: Optional[str] = None
    butt_shape: Optional[str] = None
    butt_size: Optional[str] = None
    tattoos: Optional[str] = None
    piercings: Optional[str] = None
    
    external_ids: dict[str, str] = {}
    gallery_urls: List[str] = []
    user_comment: Optional[str] = None

class PersonCreditItem(BaseSchema):
    id: Any
    title: str
    type: str
    tmdb_id: Optional[int] = 0
    year: Optional[int] = None
    release_date: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    rating: Optional[float] = 0.0
    rating_porndb: Optional[float] = None
    job: Optional[str] = "Actor"
    character: Optional[str] = None
    in_library: bool
    is_known_for: Optional[bool] = None

class PersonFilmographyResponse(BaseModel):
    items: List[PersonCreditItem]
    page: int
    page_size: int
    total_items: int
    total_pages: int
