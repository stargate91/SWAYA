from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
from app.application.people.schemas import PersonStatusUpdate

from app.shared_kernel.database import get_db
from app.infrastructure.scrapers.support.gateway import scraper_gateway
from app.domains.people.services.people_status_service import PeopleStatusService, _enrichment_queue
_enrichment_queue.configure(scraper_gateway)

router = APIRouter(prefix="/api/v1/people", tags=["General People"])

def _people_status_service(db: Session, scrapers=None) -> PeopleStatusService:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    return PeopleStatusService(db, scrapers=scrapers, library_port=DbMediaResolver(db))

def resolve_person(person_id: Any, db: Session):
    return _people_status_service(db).resolve_person(person_id)

@router.post("/enrich")
def enrich_people(match_ids: List[int], db: Session = Depends(get_db)):
    """
    Triggers a background task to enrich people details (bio, physical traits, profiles)
    for the given MetadataMatch IDs.
    """
    from app.domains.tasks import task_manager
    task_manager.people_enrich_worker.enqueue_enrich(match_ids)
    task_id = task_manager.people_enrich_worker.active_task_id
    return {"status": "enrichment_pending", "task_id": task_id}

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
    db.delete(person)
    db.commit()
    return {"status": "success"}
