# Import all schemas from domain layer to maintain backward compatibility
from app.domains.people.schemas import (
    BaseSchema as BaseSchema,
    PersonRead as PersonRead,
    PeopleGroupItem as PeopleGroupItem,
    PersonSearchItem as PersonSearchItem,
    PeopleSearchResponse as PeopleSearchResponse,
    PersonCreditItem as PersonCreditItem,
    PersonFilmographyResponse as PersonFilmographyResponse,
    ExternalLinkDetail as ExternalLinkDetail,
    PersonDetailResponse as PersonDetailResponse,
    PersonStatusUpdate as PersonStatusUpdate,
    PersonAddTmdb as PersonAddTmdb,
    PersonLinkPayload as PersonLinkPayload,
    PersonUnlinkPayload as PersonUnlinkPayload,
)
