from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.domains.people.services.people_status_service import PeopleStatusService
from app.application.people.schemas import PersonRead

adult_router = APIRouter(prefix="/api/v1/adult/people", tags=["Adult People"])

def _people_status_service(db: Session, scrapers=None) -> PeopleStatusService:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    return PeopleStatusService(db, scrapers=scrapers, library_port=DbMediaResolver(db))

@adult_router.get("", response_model=List[PersonRead])
def list_adult_people(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve adult performers (NSFW)."""
    return _people_status_service(db).list_people_by_type(is_adult=True, limit=limit)
