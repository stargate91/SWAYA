from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.shared_kernel.database import get_db
from app.application.media.playback_service import PlaybackService

from app.application.media.schemas import (
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

router = APIRouter(prefix="/api/v1", tags=["Media Playback"])

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
    from app.infrastructure.playback.playback_monitor import active_sessions
    return list(active_sessions)

