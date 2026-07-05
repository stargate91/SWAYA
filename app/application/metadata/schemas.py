# Import all schemas from domain layer to maintain backward compatibility
from app.domains.metadata.schemas import (
    BaseSchema as BaseSchema,
    MetadataLocalizationRead as MetadataLocalizationRead,
    MetadataMatchRead as MetadataMatchRead,
    MetadataResolveRequest as MetadataResolveRequest,
    BulkResolveRequest as BulkResolveRequest,
    GenericSuccessResponse as GenericSuccessResponse,
    BulkActionResponse as BulkActionResponse,
)
