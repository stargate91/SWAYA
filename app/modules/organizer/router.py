from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.modules.organizer.services.organizer_service import OrganizerService
from app.modules.organizer.schemas import OrganizerGroupsResponse, ActionResponse, OrganizerPaginatedResponse
from app.modules.scrapers.support.gateway import scraper_gateway

router = APIRouter(prefix="/api/v1", tags=["Organizer"])

class OrganizerDeleteRequest(BaseModel):
    item_ids: Optional[List[int]] = None
    extra_ids: Optional[List[int]] = None
    mode: str = "db_only"

class OrganizerCountResponse(BaseModel):
    count: int

@router.get("/organizer", response_model=OrganizerPaginatedResponse)
def get_organizer_items(
    page: int = 1,
    page_size: int = 40,
    tab: str = "manual",
    sub_tab: Optional[str] = None,
    q: Optional[str] = None,
    sort_by: str = "source",
    sort_dir: str = "asc",
    scan_mode: Optional[str] = None,
    session_mode: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return OrganizerService(db, scraper_gateway).get_organizer_groups(
        page=page,
        page_size=page_size,
        tab=tab,
        sub_tab=sub_tab,
        q=q,
        sort_by=sort_by,
        sort_dir=sort_dir,
        scan_mode=scan_mode,
        session_mode=session_mode
    )


@router.get("/organizer/count", response_model=OrganizerCountResponse)
def get_organizer_item_count(scan_mode: Optional[str] = None, session_mode: Optional[str] = None, db: Session = Depends(get_db)):
    return {"count": OrganizerService(db, scraper_gateway).get_organizer_item_count(scan_mode=scan_mode, session_mode=session_mode)}

@router.post("/organizer/delete", response_model=ActionResponse)
def delete_organizer_items(request: OrganizerDeleteRequest, db: Session = Depends(get_db)):
    return OrganizerService(db, scraper_gateway).delete_organizer_items(
        item_ids=request.item_ids or [],
        extra_ids=request.extra_ids or [],
        mode=request.mode,
    )
