# Import all schemas from domain layer to maintain backward compatibility
from app.domains.metadata.schemas import (
    BaseSchema,
    MetadataLocalizationRead,
    MetadataMatchRead,
    MetadataResolveRequest,
    BulkResolveRequest,
    GenericSuccessResponse,
    BulkActionResponse,
)
