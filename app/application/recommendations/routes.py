from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.shared_kernel.database import get_db
from app.application.recommendations.recommendations_service import RecommendationsService
from app.application.recommendations.schemas import RecommendationsResponse, ActionResponse
from app.infrastructure.scrapers.support.gateway import scraper_gateway

from typing import Union

router = APIRouter(prefix="/api/v1", tags=["Recommendations"])

class WatchlistRequest(BaseModel):
    tmdb_id: Optional[Union[int, str]] = None
    media_item_id: Optional[int] = None
    type: str = "movie"

@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(language: Optional[str] = None, include_adult: Optional[bool] = None, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).get_recommendations(language=language, include_adult=include_adult)

@router.post("/watchlist", response_model=ActionResponse)
def add_to_watchlist(request: WatchlistRequest, db: Session = Depends(get_db)):
    return RecommendationsService(db, scraper_gateway).add_to_watchlist(
        tmdb_id=request.tmdb_id,
        media_type=request.type,
        media_item_id=request.media_item_id
    )

@router.delete("/watchlist/{tmdb_id}", response_model=ActionResponse)
def remove_from_watchlist(tmdb_id: str, db: Session = Depends(get_db)):
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


@router.get("/recommendations/recently-added")
def get_recently_added(
    page: int = 1,
    limit: int = 20,
    include_adult: Optional[bool] = None,
    language: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return RecommendationsService(db, scraper_gateway).get_recently_added_paginated(
        page=page,
        limit=limit,
        include_adult=include_adult,
        language=language
    )


@router.get("/recommendations/recently-activated-people")
def get_recently_activated_people(
    page: int = 1,
    limit: int = 20,
    include_adult: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    return RecommendationsService(db, scraper_gateway).get_recently_activated_people_paginated(
        page=page,
        limit=limit,
        include_adult=include_adult
    )
