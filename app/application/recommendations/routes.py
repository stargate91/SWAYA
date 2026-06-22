from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.shared_kernel.database import get_db
from app.application.recommendations.recommendations_service import RecommendationsService
from app.application.recommendations.schemas import (
    RecommendationsResponse,
    DiscoveryGroupsResponse,
    ActionResponse,
)
from app.infrastructure.scrapers.gateway import scraper_gateway

router = APIRouter(prefix="/api/v1", tags=["Recommendations"])

class DiscoveryDeleteRequest(BaseModel):
    item_ids: Optional[List[int]] = None
    extra_ids: Optional[List[int]] = None
    mode: str = "db_only"

class WatchlistRequest(BaseModel):
    tmdb_id: int
    type: str = "movie"

class DiscoveryCountResponse(BaseModel):
    count: int

@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(language: Optional[str] = None, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).get_recommendations(language=language)

@router.get("/discovery", response_model=DiscoveryGroupsResponse)
def get_discovery_items(db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).get_discovery_groups()

@router.get("/discovery/count", response_model=DiscoveryCountResponse)
def get_discovery_item_count(db: Session = Depends(get_db)):
    return {"count": RecommendationsService(db, scraper_gateway).get_discovery_item_count()}

@router.post("/discovery/delete", response_model=ActionResponse)
def delete_discovery_items(request: DiscoveryDeleteRequest, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).delete_discovery_items(
        item_ids=request.item_ids or [],
        extra_ids=request.extra_ids or [],
        mode=request.mode
    )

@router.post("/watchlist", response_model=ActionResponse)
def add_to_watchlist(request: WatchlistRequest, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).add_to_watchlist(request.tmdb_id, request.type)

@router.delete("/watchlist/{tmdb_id}", response_model=ActionResponse)
def remove_from_watchlist(tmdb_id: int, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).remove_from_watchlist(tmdb_id)
