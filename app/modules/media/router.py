from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
import os
import requests
import urllib3
import hashlib
from urllib.parse import urlparse
from PIL import Image, ImageFilter, ImageEnhance
import io
import logging

from app.core.database import get_db
from app.core.enums import ScanMode
from app.modules.library.services.scanner_service import ScannerService
from app.modules.history.schemas import HistoryResponse
from app.modules.media.services.playback_service import PlaybackService
from app.modules.media.schemas import (
    PlayMediaRequest,
    PreviewMediaRequest,
    PathPayloadRequest,
    WatchHistoryPayload,
    PlaybackStatusResponse,
    WatchHistoryResponse,
    WatchedHistoryResponse,
    PlaybackInfoResponse,
    UpdatePlaybackProgressRequest,
)

# Combine endpoints under single router
router = APIRouter(prefix="/api/v1", tags=["Media Operations & Playback"])


def _scanner_service(db: Session, scan_resolver_factory=None) -> ScannerService:
    from app.modules.library.db_media_resolver import DbMediaResolver
    from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
    from app.modules.library.filesystem.fs_utils import DbFileSystemAdapter, move_with_progress, send_to_trash
    from app.modules.settings.adapters.formatter_config_adapter import build_formatter_from_db
    return ScannerService(
        db,
        scan_resolver_factory=scan_resolver_factory,
        library_port=DbMediaResolver(db),
        settings_port=DbSettingsAdapter(db),
        fs_port=DbFileSystemAdapter(),
        formatter_factory=build_formatter_from_db,
        move_with_progress_fn=move_with_progress,
        send_to_trash_fn=send_to_trash
    )

class ScanRequest(BaseModel):
    paths: List[str]
    stop_after: Optional[str] = None
    mode: ScanMode = ScanMode.MOVIES_TV
    include_adult: Optional[bool] = None
    provider: Optional[str] = None

class RenameRequest(BaseModel):
    item_ids: Optional[List[int]] = None
    organize_in_place: bool = False

class RetryRequest(BaseModel):
    mode: ScanMode = ScanMode.MOVIES_TV
    include_adult: Optional[bool] = None
    provider: Optional[str] = None

@router.get("/scan-status")
def get_scan_status(db: Session = Depends(get_db)):
    return _scanner_service(db).get_scan_status()

@router.get("/hydrate-status")
def get_hydrate_status(db: Session = Depends(get_db)):
    return _scanner_service(db).get_hydrate_status()

@router.get("/image-status")
def get_image_status(db: Session = Depends(get_db)):
    return _scanner_service(db).get_image_status()

@router.post("/reset-image-status")
def reset_image_status(db: Session = Depends(get_db)):
    return _scanner_service(db).reset_image_status()

@router.post("/scan")
def start_scan(request: ScanRequest, db: Session = Depends(get_db)):
    from app.modules.scrapers.scan_resolver import ScanResolver
    return _scanner_service(db, scan_resolver_factory=ScanResolver).start_scan(
        request.paths,
        request.stop_after,
        request.mode,
        request.include_adult,
        request.provider,
    )

@router.post("/scan/retry")
def start_retry(request: RetryRequest, db: Session = Depends(get_db)):
    from app.modules.scrapers.scan_resolver import ScanResolver
    return _scanner_service(db, scan_resolver_factory=ScanResolver).start_retry(
        request.mode,
        request.include_adult,
        request.provider,
    )

@router.post("/task/stop")
def stop_active_task(db: Session = Depends(get_db)):
    return _scanner_service(db).stop_active_task()

@router.post("/rename/start")
def start_rename(request: Optional[RenameRequest] = None, db: Session = Depends(get_db)):
    item_ids = request.item_ids if request else None
    organize_in_place = request.organize_in_place if request else False
    return _scanner_service(db).start_rename(item_ids, organize_in_place)


@router.get("/history", response_model=HistoryResponse)
def get_history(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    from app.modules.history.services.history_service import HistoryService
    return HistoryService(db).get_history(page, limit)

@router.post("/rename/undo/{batch_id}")
def undo_rename(batch_id: int, db: Session = Depends(get_db)):
    return _scanner_service(db).start_undo(batch_id)


@router.get("/media/image-proxy")
def image_proxy(
    url: str = Query(..., description="The remote image URL to proxy"),
    blur: bool = Query(False),
    width: Optional[int] = Query(None, description="Optional target width for resizing")
):
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    logger = logging.getLogger("app.media.image_proxy")
    
    if url.startswith("//"):
        url = "https:" + url
        
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")
        
    try:
        cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "media", "images", "cache", "proxy"))
        os.makedirs(cache_dir, exist_ok=True)
        
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
        cache_key = f"{url_hash}_b_{blur}_w_{width or 'orig'}"
        cache_path = os.path.join(cache_dir, cache_key)
        
        if os.path.exists(cache_path):
            ext_type = "image/jpeg"
            if "png" in url.lower():
                ext_type = "image/png"
            elif "webp" in url.lower():
                ext_type = "image/webp"
            
            def iter_file():
                with open(cache_path, "rb") as f:
                    yield from f
            return StreamingResponse(iter_file(), media_type=ext_type)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": f"{parsed.scheme}://{parsed.netloc}/"
        }
        response = requests.get(url, headers=headers, stream=True, timeout=5.0, verify=False)
        response.raise_for_status()
        
        content_type = response.headers.get("Content-Type", "image/jpeg")
        
        if blur or width:
            img = Image.open(io.BytesIO(response.content))
            
            if width and img.width > width:
                aspect = img.height / img.width
                new_height = int(width * aspect)
                img = img.resize((width, new_height), Image.Resampling.LANCZOS)
                
            if blur:
                img = img.filter(ImageFilter.GaussianBlur(32))
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(0.20)
                
            out_io = io.BytesIO()
            fmt = "JPEG"
            if "png" in content_type.lower():
                fmt = "PNG"
            elif "webp" in content_type.lower():
                fmt = "WEBP"
            img.save(out_io, format=fmt)
            
            with open(cache_path, "wb") as cache_file:
                cache_file.write(out_io.getvalue())
                
            out_io.seek(0)
            return StreamingResponse(out_io, media_type=content_type)
            
        raw_data = response.content
        with open(cache_path, "wb") as cache_file:
            cache_file.write(raw_data)
            
        return StreamingResponse(io.BytesIO(raw_data), media_type=content_type)
    except Exception as e:
        logger.warning(f"Image proxy failed for URL {url}, redirecting client directly: {e}")
        return RedirectResponse(url)


