from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import Any

from app.core.database import get_db
from app.infrastructure.scrapers.support.gateway import scraper_gateway
from app.domains.people.services.people_status_service import PeopleStatusService
from app.application.users.schemas import ImageOverrideUpdate

router = APIRouter(prefix="/api/v1/people", tags=["General People"])

def _people_status_service(db: Session, scrapers=None) -> PeopleStatusService:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    return PeopleStatusService(db, scrapers=scrapers, library_port=DbMediaResolver(db))

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

def resolve_person(person_id: Any, db: Session):
    return _people_status_service(db).resolve_person(person_id)

@router.post("/{person_id}/backdrop")
def update_person_backdrop(
    person_id: str,
    payload: ImageOverrideUpdate,
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    path = payload.path if payload.path is not None else (payload.url if payload.url is not None else payload.backdrop_path)
    if path is None:
        raise HTTPException(status_code=400, detail="Backdrop path/url is required")
    return _people_detail_service(db).update_person_backdrop(person.id, path)

@router.post("/{person_id}/upload-backdrop")
def upload_person_backdrop(
    person_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return _people_detail_service(db).handle_person_backdrop_upload(
        person.id, file.filename, file.file
    )

@router.post("/{person_id}/profile")
def update_person_profile(
    person_id: str,
    payload: ImageOverrideUpdate,
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    path = payload.path or payload.url or payload.profile_path or payload.poster_path or payload.backdrop_path or payload.logo_path
    if not path:
        raise HTTPException(status_code=400, detail="Profile path/url is required")
    return _people_detail_service(db).update_person_profile(person.id, path)

@router.post("/{person_id}/upload-profile")
def upload_person_profile(
    person_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return _people_detail_service(db).handle_person_profile_upload(
        person.id, file.filename, file.file
    )
