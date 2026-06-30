# Import all schemas from domain layer to maintain backward compatibility
from app.domains.people.schemas import (
    BaseSchema,
    PersonRead,
    PeopleGroupItem,
    PersonSearchItem,
    PeopleSearchResponse,
    PersonCreditItem,
    PersonFilmographyResponse,
    ExternalLinkDetail,
    PersonDetailResponse,
    PersonStatusUpdate,
    PersonAddTmdb,
    PersonLinkPayload,
    PersonUnlinkPayload,
)
