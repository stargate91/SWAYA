from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.modules.history.models import PlaybackLog, PlaybackPeakLog, ActionBatch
from app.modules.history.schemas import (
    PlaybackLogRead,
    PlaybackPeakLogRead,
    ActionBatchRead,
)

router = APIRouter(prefix="/api/v1/history", tags=["History"])


# --- Playback History (Watched) ---

@router.get("/playback", response_model=List[PlaybackLogRead])
def get_playback_history(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve playback / watched history logs."""
    return db.query(PlaybackLog).order_by(PlaybackLog.watched_at.desc()).limit(limit).all()


# --- Peak Moments History ---

@router.get("/peaks", response_model=List[PlaybackPeakLogRead])
def get_peak_history(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve peak / hot-spot moments marked by users."""
    return db.query(PlaybackPeakLog).order_by(PlaybackPeakLog.created_at.desc()).limit(limit).all()


@router.get("/peaks-decorated")
def get_peaks_decorated(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve peak moments decorated with media item info."""
    from app.modules.library.models import MediaItem
    
    from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
    from app.core.language import LanguageService
    
    logs = db.query(PlaybackPeakLog).order_by(PlaybackPeakLog.created_at.desc()).limit(limit).all()
    results = []
    
    for log in logs:
        item = db.query(MediaItem).filter(MediaItem.id == log.media_item_id).first()
        if not item:
            continue
            
        active_match = next((match for match in item.matches if match.is_active), None)
        title = item.filename
        poster_path = None
        backdrop_path = None
        media_type = None
        
        if active_match:
            media_type = active_match.media_type if active_match.media_type else None
            loc = LanguageService.get_best_localization(active_match.localizations, DEFAULT_FALLBACK_LANGUAGE)
            if loc:
                title = loc.title
                poster_path = loc.local_poster_path or loc.poster_path
                backdrop_path = active_match.local_backdrop_path or active_match.backdrop_path
            else:
                if active_match.original_title:
                    title = active_match.original_title
                    
        from app.modules.media_assets.services.images import image_processing_service
        resolved_poster = None
        resolved_backdrop = None
        resolved_snapshot = None
        if poster_path:
            resolved_poster = image_processing_service.resolve_image_url(poster_path, "posters")
        if backdrop_path:
            resolved_backdrop = image_processing_service.resolve_image_url(backdrop_path, "backdrops")
        if getattr(log, "snapshot_path", None):
            snap_path = log.snapshot_path
            if not snap_path.startswith("/media/"):
                if snap_path.startswith("snapshots/"):
                    snap_path = f"/media/images/{snap_path}"
                else:
                    snap_path = f"/media/images/snapshots/{snap_path}"
            resolved_snapshot = image_processing_service.resolve_image_url(snap_path, "snapshots")
            
        results.append({
            "id": log.id,
            "media_item_id": log.media_item_id,
            "video_position": log.video_position,
            "created_at": log.created_at.isoformat(),
            "title": title,
            "poster_path": resolved_poster,
            "backdrop_path": resolved_backdrop,
            "snapshot_path": resolved_snapshot,
            "duration": int(item.duration) if item.duration else 0,
            "media_type": media_type
        })
        
    return results


# --- Action Batches / File History ---

@router.get("/actions", response_model=List[ActionBatchRead])
def get_action_history(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve file/metadata auditing operation batches."""
    return db.query(ActionBatch).order_by(ActionBatch.created_at.desc()).limit(limit).all()


# --- Action Undo ---

async def run_undo_coroutine(task_id: int, batch_id: int):
    import logging
    from app.modules.media.services.renamer_engine import RenamerEngine
    from app.core.database import SessionLocal
    from app.modules.tasks import task_manager

    logger = logging.getLogger(__name__)
    db = SessionLocal()
    try:
        from app.modules.library.filesystem.fs_utils import move_with_progress, send_to_trash
        from app.modules.settings.services.formatter_config_service import build_formatter_from_db
        engine = RenamerEngine(
            db,
            formatter=build_formatter_from_db(db),
            move_with_progress_fn=move_with_progress,
            send_to_trash_fn=send_to_trash
        )
        
        def progress_cb(current, total):
            progress = (current / total) * 100.0 if total > 0 else 100.0
            task_manager.update_progress(task_id, progress)
            
        def stop_check():
            return task_manager.is_cancelled(task_id)
            
        undone_count = engine.undo_batch(batch_id, progress_callback=progress_cb, stop_check=stop_check)
        logger.info(f"Undo complete for batch {batch_id}. Reverted {undone_count} items.")
    except Exception as e:
        logger.error(f"Undo coroutine failed for batch {batch_id}: {e}", exc_info=True)
        raise
    finally:
        db.close()

@router.post("/actions/{batch_id}/undo")
def undo_action_batch(batch_id: int, db: Session = Depends(get_db)):
    """
    Triggers a background task to undo a file/metadata operation batch.
    """
    batch = db.query(ActionBatch).filter(ActionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Action batch not found")
    
    from app.modules.tasks import task_manager
    task_id = task_manager.create_task(name=f"undo_batch_{batch_id}")
    task_manager.start_task(task_id, run_undo_coroutine, batch_id)
    
    return {"status": "undo_pending", "task_id": task_id, "batch_id": batch_id}
