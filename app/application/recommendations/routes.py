from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.shared_kernel.database import get_db
from app.application.recommendations.recommendations_service import RecommendationsService
from app.application.recommendations.schemas import RecommendationsResponse, ActionResponse
from app.infrastructure.scrapers.support.gateway import scraper_gateway

router = APIRouter(prefix="/api/v1", tags=["Recommendations"])

class WatchlistRequest(BaseModel):
    tmdb_id: int
    type: str = "movie"

@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(language: Optional[str] = None, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).get_recommendations(language=language)

@router.post("/watchlist", response_model=ActionResponse)
def add_to_watchlist(request: WatchlistRequest, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).add_to_watchlist(request.tmdb_id, request.type)

@router.delete("/watchlist/{tmdb_id}", response_model=ActionResponse)
def remove_from_watchlist(tmdb_id: int, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).remove_from_watchlist(tmdb_id)


@router.get("/recommendations/discover")
def discover_recommendations(
    genre_id: Optional[int] = None,
    year: Optional[int] = None,
    language: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return RecommendationsService(db, scraper_gateway).discover_top_items(
        genre_id=genre_id,
        year=year,
        language=language
    )
