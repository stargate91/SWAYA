import logging
import concurrent.futures
from typing import List, Optional, Callable, Any
from sqlalchemy.orm import Session



from app.modules.library.models import MediaItem
from app.core.enums import ItemStatus, ScanMode
from app.modules.scrapers.scan_resolution_pipelines import get_scan_resolution_pipeline
from app.core.constants import DEFAULT_MAX_WORKERS, DEFAULT_FALLBACK_LANGUAGE

logger = logging.getLogger(__name__)

class ScanResolver:
    def __init__(
        self,
        db_session: Session,
        mode: ScanMode = ScanMode.MOVIES_TV,
        stop_checker: Optional[Callable[[], bool]] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
        resolver: Optional[Any] = None,
        task_monitor: Optional["Any"] = None,
    ):
        self.db = db_session
        self.mode = mode
        self.stop_checker = stop_checker
        self.include_adult = include_adult
        self.provider = provider
        self.task_monitor = task_monitor
        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            self.resolver = MediaItemService(db_session)
        else:
            self.resolver = resolver

    def _stop_requested(self, task_id: Optional[int] = None) -> bool:
        if self.stop_checker and self.stop_checker():
            return True
        if task_id is not None and self.task_monitor:
            if self.task_monitor.is_cancelled(task_id):
                return True
        return False

    def resolve_all(self, items: List[MediaItem], progress_callback: Optional[Callable[[int, int], None]] = None, task_id: Optional[int] = None):
        if not items:
            return

        if self._stop_requested(task_id):
            logger.info("Scan stop requested before metadata resolution.")
            return

        logger.info(f"Phase 2: API Metadata Resolution for {len(items)} items...")

        # Deduplicate items by group_hash to avoid race conditions in propagate_match
        unique_items = []
        seen_hashes = set()
        for item in items:
            if not item.group_hash or item.library.is_adult or (item.library.target_media_types and "video" in item.library.target_media_types):
                unique_items.append(item)
            elif item.group_hash not in seen_hashes:
                unique_items.append(item)
                seen_hashes.add(item.group_hash)
        
        item_ids = [item.id for item in unique_items]
        total_items = len(item_ids)
        current_completed = 0

        # Read settings once on the scanner thread
        primary_lang = DEFAULT_FALLBACK_LANGUAGE
        fallback_lang = None
        try:
            from app.modules.settings.services.settings_service import SettingsService
            settings_service = SettingsService(self.db)
            primary_lang = settings_service.get_setting("primary_metadata_language") or DEFAULT_FALLBACK_LANGUAGE
            fallback_lang_val = settings_service.get_setting("fallback_metadata_language")
            fallback_lang = fallback_lang_val if fallback_lang_val and fallback_lang_val != "none" else None
        except Exception as settings_ex:
            logger.warning(f"Failed to load metadata language settings before resolution: {settings_ex}")

        def resolve_task(item_id: int):
            nonlocal current_completed
            try:
                if self._stop_requested(task_id):
                    return
                from app.modules.tasks import task_manager
                with task_manager.transaction() as local_db:
                    from app.modules.library.services.media_item_service import MediaItemService
                    local_repo = MediaItemService(local_db)
                    item = local_repo.get_item_by_id(item_id)
                    if not item:
                        return

                    if self._stop_requested(task_id):
                        return
                    pipeline = get_scan_resolution_pipeline(
                        local_db,
                        mode=self.mode,
                        include_adult=self.include_adult,
                        provider=self.provider,
                        media_resolver=local_repo,
                    )
                    pipeline.resolve_and_enrich(
                        item,
                        primary_language=primary_lang,
                        fallback_language=fallback_lang,
                        task_id=task_id,
                        stop_requested=lambda: self._stop_requested(task_id),
                    )
            except Exception as e:
                import traceback
                logger.error(f"Error resolving item ID {item_id}: {e}")
                logger.error(traceback.format_exc())
                try:
                    from app.modules.tasks import task_manager
                    with task_manager.transaction() as local_db:
                        from app.modules.library.services.media_item_service import MediaItemService
                        local_repo = MediaItemService(local_db)
                        db_item = local_repo.get_item_by_id(item_id)
                        if db_item:
                            local_repo.set_item_status(item_id, ItemStatus.ERROR)
                except Exception as status_ex:
                    logger.error(f"Failed to set ERROR status for item ID {item_id}: {status_ex}")
            finally:
                current_completed += 1
                if progress_callback:
                    try:
                        progress_callback(current_completed, total_items)
                    except Exception as cb_ex:
                        logger.warning(f"Progress callback raised exception: {cb_ex}")
 
        # ThreadPool for network requests (limited to avoid SQLite write lock contention and rate limits)
        executor = self.task_monitor.executor if self.task_monitor else concurrent.futures.ThreadPoolExecutor(max_workers=DEFAULT_MAX_WORKERS)
        # Limit to 10 concurrent workers to fetch network data faster while db_write_lock handles database concurrency
        max_workers = min(getattr(executor, "_max_workers", DEFAULT_MAX_WORKERS), 10)
        
        future_to_item = {}
        item_iter = iter(item_ids)

        while not self._stop_requested(task_id):
            while len(future_to_item) < max_workers:
                try:
                    item_id = next(item_iter)
                except StopIteration:
                    break
                future = executor.submit(resolve_task, item_id)
                future_to_item[future] = item_id

            if not future_to_item:
                break

            done, _pending = concurrent.futures.wait(set(future_to_item.keys()), return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                future.result()
                future_to_item.pop(future, None)

        for future in list(future_to_item.keys()):
            future.result()

        logger.info("Resolution complete.")
