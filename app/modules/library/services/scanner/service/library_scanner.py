import asyncio
import logging
import time
from typing import List, Optional, Any, Dict

from app.core.enums import ScanMode
from app.modules.library.services.scanner.service.status_coordinator import StatusCoordinator

logger = logging.getLogger(__name__)

class LibraryScanner:
    """
    Submodule to coordinate scanning libraries, resolving matches, and retrying failed items.
    """
    def __init__(self, service):
        self.service = service

    @property
    def db(self):
        return self.service.db

    @property
    def task_manager(self):
        return self.service.task_manager

    @property
    def resolver(self):
        return self.service.resolver

    @property
    def scan_resolver_factory(self):
        return self.service.scan_resolver_factory

    def start_scan(
        self,
        paths: List[str],
        stop_after: Optional[str] = None,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        with StatusCoordinator.scan_status_lock:
            if StatusCoordinator.scan_status.get("active"):
                return {"status": "error", "message": f"Task already in progress: {StatusCoordinator.scan_status.get('phase')}"}
            
            StatusCoordinator.scan_status.update({
                "active": True,
                "phase": "starting",
                "current": 0,
                "total": 0,
                "start_time": time.time(),
                "can_stop": True,
                "stop_requested": False,
                "current_file_progress": 0.0,
                "last_completed": 0,
            })
                
        task_id = self.task_manager.create_task("Library Scan")
        self.task_manager.start_task(task_id, self._run_scan, paths, stop_after, mode, include_adult, provider)
        return {"message": "Scan started in background", "paths": paths}

    async def _run_scan(
        self,
        task_id: int,
        paths: List[str],
        stop_after: Optional[str] = None,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ):
        self.task_manager.download_worker.is_paused = True
        with StatusCoordinator.scan_status_lock:
            StatusCoordinator.scan_status.update({
                "active": True,
                "phase": "collecting",
                "current": 0,
                "total": 0,
                "start_time": time.time(),
                "can_stop": True,
                "stop_requested": False,
            })
            
        scan_mode = mode if mode is not None else ScanMode.MOVIES_TV
        with StatusCoordinator.scan_status_lock:
            StatusCoordinator.scan_status["scan_mode"] = scan_mode.value
        logger.info("[scan:%s] Starting background scan | task_id=%s | paths=%s | include_adult=%s", scan_mode.value, task_id, paths, include_adult)
        
        from app.core.database import SessionLocal
        from app.modules.library.services.media_item_service import MediaItemService
        from app.modules.settings.services.settings_service import SettingsService
        
        task_db = SessionLocal()
        task_resolver = MediaItemService(task_db)
        task_settings = SettingsService(task_db)
        
        try:
            repaired_count = task_resolver.repair_inconsistent_matched_items()
            if repaired_count > 0:
                logger.info(f"Automatically repaired {repaired_count} inconsistent matched items by resetting status to NEW.")

            libraries_to_scan = []
            all_libs = task_resolver.get_all_libraries()
            
            import os
            for p in paths:
                norm_p = p.replace("\\", "/").rstrip("/")
                matched_lib = None
                for lib in all_libs:
                    lib_p = lib.root_path.replace("\\", "/").rstrip("/")
                    if lib_p == norm_p or norm_p.startswith(lib_p + "/"):
                        matched_lib = lib
                        break
                    elif lib_p.startswith(norm_p + "/"):
                        # Promote/widen child library to parent path norm_p
                        logger.info(f"Promoting library '{lib.name}' ({lib.id}) root path from {lib.root_path} to {p}")
                        old_root = lib.root_path
                        lib.root_path = p
                        lib.name = os.path.basename(p) or "Library"
                        
                        # Update relative paths of media items in this library
                        from app.modules.library.models import MediaItem, ExtraFile
                        items = task_db.query(MediaItem).filter(MediaItem.library_id == lib.id).all()
                        for item in items:
                            abs_path = os.path.join(old_root, item.relative_path)
                            item.relative_path = os.path.relpath(abs_path, p).replace("\\", "/")
                            
                        # Update ExtraFiles in the library
                        extras = task_db.query(ExtraFile).join(MediaItem).filter(MediaItem.library_id == lib.id).all()
                        for ex in extras:
                            abs_path = os.path.join(old_root, ex.relative_path)
                            ex.relative_path = os.path.relpath(abs_path, p).replace("\\", "/")
                            
                        matched_lib = lib
                        break
            lib_to_paths = {}
            for p in paths:
                norm_p = p.replace("\\", "/").rstrip("/")
                matched_lib = None
                for lib in all_libs:
                    lib_p = lib.root_path.replace("\\", "/").rstrip("/")
                    if lib_p == norm_p or norm_p.startswith(lib_p + "/"):
                        matched_lib = lib
                        break
                    elif lib_p.startswith(norm_p + "/"):
                        matched_lib = lib
                        break
                if matched_lib:
                    if matched_lib not in libraries_to_scan:
                        libraries_to_scan.append(matched_lib)
                    if matched_lib.id not in lib_to_paths:
                        lib_to_paths[matched_lib.id] = []
                    lib_to_paths[matched_lib.id].append(p)
                else:
                    is_adult_lib = bool(include_adult or scan_mode == ScanMode.SCENES)
                    new_lib = task_resolver.create_library(name=os.path.basename(p) or "Library", root_path=p, is_adult=is_adult_lib)
                    libraries_to_scan.append(new_lib)
                    if new_lib.id not in lib_to_paths:
                        lib_to_paths[new_lib.id] = []
                    lib_to_paths[new_lib.id].append(p)

            if not libraries_to_scan:
                libraries_to_scan = all_libs
            else:
                task_db.commit()

            total_items_to_enrich = []
            from app.modules.library.services.scanner.scanner_manager import ScannerManager
            scanner = ScannerManager(task_db, settings=task_settings, fs=self.service.fs)
            
            logger.info("[scan:%s] Libraries selected: %s", scan_mode.value, [lib.root_path for lib in libraries_to_scan])

            for lib in libraries_to_scan:
                if self.service._is_stop_requested():
                    break
                def progress_cb(pct):
                    with StatusCoordinator.scan_status_lock:
                        StatusCoordinator.scan_status["current"] = int(pct * 100)
                        StatusCoordinator.scan_status["total"] = 100
                    scale = scan_mode.profile.collect_progress_weight
                    self.task_manager.update_progress(task_id, pct * scale)
                
                lib_paths = lib_to_paths.get(lib.id)
                to_enrich, _ = await asyncio.to_thread(
                    scanner.scan_library,
                    lib.id,
                    mode=scan_mode,
                    progress_callback=progress_cb,
                    provider=provider,
                    paths=lib_paths
                )
                logger.info("[scan:%s] Library %s produced %s items to enrich (paths=%s)", scan_mode.value, lib.root_path, len(to_enrich), lib_paths)
                total_items_to_enrich.extend(to_enrich)

            logger.info("[scan:%s] Total items queued for resolver: %s", scan_mode.value, len(total_items_to_enrich))

            if total_items_to_enrich and not self.service._is_stop_requested():
                with StatusCoordinator.scan_status_lock:
                    StatusCoordinator.scan_status["phase"] = "resolving"
                    StatusCoordinator.scan_status["current"] = 0
                    StatusCoordinator.scan_status["total"] = len(total_items_to_enrich)
                    
                if self.scan_resolver_factory:
                    resolver = self.scan_resolver_factory(
                        task_db,
                        mode=scan_mode,
                        stop_checker=self.service._is_stop_requested,
                        include_adult=include_adult,
                        provider=provider,
                    )
                else:
                    raise RuntimeError("scan_resolver_factory is required but not provided")

                def resolve_progress_cb(current, total):
                    with StatusCoordinator.scan_status_lock:
                        StatusCoordinator.scan_status["current"] = current
                        StatusCoordinator.scan_status["total"] = total
                    if scan_mode == ScanMode.OFFLINE:
                        progress = 90.0 + (current / total) * 10.0
                    else:
                        progress = 50.0 + (current / total) * 50.0
                    self.task_manager.update_progress(task_id, progress)
                    
                await asyncio.to_thread(resolver.resolve_all, total_items_to_enrich, progress_callback=resolve_progress_cb, task_id=task_id)
                logger.info("[scan:%s] Resolver phase finished for %s items", scan_mode.value, len(total_items_to_enrich))

            if total_items_to_enrich:
                match_ids = task_resolver.get_metadata_match_ids_for_media_items([item.id for item in total_items_to_enrich])
                if match_ids:
                    logger.info("[scan:%s] Queueing %s match ids for people enrichment", scan_mode.value, len(match_ids))
                    self.task_manager.people_enrich_worker.enqueue_enrich(match_ids)
                    
        except Exception as e:
            logger.error(f"Scan task failed: {e}", exc_info=True)
            raise e
        finally:
            task_db.close()
            logger.info("[scan:%s] Scan task finished", scan_mode.value)
            self.task_manager.download_worker.is_paused = False
            with StatusCoordinator.scan_status_lock:
                StatusCoordinator.scan_status["active"] = False
                StatusCoordinator.scan_status["phase"] = "idle"
                StatusCoordinator.scan_status["can_stop"] = False
                StatusCoordinator.scan_status["stop_requested"] = False

    def start_retry(
        self,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        with StatusCoordinator.scan_status_lock:
            if StatusCoordinator.scan_status.get("active"):
                return {"status": "error", "message": f"Task already in progress: {StatusCoordinator.scan_status.get('phase')}"}
            
            StatusCoordinator.scan_status.update({
                "active": True,
                "phase": "starting",
                "current": 0,
                "total": 0,
                "start_time": time.time(),
                "can_stop": True,
                "stop_requested": False,
                "current_file_progress": 0.0,
                "last_completed": 0,
            })
                
        task_id = self.task_manager.create_task("Library Scan (Retry)")
        self.task_manager.start_task(task_id, self._run_retry, mode, include_adult, provider)
        return {"message": "Retry started in background"}

    async def _run_retry(
        self,
        task_id: int,
        mode: Optional[Any] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ):
        self.task_manager.download_worker.is_paused = True
        scan_mode = mode if mode is not None else ScanMode.MOVIES_TV
        
        with StatusCoordinator.scan_status_lock:
            StatusCoordinator.scan_status.update({
                "active": True,
                "phase": "starting",
                "current": 0,
                "total": 0,
                "start_time": time.time(),
                "can_stop": True,
                "stop_requested": False,
            })
            
        logger.info("[scan:%s] Starting background scan retry | task_id=%s | provider=%s", scan_mode.value, task_id, provider)
        
        from app.core.database import SessionLocal
        from app.modules.library.services.media_item_service import MediaItemService
        
        task_db = SessionLocal()
        task_resolver = MediaItemService(task_db)
        
        try:
            items_to_retry = task_resolver.get_items_for_scan_retry(scan_mode)
            logger.info("[scan:%s] Found %s items to retry resolving.", scan_mode.value, len(items_to_retry))
            
            if items_to_retry and not self.service._is_stop_requested():
                task_resolver.reset_items_for_retry([item.id for item in items_to_retry])
                
                with StatusCoordinator.scan_status_lock:
                    StatusCoordinator.scan_status["phase"] = "resolving"
                    StatusCoordinator.scan_status["current"] = 0
                    StatusCoordinator.scan_status["total"] = len(items_to_retry)
                    
                if self.scan_resolver_factory:
                    resolver = self.scan_resolver_factory(
                        task_db,
                        mode=scan_mode,
                        stop_checker=self.service._is_stop_requested,
                        include_adult=include_adult,
                        provider=provider,
                    )
                else:
                    raise RuntimeError("scan_resolver_factory is required but not provided")
                
                def resolve_progress_cb(current, total):
                    with StatusCoordinator.scan_status_lock:
                        StatusCoordinator.scan_status["current"] = current
                        StatusCoordinator.scan_status["total"] = total
                    progress = (current / total) * 100.0
                    self.task_manager.update_progress(task_id, progress)
                    
                await asyncio.to_thread(resolver.resolve_all, items_to_retry, progress_callback=resolve_progress_cb, task_id=task_id)
                logger.info("[scan:%s] Retry Resolver phase finished for %s items", scan_mode.value, len(items_to_retry))
                
                match_ids = task_resolver.get_metadata_match_ids_for_media_items([item.id for item in items_to_retry])
                if match_ids:
                    logger.info("[scan:%s] Queueing %s match ids for people enrichment", scan_mode.value, len(match_ids))
                    self.task_manager.people_enrich_worker.enqueue_enrich(match_ids)
                        
        except Exception as e:
            logger.error(f"Scan retry task failed: {e}", exc_info=True)
            raise e
        finally:
            task_db.close()
            logger.info("[scan:%s] Scan retry task finished", scan_mode.value)
            self.task_manager.download_worker.is_paused = False
            with StatusCoordinator.scan_status_lock:
                StatusCoordinator.scan_status["active"] = False
                StatusCoordinator.scan_status["phase"] = "idle"
                StatusCoordinator.scan_status["can_stop"] = False
                StatusCoordinator.scan_status["stop_requested"] = False
