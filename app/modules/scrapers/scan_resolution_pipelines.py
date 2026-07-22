from typing import Optional, Any

from app.modules.library.models import MediaItem
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.core.enums import ItemStatus, ScanMode


class BaseScanResolutionPipeline:
    def __init__(
        self,
        db_session,
        *,
        mode: ScanMode,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
        media_resolver: Optional[Any] = None,
        resolver: Optional[Any] = None
    ):
        self.db = db_session
        self.mode = mode
        self.include_adult = include_adult
        self.provider = provider
        if media_resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            self.media_resolver = MediaItemService(db_session)
        else:
            self.media_resolver = media_resolver

        if resolver is None:
            from app.modules.scrapers.resolver import Resolver
            self.resolver = Resolver(db_session)
        else:
            self.resolver = resolver

    def resolve_and_enrich(
        self,
        item: MediaItem,
        *,
        primary_language: str = DEFAULT_FALLBACK_LANGUAGE,
        fallback_language: Optional[str] = None,
        task_id: Optional[int] = None,
        stop_requested=None,
    ):
        self.resolver.resolve_item(
            item,
            mode=self.mode,
            language=primary_language,
            task_id=task_id,
            include_adult=self.include_adult,
            provider=self.provider,
        )

        if stop_requested and stop_requested():
            return

        if not item.library.is_adult and not (item.library.target_media_types and "video" in item.library.target_media_types):
            self.resolver.propagate_match(item)

        if item.status != ItemStatus.MATCHED:
            return

        self.enrich_matched_item(
            item,
            primary_language=primary_language,
            fallback_language=fallback_language,
            task_id=task_id,
            stop_requested=stop_requested,
        )

        if not item.group_hash:
            return

        siblings = self.media_resolver.get_siblings_by_group_hash(item.group_hash, item.id)
        for sibling in siblings:
            if stop_requested and stop_requested():
                return
            self.enrich_matched_item(
                sibling,
                primary_language=primary_language,
                fallback_language=fallback_language,
                task_id=task_id,
                stop_requested=stop_requested,
            )

    def enrich_matched_item(
        self,
        item: MediaItem,
        *,
        primary_language: str = DEFAULT_FALLBACK_LANGUAGE,
        fallback_language: Optional[str] = None,
        task_id: Optional[int] = None,
        stop_requested=None,
    ):
        raise NotImplementedError



class MainstreamScanResolutionPipeline(BaseScanResolutionPipeline):
    def __init__(
        self,
        db_session,
        *,
        mode: ScanMode,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
        media_resolver: Optional[Any] = None,
        resolver: Optional[Any] = None,
        enricher: Optional[Any] = None
    ):
        super().__init__(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            media_resolver=media_resolver,
            resolver=resolver
        )
        self.enricher = enricher

    def enrich_matched_item(
        self,
        item: MediaItem,
        *,
        primary_language: str = DEFAULT_FALLBACK_LANGUAGE,
        fallback_language: Optional[str] = None,
        task_id: Optional[int] = None,
        stop_requested=None,
    ):
        enricher = self.enricher
        if enricher is None:
            from app.modules.scrapers.enrichment.metadata_enricher import MetadataEnricher
            enricher = MetadataEnricher(self.db)
        enricher.enrich_matched_item(
            item,
            language=primary_language,
            fallback_language=fallback_language,
        )


class ScenesScanResolutionPipeline(BaseScanResolutionPipeline):
    def enrich_matched_item(
        self,
        item: MediaItem,
        *,
        primary_language: str = DEFAULT_FALLBACK_LANGUAGE,
        fallback_language: Optional[str] = None,
        task_id: Optional[int] = None,
        stop_requested=None,
    ):
        return


class OfflineScanResolutionPipeline(BaseScanResolutionPipeline):
    def enrich_matched_item(
        self,
        item: MediaItem,
        *,
        primary_language: str = DEFAULT_FALLBACK_LANGUAGE,
        fallback_language: Optional[str] = None,
        task_id: Optional[int] = None,
        stop_requested=None,
    ):
        return


def get_scan_resolution_pipeline(
    db_session,
    mode: ScanMode = ScanMode.MOVIES_TV,
    include_adult: Optional[bool] = None,
    provider: Optional[str] = None,
    media_resolver: Optional[Any] = None,
    resolver: Optional[Any] = None,
    enricher: Optional[Any] = None
):
    profile = mode.profile
    if profile.pipeline_type == "offline":
        return OfflineScanResolutionPipeline(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            media_resolver=media_resolver,
            resolver=resolver
        )
    if profile.pipeline_type == "scene":
        return ScenesScanResolutionPipeline(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            media_resolver=media_resolver,
            resolver=resolver
        )
    return MainstreamScanResolutionPipeline(
        db_session,
        mode=mode,
        include_adult=include_adult,
        provider=provider,
        media_resolver=media_resolver,
        resolver=resolver,
        enricher=enricher
    )

