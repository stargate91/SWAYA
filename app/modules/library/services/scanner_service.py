import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session



from app.modules.library.services.scanner.service.status_coordinator import StatusCoordinator
from app.modules.library.services.scanner.service.library_scanner import LibraryScanner
from app.modules.library.services.scanner.service.renamer_runner import RenamerRunner

logger = logging.getLogger(__name__)

class ScannerService:
    # Link class-level variables to StatusCoordinator to maintain external/internal compatibility
    scan_status_lock = StatusCoordinator.scan_status_lock
    scan_status = StatusCoordinator.scan_status

    def __init__(self, db: Session, scan_resolver_factory: Optional[Any] = None, resolver: Optional[Any] = None, task_manager=None, settings: Optional[Any] = None, fs: Optional[Any] = None, formatter_factory: Optional[Any] = None, move_with_progress_fn: Optional[Any] = None, send_to_trash_fn: Optional[Any] = None):
        self.db = db
        if task_manager is None:
            from app.modules.tasks import task_manager as _tm
            task_manager = _tm
        self.task_manager = task_manager
        self.scan_resolver_factory = scan_resolver_factory
        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            resolver = MediaItemService(db)
        self.resolver = resolver
        if settings is None:
            from app.modules.settings.services.settings_service import SettingsService
            settings = SettingsService(db)
        self.settings = settings
        if fs is None:
            from app.modules.library.filesystem.fs_utils import FileSystemService
            fs = FileSystemService()
        self.fs = fs
        self.formatter_factory = formatter_factory
        self.move_with_progress_fn = move_with_progress_fn
        self.send_to_trash_fn = send_to_trash_fn

        # Subcomponent delegation
        self.status_coordinator = StatusCoordinator(self.db, self.task_manager)
        self.library_scanner = LibraryScanner(self)
        self.renamer_runner = RenamerRunner(self)

    @classmethod
    def create(cls, db: Session, scan_resolver_factory: Optional[Any] = None) -> "ScannerService":
        from app.modules.library.filesystem.fs_utils import move_with_progress, send_to_trash
        from app.modules.settings.services.formatter_config_service import build_formatter_from_db
        if scan_resolver_factory is None:
            from app.modules.scrapers.scan_resolver import ScanResolver
            scan_resolver_factory = ScanResolver
        return cls(
            db,
            scan_resolver_factory=scan_resolver_factory,
            formatter_factory=build_formatter_from_db,
            move_with_progress_fn=move_with_progress,
            send_to_trash_fn=send_to_trash
        )

    def get_scan_status(self) -> Dict[str, Any]:
        return self.status_coordinator.get_scan_status()

    def get_hydrate_status(self) -> Dict[str, Any]:
        return self.status_coordinator.get_hydrate_status()

    def get_image_status(self) -> Dict[str, Any]:
        return self.status_coordinator.get_image_status()

    def reset_image_status(self) -> Dict[str, Any]:
        return self.status_coordinator.reset_image_status()

    def _is_stop_requested(self) -> bool:
        return self.status_coordinator.is_stop_requested()

    def stop_active_task(self) -> Dict[str, Any]:
        return self.status_coordinator.stop_active_task()

    # =========================================================================
    # Scanner Operations
    # =========================================================================

    def start_scan(
        self,
        paths: List[str],
        stop_after: Optional[str] = None,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.library_scanner.start_scan(paths, stop_after, mode, include_adult, provider)

    async def _run_scan(
        self,
        task_id: int,
        paths: List[str],
        stop_after: Optional[str] = None,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ):
        await self.library_scanner._run_scan(task_id, paths, stop_after, mode, include_adult, provider)

    def start_retry(
        self,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.library_scanner.start_retry(mode, include_adult, provider)

    async def _run_retry(
        self,
        task_id: int,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ):
        await self.library_scanner._run_retry(task_id, mode, include_adult, provider)

    # =========================================================================
    # Renamer / Revert Operations
    # =========================================================================

    def start_rename(self, item_ids: Optional[List[int]] = None, organize_in_place: bool = False) -> Dict[str, Any]:
        return self.renamer_runner.start_rename(item_ids, organize_in_place)

    async def _run_rename(self, task_id: int, item_ids: Optional[List[int]] = None):
        await self.renamer_runner._run_rename(task_id, item_ids)

    def start_undo(self, batch_id: int) -> Dict[str, Any]:
        return self.renamer_runner.start_undo(batch_id)

    async def _run_undo(self, task_id: int, batch_id: int):
        await self.renamer_runner._run_undo(task_id, batch_id)
