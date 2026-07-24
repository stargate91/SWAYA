from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.modules.torrent.services import jackett_client, get_qbittorrent_client

router = APIRouter(prefix="/api/v1/torrent", tags=["Torrent"])

class DownloadRequest(BaseModel):
    torrent_url: str
    save_path: Optional[str] = None

@router.get("/search")
def search_torrents(query: str = Query(..., min_length=1)):
    """Search for torrents across all configured Jackett indexers."""
    try:
        results = jackett_client.search(query)
        # Parse into standard response schema
        formatted = []
        for r in results:
            formatted.append({
                "title": r.get("Title"),
                "size": r.get("Size"),
                "seeders": r.get("Seeders", 0),
                "leechers": r.get("Peers", 0),
                "downloadUrl": r.get("Link"),
                "magnetUri": r.get("MagnetUri"),
                "indexer": r.get("Tracker"),
                "indexerId": r.get("TrackerId"),
                "publishDate": r.get("PublishDate")
            })
        return {"results": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/indexers")
def list_indexers():
    """List indexers configured in Jackett."""
    return {"indexers": jackett_client.list_indexers()}

@router.post("/download")
def start_download(req: DownloadRequest, db: Session = Depends(get_db)):
    """Send a magnet link or torrent URL to qBittorrent."""
    client = get_qbittorrent_client(db)
    
    from app.modules.settings.services.settings_service import SettingsService
    settings = SettingsService(db)
    save_path = settings.get_setting("torrent_download_dir") or req.save_path
    
    success = client.add_torrent(req.torrent_url, save_path=save_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add torrent to qBittorrent client. Ensure client is running.")
    return {"status": "success", "message": "Download added to client."}

@router.post("/download/file")
async def start_download_file(file: UploadFile = File(...), save_path: Optional[str] = None, db: Session = Depends(get_db)):
    """Upload a torrent file and send to qBittorrent."""
    client = get_qbittorrent_client(db)
    contents = await file.read()
    
    from app.modules.settings.services.settings_service import SettingsService
    settings = SettingsService(db)
    resolved_save_path = settings.get_setting("torrent_download_dir") or save_path
    
    # Send torrent file as multipart/form-data
    files = {"torrents": (file.filename, contents, "application/x-bittorrent")}
    data = {"category": "swaya"}
    if resolved_save_path:
        data["savepath"] = resolved_save_path
        
    res = client._post("/api/v2/torrents/add", data=data, files=files)
    if res is None or res.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to add torrent file to qBittorrent.")
    return {"status": "success", "message": "Torrent file added to client."}

@router.get("/active")
def get_active_downloads(db: Session = Depends(get_db)):
    """Get active downloads and progress from qBittorrent."""
    client = get_qbittorrent_client(db)
    torrents = client.list_torrents()
    formatted = []
    for t in torrents:
        formatted.append({
            "hash": t.get("hash"),
            "name": t.get("name"),
            "size": t.get("size"),
            "progress": round(t.get("progress", 0) * 100, 1), # progress is 0.0 to 1.0
            "speed": t.get("dlspeed"), # bytes per second
            "eta": t.get("eta"), # seconds
            "state": t.get("state"),
            "num_seeds": t.get("num_seeds"),
            "num_leechs": t.get("num_leechs")
        })
    return {"downloads": formatted}

@router.post("/active/{torrent_hash}/pause")
def pause_download(torrent_hash: str, db: Session = Depends(get_db)):
    client = get_qbittorrent_client(db)
    # qBittorrent pause API: /api/v2/torrents/pause
    res = client._post("/api/v2/torrents/pause", data={"hashes": torrent_hash})
    if res is not None and res.status_code == 200:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to pause torrent.")

@router.post("/active/{torrent_hash}/resume")
def resume_download(torrent_hash: str, db: Session = Depends(get_db)):
    client = get_qbittorrent_client(db)
    # qBittorrent resume API: /api/v2/torrents/resume
    res = client._post("/api/v2/torrents/resume", data={"hashes": torrent_hash})
    if res is not None and res.status_code == 200:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to resume torrent.")

@router.delete("/active/{torrent_hash}")
def delete_download(torrent_hash: str, delete_files: bool = Query(False), db: Session = Depends(get_db)):
    client = get_qbittorrent_client(db)
    if client.delete_torrent(torrent_hash, delete_files=delete_files):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete torrent.")

@router.post("/test-qbittorrent")
def test_qbittorrent(db: Session = Depends(get_db)):
    """Test connection to the managed qBittorrent client."""
    client = get_qbittorrent_client(db)
    res = client._get("/api/v2/torrents/info", params={"limit": 1})
    if res is not None and res.status_code == 200:
        return {"status": "success", "message": "Successfully connected to qBittorrent."}
    raise HTTPException(status_code=400, detail="Could not connect to qBittorrent. Ensure it has started successfully.")
