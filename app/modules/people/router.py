from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.modules.scrapers.support.gateway import scraper_gateway
from app.modules.people.services.people_status_service import PeopleStatusService, _enrichment_queue
from app.modules.people.services.linking_data_mapper import LinkingDataMapper
from app.modules.people.services.person_linker_service import PersonLinkerService
from app.modules.people.schemas import (
    PersonRead,
    PeopleSearchResponse,
    PersonDetailDTO,
    PersonFilmographyResponse,
    PersonAddTmdb,
    PersonStatusUpdate,
    PersonLinkPayload,
    PersonUnlinkPayload,
)
from app.modules.users.schemas import ImageOverrideUpdate

_enrichment_queue.configure(scraper_gateway)

# Set up routers
router = APIRouter(prefix="/api/v1/people", tags=["General People"])
mainstream_router = APIRouter(prefix="/api/v1/mainstream/people", tags=["Mainstream People"])
adult_router = APIRouter(prefix="/api/v1/adult/people", tags=["Adult People"])


def _people_status_service(db: Session, scrapers=None) -> PeopleStatusService:
    return PeopleStatusService(db, scrapers=scrapers)

def _people_detail_service(db: Session, scrapers=None) -> Any:
    from app.modules.tasks.image_download_service import ImageDownloadService
    from app.modules.people.services.people_detail_service import PeopleDetailService
    return PeopleDetailService(
        db,
        scrapers or scraper_gateway,
        image_downloader=ImageDownloadService()
    )

def resolve_person(person_id: Any, db: Session):
    return _people_status_service(db).resolve_person(person_id)


# --- Mainstream & Adult list ---
@mainstream_router.get("", response_model=List[PersonRead])
def list_mainstream_people(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve mainstream cast/crew (SFW)."""
    return _people_status_service(db).list_people_by_type(is_adult=False, limit=limit)

@adult_router.get("", response_model=List[PersonRead])
def list_adult_people(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve adult performers (NSFW)."""
    return _people_status_service(db).list_people_by_type(is_adult=True, limit=limit)


# --- General People Endpoints ---
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

@router.get("/enrichment-status")
def get_enrichment_status():
    return _enrichment_queue.get_status()

@router.post("/enrich")
def enrich_people(match_ids: List[int], db: Session = Depends(get_db)):
    """
    Triggers a background task to enrich people details (bio, physical traits, profiles)
    for the given MetadataMatch IDs.
    """
    from app.modules.tasks import task_manager
    task_manager.people_enrich_worker.enqueue_enrich(match_ids)
    task_id = task_manager.people_enrich_worker.active_task_id
    return {"status": "enrichment_pending", "task_id": task_id}

@router.get("/{person_id}", response_model=PersonDetailDTO)
def get_person_detail(person_id: str, db: Session = Depends(get_db)):
    return _people_detail_service(db).get_person_detail(person_id)

@router.get("/{person_id}/movies", response_model=PersonFilmographyResponse)
def get_person_movies(
    person_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1),
    source: str = Query(default=None),
    local_only: bool = Query(default=False),
    sort_by: str = Query(default=None),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_person_movies(person_id, page=page, page_size=page_size, source=source, local_only=local_only, sort_by=sort_by)

@router.get("/{person_id}/tv", response_model=PersonFilmographyResponse)
def get_person_tv(
    person_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1),
    local_only: bool = Query(default=False),
    sort_by: str = Query(default=None),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).get_person_tv(person_id, page=page, page_size=page_size, local_only=local_only, sort_by=sort_by)

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

@router.post("/{person_id}/scrape-healthyceleb")
def scrape_healthyceleb(
    person_id: str,
    url: str = Query(default=None),
    db: Session = Depends(get_db)
):
    return _people_detail_service(db).scrape_healthyceleb(person_id, url)


# --- Image Overrides ---
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


# --- Linking Endpoints ---
@router.get("/{person_id}/link/preview")
def link_person_source_preview(
    person_id: str,
    source: str = Query(...),
    external_id: str = Query(...),
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    from app.modules.users.models import UserOverride
    from app.core.user_context import get_current_user_id
    try:
        current_uid = get_current_user_id()
    except Exception:
        current_uid = None

    override_rec = None
    if current_uid:
        override_rec = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            UserOverride.person_id == person.id
        ).first()

    biography = None
    if person.localizations:
        loc = next((x for x in person.localizations if x.locale == "en"), person.localizations[0])
        biography = loc.biography

    local_data = {
        "name": person.name,
        "gender": person.gender,
        "birthday": person.birthday,
        "place_of_birth": person.place_of_birth,
        "height": person.height,
        "measurements": person.measurements,
        "ethnicity": person.ethnicity,
        "eye_color": person.eye_color,
        "hair_color": person.hair_color,
        "biography": biography,
        "user_rating": override_rec.user_rating if override_rec else None,
        "user_comment": override_rec.user_comment if override_rec else None,
        "is_favorite": override_rec.is_favorite if override_rec else False,
        "custom_tags": [t.name for t in override_rec.tags if t.is_adult == bool(person.is_adult)] if (override_rec and override_rec.tags) else [],
    }

    mapper = LinkingDataMapper()
    external_data = mapper.fetch_and_map_external_performer(db, source, external_id, scrapers=scraper_gateway)

    return {"local": local_data, "external": external_data}

@router.post("/{person_id}/link")
def link_person_source(
    person_id: str,
    payload: PersonLinkPayload,
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    from app.core.user_context import get_current_user_id
    try:
        current_uid = get_current_user_id()
    except Exception:
        current_uid = None

    linker = PersonLinkerService()
    return linker.link_person_source(
        db,
        person=person,
        provider=payload.provider,
        external_id=payload.external_id,
        user_id=current_uid
    )

@router.post("/{person_id}/unlink")
def unlink_person_source(
    person_id: str,
    payload: PersonUnlinkPayload,
    db: Session = Depends(get_db)
):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    linker = PersonLinkerService()
    return linker.unlink_person_source(
        db,
        person=person,
        provider=payload.provider,
        external_id=payload.external_id
    )

@router.post("/{person_id}/status")
def update_person_status(
    person_id: str,
    payload: PersonStatusUpdate,
    db: Session = Depends(get_db)
):
    return _people_status_service(db, scraper_gateway).update_person_status(
        person_id=person_id,
        payload_data=payload.model_dump(),
        fields_set=payload.model_fields_set,
    )

@router.delete("/{person_id}")
def delete_person(person_id: str, db: Session = Depends(get_db)):
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    from app.core.database import transaction_scope
    with transaction_scope(db):
        db.delete(person)
    return {"status": "success"}
