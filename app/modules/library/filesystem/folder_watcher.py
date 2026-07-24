import os
import time
import logging
import threading
from pathlib import Path
from typing import Set, Any, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from app.core.database import SessionLocal
from app.modules.library.models import Library, MediaItem
from app.core.enums import ItemStatus

logger = logging.getLogger("app.folder_watcher")

_ignored_paths: Set[str] = set()
_lock = threading.Lock()
_observer: Optional[Observer] = None

def ignore_path(path: Any) -> None:
    if not path:
        return
    try:
        resolved = str(Path(path).resolve())
    except Exception as e:
        logger.debug(f"Watcher: Failed to resolve path '{path}', using raw string: {e}")
        resolved = str(path)
    with _lock:
        _ignored_paths.add(resolved)
        logger.debug(f"Watcher: Added to bypass registry: {resolved}")

def stop_ignoring(path: Any) -> None:
    if not path:
        return
    try:
        resolved = str(Path(path).resolve())
    except Exception as e:
        logger.debug(f"Watcher: Failed to resolve path '{path}', using raw string: {e}")
        resolved = str(path)
    with _lock:
        _ignored_paths.discard(resolved)
        logger.debug(f"Watcher: Removed from bypass registry: {resolved}")

def is_path_ignored(path: str) -> bool:
    try:
        resolved = str(Path(path).resolve())
    except Exception as e:
        logger.debug(f"Watcher: Failed to resolve path '{path}', using raw string: {e}")
        resolved = str(path)
    with _lock:
        if resolved in _ignored_paths:
            return True
        for p in _ignored_paths:
            if resolved.startswith(p + os.sep):
                return True
        return False


class LibraryFileHandler(FileSystemEventHandler):
    def __init__(self, library_id: int, root_path: str):
        super().__init__()
        self.library_id = library_id
        self.root_path = os.path.normpath(root_path)

    def on_deleted(self, event):
        if event.is_directory:
            return
        src_path = os.path.normpath(event.src_path)
        if is_path_ignored(src_path):
            logger.debug(f"Watcher: Ignored deletion event (bypass registry) for: {src_path}")
            return

        # Debounce/delay check slightly to allow any atomic operations or renames to finish
        threading.Thread(target=self._handle_deleted_delayed, args=(src_path,), daemon=True).start()

    def on_created(self, event):
        if event.is_directory:
            return
        src_path = os.path.normpath(event.src_path)
        if is_path_ignored(src_path):
            logger.debug(f"Watcher: Ignored creation event (bypass registry) for: {src_path}")
            return

        threading.Thread(target=self._handle_created_delayed, args=(src_path,), daemon=True).start()

    def on_moved(self, event):
        if event.is_directory:
            return
        src_path = os.path.normpath(event.src_path)
        dest_path = os.path.normpath(event.dest_path)
        if is_path_ignored(src_path) or is_path_ignored(dest_path):
            logger.debug(f"Watcher: Ignored move event (bypass registry) for: {src_path} -> {dest_path}")
            return

        threading.Thread(target=self._handle_moved_delayed, args=(src_path, dest_path), daemon=True).start()

    def _handle_deleted_delayed(self, src_path: str):
        time.sleep(2.0)  # Debounce delay
        if os.path.exists(src_path):
            # File got recreated or operation was temporary, ignore
            return

        logger.info(f"Watcher: Detected deletion of tracked path: {src_path}")
        with SessionLocal() as session:
            try:
                # Resolve relative path
                rel_path = os.path.relpath(src_path, self.root_path)
                item = session.query(MediaItem).filter(
                    MediaItem.library_id == self.library_id,
                    MediaItem.relative_path == rel_path
                ).first()

                if item and item.status != ItemStatus.MISSING:
                    item.status = ItemStatus.MISSING
                    session.commit()
                    logger.info(f"Watcher: Marked MediaItem ID {item.id} as MISSING ({src_path})")
            except Exception as e:
                session.rollback()
                logger.error(f"Watcher: Error handling deleted event: {e}", exc_info=True)

    def _handle_created_delayed(self, src_path: str):
        time.sleep(2.0)  # Debounce delay
        if not os.path.exists(src_path):
            # File went away again, ignore
            return

        logger.info(f"Watcher: Detected creation/restore of tracked path: {src_path}")
        with SessionLocal() as session:
            try:
                rel_path = os.path.relpath(src_path, self.root_path)
                item = session.query(MediaItem).filter(
                    MediaItem.library_id == self.library_id,
                    MediaItem.relative_path == rel_path
                ).first()

                if item and item.status == ItemStatus.MISSING:
                    # Restore status based on existing matches
                    has_active_match = any(m.is_active for m in item.matches)
                    item.status = ItemStatus.MATCHED if has_active_match else ItemStatus.NO_MATCH
                    session.commit()
                    logger.info(f"Watcher: Restored MediaItem ID {item.id} status to {item.status} ({src_path})")
            except Exception as e:
                session.rollback()
                logger.error(f"Watcher: Error handling created event: {e}", exc_info=True)

    def _handle_moved_delayed(self, src_path: str, dest_path: str):
        time.sleep(2.0)
        if not os.path.exists(dest_path):
            return

        if not dest_path.startswith(self.root_path):
            # Moved out of library folder, treat as deletion
            self._handle_deleted_delayed(src_path)
            return

        logger.info(f"Watcher: Detected external move: {src_path} -> {dest_path}")
        with SessionLocal() as session:
            try:
                old_rel = os.path.relpath(src_path, self.root_path)
                new_rel = os.path.relpath(dest_path, self.root_path)
                
                item = session.query(MediaItem).filter(
                    MediaItem.library_id == self.library_id,
                    MediaItem.relative_path == old_rel
                ).first()

                if item:
                    item.relative_path = new_rel
                    item.filename = os.path.basename(dest_path)
                    item.folder_name = os.path.basename(os.path.dirname(dest_path))
                    session.commit()
                    logger.info(f"Watcher: Updated MediaItem ID {item.id} path to {new_rel} after external move/rename")
            except Exception as e:
                session.rollback()
                logger.error(f"Watcher: Error handling moved event: {e}", exc_info=True)


def start_watcher() -> None:
    global _observer
    if _observer is not None:
        logger.warning("Watcher: Observer is already running.")
        return

    logger.info("Watcher: Starting folder watcher service...")
    try:
        with SessionLocal() as session:
            libraries = session.query(Library).filter(Library.watch_for_changes).all()
            if not libraries:
                logger.info("Watcher: No libraries configured for real-time monitoring.")
                return

            _observer = Observer()
            for lib in libraries:
                if os.path.exists(lib.root_path):
                    handler = LibraryFileHandler(lib.id, lib.root_path)
                    _observer.schedule(handler, lib.root_path, recursive=True)
                    logger.info(f"Watcher: Scheduled monitoring for library: {lib.name} ({lib.root_path})")
                else:
                    logger.warning(f"Watcher: Library root path does not exist, skipping: {lib.root_path}")

            _observer.start()
            logger.info("Watcher: Folder watcher started successfully.")
    except Exception as e:
        logger.error(f"Watcher: Failed to start folder watcher: {e}", exc_info=True)
        _observer = None

def stop_watcher() -> None:
    global _observer
    if _observer is None:
        return

    logger.info("Watcher: Stopping folder watcher service...")
    try:
        _observer.stop()
        _observer.join()
        logger.info("Watcher: Folder watcher stopped successfully.")
    except Exception as e:
        logger.error(f"Watcher: Error stopping folder watcher: {e}", exc_info=True)
    finally:
        _observer = None