@router.get("/media/{item_id}/preview")
def get_media_preview(item_id: int, resolution: int = 720, db: Session = Depends(get_db)):
    from app.modules.library.models import MediaItem
    from app.modules.library.services.preview_service import PreviewService

    item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found")
    
    if not item.library or not item.library.root_path:
        raise HTTPException(status_code=400, detail="Invalid library configuration for media item")
        
    filepath = os.path.join(item.library.root_path, item.relative_path)
    
    try:
        from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
        settings_adapter = DbSettingsAdapter(db)
        duration = settings_adapter.get_setting("hover_previews_duration") or 16

        preview_service = PreviewService()
        preview_path = preview_service.generate_preview(filepath, str(item_id), preview_duration=int(duration), resolution=resolution)
        return FileResponse(preview_path, media_type="video/mp4")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logging.getLogger(__name__).error(f"Error generating preview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {e}")


# --- Playback Endpoints ---

@router.get("/media/playback-info/{item_id}", response_model=PlaybackInfoResponse)
def get_playback_info(item_id: str, db: Session = Depends(get_db)):
    return PlaybackService(db).get_playback_info(item_id)

@router.post("/media/progress", response_model=PlaybackStatusResponse)
def update_playback_progress(payload: UpdatePlaybackProgressRequest, db: Session = Depends(get_db)):
    return PlaybackService(db).update_playback_progress(payload.item_id, payload.current_time, payload.total_length)

@router.post("/media/play", response_model=PlaybackStatusResponse)
def play_media_item(payload: PlayMediaRequest, db: Session = Depends(get_db)):
    return PlaybackService(db).play_media_item(payload.item_id)

@router.post("/media/preview", response_model=PlaybackStatusResponse)
def preview_media_file(payload: PreviewMediaRequest, db: Session = Depends(get_db)):
    return PlaybackService(db).preview_media_file(payload.file_path, payload.start_seconds)

@router.post("/reveal", response_model=PlaybackStatusResponse)
def reveal_in_explorer(payload: PathPayloadRequest, db: Session = Depends(get_db)):
    return PlaybackService(db).reveal_in_explorer(payload.path)

@router.post("/open-path", response_model=PlaybackStatusResponse)
def open_path(payload: PathPayloadRequest, db: Session = Depends(get_db)):
    return PlaybackService(db).open_path(payload.path)

@router.get("/library/watched-history", response_model=WatchedHistoryResponse)
def get_watched_history(page: int = 1, limit: int = 20, include_adult: bool = False, db: Session = Depends(get_db)):
    return PlaybackService(db).get_watched_history(page=page, limit=limit, include_adult=include_adult)

@router.post("/library/item/{item_id}/watch-history", response_model=WatchHistoryResponse)
def add_watch_history_entry(item_id: int, payload: Optional[WatchHistoryPayload] = None, db: Session = Depends(get_db)):
    watched_at = payload.watched_at if payload else None
    return PlaybackService(db).add_watch_history_entry(item_id, watched_at)

@router.put("/library/item/{item_id}/watch-history/{log_id}", response_model=WatchHistoryResponse)
def update_watch_history_entry(item_id: int, log_id: int, payload: Optional[WatchHistoryPayload] = None, db: Session = Depends(get_db)):
    watched_at = payload.watched_at if payload else None
    return PlaybackService(db).update_watch_history_entry(item_id, log_id, watched_at)

@router.delete("/library/item/{item_id}/watch-history/{log_id}", response_model=WatchHistoryResponse)
def delete_watch_history_entry(item_id: int, log_id: int, db: Session = Depends(get_db)):
    return PlaybackService(db).delete_watch_history_entry(item_id, log_id)

@router.post("/library/item/{item_id}/reset-progress", response_model=PlaybackStatusResponse)
def reset_item_progress(item_id: int, db: Session = Depends(get_db)):
    return PlaybackService(db).reset_item_progress(item_id)

@router.get("/media/active-sessions", response_model=List[int])
def get_active_sessions():
    from app.modules.history.playback.playback_monitor import active_sessions
    return list(active_sessions)
