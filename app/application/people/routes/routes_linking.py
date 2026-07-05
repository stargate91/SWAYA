import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any

from app.shared_kernel.database import get_db
from app.domains.people.services.people_status_service import PeopleStatusService
from app.domains.people.services.linking_data_mapper import LinkingDataMapper
from app.domains.people.services.person_linker_service import PersonLinkerService
from app.application.people.schemas import (
    PersonLinkPayload,
    PersonUnlinkPayload,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/people", tags=["General People"])

def _people_status_service(db: Session, scrapers=None) -> PeopleStatusService:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    return PeopleStatusService(db, scrapers=scrapers, library_port=DbMediaResolver(db))

def resolve_person(person_id: Any, db: Session):
    return _people_status_service(db).resolve_person(person_id)


@router.get("/{person_id}/link/preview")
def link_person_source_preview(
    person_id: str,
    source: str = Query(...),
    external_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """Provides a preview comparing local person profile fields against external scraper attributes."""
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    from app.domains.users.models import UserOverride
    from app.shared_kernel.user_context import get_current_user_id
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

    from app.infrastructure.scrapers.support.gateway import scraper_gateway
    mapper = LinkingDataMapper()
    external_data = mapper.fetch_and_map_external_performer(db, source, external_id, scrapers=scraper_gateway)

    return {"local": local_data, "external": external_data}

@router.post("/{person_id}/link")
def link_person_source(
    person_id: str,
    payload: PersonLinkPayload,
    db: Session = Depends(get_db)
):
    """Links a Person to an external database source, triggering merges and enrichment."""
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    from app.shared_kernel.user_context import get_current_user_id
    try:
        current_uid = get_current_user_id()
    except Exception:
        current_uid = None

    linker = PersonLinkerService()
    return linker.link_person_source(
        db=db,
        person=person,
        source=payload.source,
        external_id=payload.external_id,
        profile_url=payload.profile_url,
        overrides=payload.overrides,
        current_uid=current_uid
    )

@router.post("/{person_id}/unlink")
def unlink_person_source(
    person_id: str,
    payload: PersonUnlinkPayload,
    db: Session = Depends(get_db)
):
    """Unlinks a Person from a specific provider, splitting them if requested."""
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    linker = PersonLinkerService()
    return linker.unlink_person_source(
        db=db,
        person=person,
        source=payload.source,
        action=payload.action
    )

class PersonPrimaryPayload(BaseModel):
    source: str

@router.post("/{person_id}/primary")
def set_primary_person_source(
    person_id: str,
    payload: PersonPrimaryPayload,
    db: Session = Depends(get_db)
):
    """Configures the primary metadata source preference for a person."""
    from app.shared_kernel.enums import Provider
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    source = payload.source.lower()
    if source == "none" or not source:
        person.primary_provider = None
    else:
        try:
            prov_enum = Provider(source)
            person.primary_provider = prov_enum
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unsupported source: {source}")

    person.recalculate_projection(db)
    db.commit()
    return {"status": "success", "person_id": person.id, "primary_provider": source}

class PersonFieldRoutingPayload(BaseModel):
    routing: dict[str, str]

@router.post("/{person_id}/field-routing")
def set_person_field_routing(
    person_id: str,
    payload: PersonFieldRoutingPayload,
    db: Session = Depends(get_db)
):
    """Maps custom field routing rules specifying source providers for individual profile values."""
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    person.field_routing = payload.routing
    person.recalculate_projection(db)
    db.commit()
    return {"status": "success", "person_id": person.id, "field_routing": person.field_routing}

class SaveCustomFieldsPayload(BaseModel):
    fields: dict[str, Any]

@router.post("/{person_id}/custom-fields")
def save_custom_fields(
    person_id: str,
    payload: SaveCustomFieldsPayload,
    db: Session = Depends(get_db)
):
    """Saves custom field entries under a mock 'manual' source link."""
    person = resolve_person(person_id, db)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    from app.domains.people.models import ExternalSourceLink
    from app.shared_kernel.enums import Provider

    manual_link = next((x for x in person.external_links if x.provider == Provider.MANUAL), None)
    if not manual_link:
        manual_link = ExternalSourceLink(
            person_id=person.id,
            provider=Provider.MANUAL,
            external_id=f"manual_{person.id}",
            source_data={}
        )
        db.add(manual_link)
        person.external_links.append(manual_link)

    source_data = dict(manual_link.source_data or {})
    for k, v in payload.fields.items():
        if v == "" or v is None or v == {}:
            source_data.pop(k, None)
            if k == "biography" or k == "biographies":
                source_data.pop("biography", None)
                source_data.pop("biographies", None)
        else:
            if k == "biographies":
                source_data["biographies"] = v
                source_data["biography"] = v.get("en") or next(iter(v.values()), None)
            elif k == "biography":
                if isinstance(v, dict):
                    source_data["biographies"] = v
                    source_data["biography"] = v.get("en") or next(iter(v.values()), None)
                else:
                    source_data["biography"] = v
                    if "biographies" not in source_data:
                        source_data["biographies"] = {"en": v, "hu": v}
            else:
                source_data[k] = v

    manual_link.source_data = source_data
    person.recalculate_projection(db)
    db.commit()

    return {"status": "success", "source_data": manual_link.source_data}
