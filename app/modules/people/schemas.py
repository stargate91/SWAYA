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
    
    # Extended/Adult Attributes
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

class PeopleGroupItem(BaseModel, NumericAttributesMixin):
    id: int
    name: str
    year: Optional[int] = None
    poster_path: Optional[str] = None
    rating: float
    popularity: float
    scene_count: Optional[int] = None
    rating_porndb: Optional[float] = None
    type: str
    is_active: bool
    is_favorite: bool
    user_rating: Optional[float] = None
    user_comment: Optional[str] = None
    birthday: str
    gender: Optional[int] = None
    library_count: int
    people_role: str
    is_adult_person: bool
    external_ids: dict[str, Any]
    cup_size: Optional[str] = None
    band_size: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    hair_color: Optional[str] = None
    ethnicity: Optional[str] = None
    eye_color: Optional[str] = None
    tattoos: Optional[str] = None
    piercings: Optional[str] = None
    breast_type: Optional[str] = None
    breast_size: Optional[str] = None
    butt_shape: Optional[str] = None
    butt_size: Optional[str] = None
    last_watched_at: Optional[str] = None
    watch_count: int = 0
    tag_count: int = 0
    finish_count: int = 0
    last_finish_at: Optional[str] = None

class PersonCardDTO(BaseModel, NumericAttributesMixin):
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
    birthday: Optional[str] = None
    cup_size: Optional[str] = None
    band_size: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    hair_color: Optional[str] = None
    ethnicity: Optional[str] = None
    eye_color: Optional[str] = None
    tattoos: Optional[str] = None
    piercings: Optional[str] = None
    breast_type: Optional[str] = None
    butt_shape: Optional[str] = None
    butt_size: Optional[str] = None


class PeopleSearchResponse(BaseModel):
    items: List[PersonCardDTO]
    total: int
    has_more: bool
    offset: int
    limit: int

PersonCardDTO = PersonCardDTO

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
    known_for_rank: Optional[int] = None
    source: Optional[str] = None

class PersonFilmographyResponse(BaseModel):
    items: List[PersonCreditItem]
    page: int
    page_size: int
    total_items: int
    total_pages: int

class ExternalLinkDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    provider: str
    external_id: str
    profile_url: Optional[str] = None
    source_data: Optional[dict[str, Any]] = None
    name: Optional[str] = None
    url: Optional[str] = None

class PersonFinishItem(BaseModel):
    id: int
    media_item_id: int
    video_position: int
    created_at: str
    snapshot_path: Optional[str] = None
    media_title: str

class PersonDetailDTO(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    name: str
    alternate_names: List[str]
    biography: Optional[str] = None
    birthday: Optional[str] = None
    deathday: Optional[str] = None
    place_of_birth: Optional[str] = None
    gender: Optional[int] = None
    popularity: float
    scene_count: Optional[int] = None
    rating_porndb: Optional[float] = None
    known_for_department: Optional[str] = None
    is_adult: bool
    profile_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    backdrop_source_tmdb_id: Optional[int] = None
    backdrop_source_media_type: Optional[str] = None
    is_active: bool
    homepage: Optional[str] = None
    external_ids: dict[str, Any]
    images: List[str]
    career_start_year: Optional[int] = None
    career_end_year: Optional[int] = None
    known_for: List[PersonCreditItem]
    total_movie_credits: int
    total_tv_credits: int
    total_scene_credits: int
    initial_movie_credits_page: PersonFilmographyResponse
    initial_tv_credits_page: PersonFilmographyResponse
    initial_scene_credits_page: PersonFilmographyResponse
    external_links: Optional[List[ExternalLinkDetail]] = None
    primary_provider: Optional[str] = None
    field_routing: Optional[dict[str, str]] = None
    suggested_tags: Optional[List[str]] = None
    custom_tags: Optional[List[str]] = None
    finish_count: Optional[int] = 0
    last_finish_at: Optional[str] = None
    finishes: List[PersonFinishItem] = []

PersonDetailDTO = PersonDetailDTO



class PersonStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    user_rating: Optional[float] = None
    is_favorite: Optional[bool] = None
    user_comment: Optional[str] = None
    custom_tags: Optional[List[str]] = None


class PersonAddTmdb(BaseModel):
    tmdb_id: Any
    name: Optional[str] = None
    profile_path: Optional[str] = None
    gender: Optional[int] = None
    is_adult: Optional[bool] = None

class PersonLinkPayload(BaseModel):
    source: str
    external_id: str
    overrides: Optional[dict[str, Any]] = None
    profile_url: Optional[str] = None

class PersonUnlinkPayload(BaseModel):
    source: str
    action: str
