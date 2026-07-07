from typing import Optional, Any

from app.domains.library.models import MediaItem
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.enums import ItemStatus, ScanMode
from app.shared_kernel.ports.library_port import LibraryPort

class BaseScanResolutionPipeline:
    def __init__(
        self,
        db_session,
        *,
        mode: ScanMode,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
        library_port: Optional[LibraryPort] = None,
        resolver: Optional[Any] = None
    ):
        self.db = db_session
        self.mode = mode
        self.include_adult = include_adult
        self.provider = provider
        if library_port is None:
            from app.infrastructure.media.db_media_resolver import DbMediaResolver
            self.library_port = DbMediaResolver(db_session)
        else:
            self.library_port = library_port

        if resolver is None:
            from app.infrastructure.scrapers.resolver import Resolver
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

        if self.mode not in (ScanMode.SCENES, ScanMode.OFFLINE):
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

        siblings = self.library_port.get_siblings_by_group_hash(item.group_hash, item.id)
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
        library_port: Optional[LibraryPort] = None,
        resolver: Optional[Any] = None,
        enricher: Optional[Any] = None
    ):
        super().__init__(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            library_port=library_port,
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
            from app.infrastructure.scrapers.enrichment.metadata_enricher import MetadataEnricher
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


class PornDbMovieScanResolutionPipeline(MainstreamScanResolutionPipeline):
    pass


def get_scan_resolution_pipeline(
    db_session,
    mode: ScanMode = ScanMode.MOVIES_TV,
    include_adult: Optional[bool] = None,
    provider: Optional[str] = None,
    library_port: Optional[LibraryPort] = None,
    resolver: Optional[Any] = None,
    enricher: Optional[Any] = None
):
    if mode == ScanMode.OFFLINE:
        return OfflineScanResolutionPipeline(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            library_port=library_port,
            resolver=resolver
        )
    if mode == ScanMode.SCENES:
        return ScenesScanResolutionPipeline(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            library_port=library_port,
            resolver=resolver
        )
    if mode == ScanMode.PORNDB_MOVIE:
        return PornDbMovieScanResolutionPipeline(
            db_session,
            mode=mode,
            include_adult=include_adult,
            provider=provider,
            library_port=library_port,
            resolver=resolver,
            enricher=enricher
        )
    return MainstreamScanResolutionPipeline(
        db_session,
        mode=mode,
        include_adult=include_adult,
        provider=provider,
        library_port=library_port,
        resolver=resolver,
        enricher=enricher
    )

