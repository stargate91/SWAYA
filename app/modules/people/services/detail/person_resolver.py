import logging
from typing import Any
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.modules.people.models import Person, ExternalSourceLink
from app.core.enums import Provider

logger = logging.getLogger(__name__)

class PersonResolver:
    def __init__(self, db: Session, search_service: Any):
        self.db = db
        self.search_service = search_service

    def resolve_person(self, person_id: Any, load_localizations: bool = False) -> Person:
        db = self.db
        query = db.query(Person)
        if load_localizations:
            query = query.options(joinedload(Person.localizations), joinedload(Person.external_links))
        
        person = None
        person_id_str = str(person_id)
        
        # Branch 1: {provider}:{external_id} — ExternalSourceLink lookup
        if ":" in person_id_str:
            parts = person_id_str.split(":", 1)
            source_name = parts[0]
            uuid_str = parts[1]
            if source_name == "local":
                try:
                    p_id = int(uuid_str)
                    person = query.filter(Person.id == p_id).first()
                except (ValueError, TypeError) as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            else:
                from app.modules.scrapers.support.registry import ProviderRegistry
                provider_enum = ProviderRegistry.resolve_prefix(source_name)
                if provider_enum:
                    try:
                        link = db.query(ExternalSourceLink).filter(
                            ExternalSourceLink.provider == provider_enum,
                            ExternalSourceLink.external_id == uuid_str
                        ).first()
                        if link:
                            person = link.person
                            if load_localizations:
                                person = query.filter(Person.id == person.id).first()
                    except Exception as e:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)
                        
        # Branch 2: plain integer — Person.id PK lookup
        else:
            try:
                p_id = int(person_id_str)
                person = query.filter(Person.id == p_id).first()
            except (ValueError, TypeError) as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)

            # Fallback to tmdb lookup (as string) in case person_id_str is a TMDB ID
            if not person:
                try:
                    link = db.query(ExternalSourceLink).filter(
                        ExternalSourceLink.provider == Provider.TMDB,
                        ExternalSourceLink.external_id == person_id_str
                    ).first()
                    if link:
                        person = link.person
                        if load_localizations:
                            person = query.filter(Person.id == person.id).first()
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)

        # Auto-import if not found
        if not person:
            import_target = None
            if ":" in person_id_str:
                import_target = person_id_str
            elif person_id_str.isdigit():
                import_target = person_id_str
                
            if import_target:
                try:
                    res = self.search_service.add_person_tmdb(import_target, is_active=False)
                    if res and res.get("status") == "success":
                        query_new = db.query(Person)
                        if load_localizations:
                            query_new = query_new.options(joinedload(Person.localizations), joinedload(Person.external_links))
                        person = query_new.filter(Person.id == res["id"]).first()
                except Exception as e:
                    logger.error(f"Error dynamically importing person {person_id}: {e}")
                    
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        return person
