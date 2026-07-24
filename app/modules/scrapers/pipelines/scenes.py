from typing import Optional

from app.modules.library.models import MediaItem
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE

from app.modules.scrapers.pipelines.base import BaseResolverPipeline


class SceneAutoResolverPipeline(BaseResolverPipeline):
    def __init__(self, adult_resolver):
        self.adult = adult_resolver

    def resolve_item(
        self,
        item: MediaItem,
        *,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
    ):
        self.adult.resolve_primary_scene_item(item, task_id)


class StashDbSceneResolverPipeline(BaseResolverPipeline):
    def __init__(self, adult_resolver):
        self.adult = adult_resolver

    def resolve_item(
        self,
        item: MediaItem,
        *,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
    ):
        from app.core.enums import Provider
        self.adult.resolve_provider_scene_item(item, Provider.STASHDB, task_id)


class FansDbSceneResolverPipeline(BaseResolverPipeline):
    def __init__(self, adult_resolver):
        self.adult = adult_resolver

    def resolve_item(
        self,
        item: MediaItem,
        *,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
    ):
        from app.core.enums import Provider
        self.adult.resolve_provider_scene_item(item, Provider.FANSDB, task_id)


class PornDbSceneResolverPipeline(BaseResolverPipeline):
    def __init__(self, adult_resolver):
        self.adult = adult_resolver

    def resolve_item(
        self,
        item: MediaItem,
        *,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
    ):
        from app.core.enums import Provider
        self.adult.resolve_provider_scene_item(item, Provider.PORNDB, task_id)
