from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Any

from app.shared_kernel.database import get_db
from app.infrastructure.scrapers.support.gateway import scraper_gateway
from app.application.people.schemas import (
    PeopleSearchResponse,
    PersonDetailResponse,
    PersonFilmographyResponse,
    PersonAddTmdb,
)

router = APIRouter(prefix="/api/v1/people", tags=["General People"])

def _people_detail_service(db: Session, scrapers=None) -> Any:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    from app.infrastructure.tasks.tasks_image_download_adapter import TasksImageDownloadAdapter
    from app.domains.people.services.people_detail_service import PeopleDetailService
    return PeopleDetailService(
        db,
        scrapers or scraper_gateway,
        library_port=DbMediaResolver(db),
        image_downloader=TasksImageDownloadAdapter()
    )


@router.get("", response_model=PeopleSearchResponse)
def get_people(
    search: str = None,
    role: str = None,
    sort_by: str = "library_count",
    include_inactive: bool = False,
    adult_only: bool = False,
    gender: str = "all",
    offset: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_people(
        search=search, role=role, sort_by=sort_by, include_inactive=include_inactive,
        adult_only=adult_only, gender=gender, offset=offset, limit=limit
    )

@router.post("/add-tmdb")
def add_person_tmdb(
    payload: PersonAddTmdb,
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).add_person_tmdb(
        db_id_or_external=payload.tmdb_id,
        name=payload.name,
        profile_path=payload.profile_path,
        gender=payload.gender,
        is_adult=payload.is_adult,
        is_active=True
    )

@router.get("/search-tmdb")
def search_people_tmdb(
    query: str,
    language: str = None,
    adult_only: bool = False,
    page: int = 1,
    source: str = "all",
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).search_people_tmdb(
        query=query, language=language, adult_only=adult_only, page=page, source=source
    )

@router.get("/{person_id}", response_model=PersonDetailResponse)
def get_person_detail(person_id: str, db: Session = Depends(get_db)):
    return _people_detail_service(db).get_person_detail(person_id)

@router.get("/{person_id}/movies", response_model=PersonFilmographyResponse)
def get_person_movies(
    person_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1),
    source: str = Query(default=None),
    local_only: bool = Query(default=False),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_person_movies(person_id, page=page, page_size=page_size, source=source, local_only=local_only)

@router.get("/{person_id}/tv", response_model=PersonFilmographyResponse)
def get_person_tv(
    person_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1),
    local_only: bool = Query(default=False),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_person_tv(person_id, page=page, page_size=page_size, local_only=local_only)

@router.get("/{person_id}/scenes", response_model=PersonFilmographyResponse)
def get_person_scenes(
    person_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1),
    source: str = Query(default=None),
    local_only: bool = Query(default=False),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_person_scenes(person_id, page=page, page_size=page_size, source=source, local_only=local_only)

@router.get("/{person_id}/credit-backdrops")
def get_person_credit_backdrops(
    person_id: str,
    tmdb_id: int = Query(..., ge=1),
    media_type: str = Query(...),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_person_credit_backdrops(
        person_id, tmdb_id=tmdb_id, media_type=media_type
    )
