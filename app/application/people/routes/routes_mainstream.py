from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.shared_kernel.database import get_db
from app.domains.people.services.people_status_service import PeopleStatusService
from app.application.people.schemas import PersonRead

mainstream_router = APIRouter(prefix="/api/v1/mainstream/people", tags=["Mainstream People"])

def _people_status_service(db: Session, scrapers=None) -> PeopleStatusService:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    return PeopleStatusService(db, scrapers=scrapers, library_port=DbMediaResolver(db))

@mainstream_router.get("", response_model=List[PersonRead])
def list_mainstream_people(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve mainstream cast/crew (SFW)."""
    return _people_status_service(db).list_people_by_type(is_adult=False, limit=limit)
