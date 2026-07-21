from typing import Optional

from app.modules.library.models import MediaItem
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE


class BaseResolverPipeline:
    def resolve_item(
        self,
        item: MediaItem,
        *,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
    ):
        raise NotImplementedError
