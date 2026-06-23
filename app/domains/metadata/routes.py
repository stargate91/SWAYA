from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.shared_kernel.database import get_db
from app.infrastructure.scrapers.support.gateway import scraper_gateway
from app.domains.metadata.services.metadata_service import MetadataService
from app.domains.metadata.schemas import MetadataResolveRequest, BulkResolveRequest

library_router = APIRouter(prefix="/api/v1", tags=["Metadata"])

@library_router.get("/metadata/search")
def search_metadata(query: str, item_type: str = "movie", year: Optional[int] = None, provider: Optional[str] = None, include_adult: bool = False, season: Optional[int] = None, episode: Optional[int] = None, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).search_metadata(query, item_type=item_type, year=year, provider=provider, include_adult=include_adult, season=season, episode=episode)

@library_router.get("/metadata/tv/{tmdb_id}/seasons")
def get_metadata_seasons(tmdb_id: int, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).get_seasons(tmdb_id)

@library_router.get("/metadata/tv/{tmdb_id}/season/{season_number}/episodes")
def get_metadata_episodes(tmdb_id: int, season_number: int, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).get_episodes(tmdb_id, season_number)

@library_router.post("/metadata/resolve")
def resolve_metadata_item(payload: MetadataResolveRequest, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).resolve_item(payload)

@library_router.post("/metadata/bulk-resolve")
def bulk_resolve_metadata(payload: BulkResolveRequest, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).bulk_resolve(payload)

@library_router.get("/metadata/item/{item_id}/full-metadata")
def get_full_metadata(item_id: int, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).get_full_metadata(item_id)

@library_router.get("/metadata/sync-language/status")
def get_sync_language_status(db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).get_sync_status()

@library_router.post("/metadata/sync-language")
def trigger_sync_language(payload: dict = None, db: Session = Depends(get_db)):
    return MetadataService(db, scraper_gateway).trigger_sync(payload)
