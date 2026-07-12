import logging
import queue
import threading
from datetime import datetime, timezone
from typing import Any, List, Dict, Optional
from sqlalchemy.orm import Session

from app.domains.people.models import Person, ExternalSourceLink
from app.domains.users.models import UserOverride, Tag
from app.shared_kernel.enums import Provider
from app.shared_kernel.exceptions import NotFoundException
from app.shared_kernel.user_context import get_current_user_id
from sqlalchemy import func

logger = logging.getLogger(__name__)


class PersonEnrichmentQueue:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(PersonEnrichmentQueue, cls).__new__(cls)
                cls._instance._init_queue()
            return cls._instance

    def _init_queue(self):
        self.queue = queue.Queue()
        self.scrapers = None
        self.session_factory = None
        self.enqueued_ids = set()
        self._current_person_name = None
        self._total_enqueued = 0
        self._completed_count = 0
        self.worker_thread = threading.Thread(target=self._worker, daemon=True, name="PersonEnrichmentWorker")
        self.worker_thread.start()

    def configure(self, scrapers: Any, session_factory=None):
        self.scrapers = scrapers
        if session_factory is not None:
            self.session_factory = session_factory

    def enqueue(self, person_id: int):
        with self._lock:
            if person_id not in self.enqueued_ids:
                self.enqueued_ids.add(person_id)
                self._total_enqueued += 1
                self.queue.put(person_id)

    def get_status(self):
        with self._lock:
            active = bool(self.enqueued_ids) or self._current_person_name is not None
            return {
                "active": active,
                "current_name": self._current_person_name,
                "total": self._total_enqueued,
                "completed": self._completed_count,
            }

    def _worker(self):
        while True:
            try:
                person_id = self.queue.get()
                if person_id is None:
                    break
                self._enrich_person(person_id)
                with self._lock:
                    self.enqueued_ids.discard(person_id)
                    self._completed_count += 1
                    # Reset counters when batch is done
                    if not self.enqueued_ids:
                        self._current_person_name = None
                        self._total_enqueued = 0
                        self._completed_count = 0
            except Exception as e:
                logger.error(f"Error in PersonEnrichmentQueue worker: {e}", exc_info=True)
                with self._lock:
                    self.enqueued_ids.discard(person_id)
                    self._completed_count += 1
            finally:
                self.queue.task_done()


    def _enrich_person(self, person_id: int):
        from app.domains.people.services.people_enricher import PeopleEnricher

        if not self.session_factory:
            from app.shared_kernel.database import SessionLocal
            self.session_factory = SessionLocal

        db = self.session_factory()
        try:
            person = db.query(Person).filter(Person.id == person_id).first()
            if not person:
                return

            with self._lock:
                self._current_person_name = person.name
            logger.info(f"Background enriching activated person: {person.name} (ID: {person_id})")
            enricher = PeopleEnricher(db, scrapers=self.scrapers)
            
            ext_ids = person.external_ids or {}
            links = db.query(ExternalSourceLink).filter(ExternalSourceLink.person_id == person_id).all()
            link_data = [{"provider": x.provider, "external_id": x.external_id} for x in links]
            
            for prov_name, ext_id in ext_ids.items():
                try:
                     prov = Provider(prov_name.lower())
                     if not any(ld["provider"] == prov for ld in link_data):
                         link_data.append({"provider": prov, "external_id": str(ext_id)})
                except Exception as e:
                     logger.debug(f"Swallowed exception in domains/people/services/people_status_service.py:71: {e}", exc_info=True)

            fetched_data = enricher.fetch_external_details(
                person.name,
                ext_ids,
                link_data,
                is_adult=person.is_adult
            )
            if fetched_data:
                enricher.apply_enriched_data(person, fetched_data)
                db.commit()
                logger.info(f"Successfully enriched activated person: {person.name}")

            # Automatic HealthyCeleb enrichment for SFW performers
            logger.info(f"HC enrichment check for {person.name}: is_adult={person.is_adult}, birthday={person.birthday!r}")
            if not person.is_adult and person.birthday:
                try:
                    from app.domains.people.services.people_detail_service import PeopleDetailService
                    # Call scrape_healthyceleb as an unbound method to avoid
                    # PeopleDetailService.__init__ which requires full scrapers
                    # (PerformerDetailReader calls scrapers.tmdb(db) eagerly).
                    # scrape_healthyceleb only uses self.db internally.
                    _dummy = object.__new__(PeopleDetailService)
                    _dummy.db = db
                    
                    hc_data = _dummy.scrape_healthyceleb(person.id)
                    
                    # Birthday-based underage check
                    person_bday = person.birthday
                    if person_bday and isinstance(person_bday, str):
                        try:
                            from datetime import datetime as dt
                            person_bday = dt.strptime(person_bday.split("T")[0].strip(), "%Y-%m-%d").date()
                        except ValueError:
                            person_bday = None
                    elif hasattr(person_bday, "date"):
                        person_bday = person_bday.date()
                    
                    hc_bday = hc_data.get("date_of_birth")
                    
                    if hc_bday and person_bday and hc_bday != person_bday:
                        logger.warning(f"HC birthday mismatch for {person.name}: HC={hc_bday}, DB={person_bday} — applying data anyway")

                    is_underage = False
                    effective_bday = person_bday or hc_bday
                    if effective_bday:
                        from datetime import date, timedelta
                        today = date.today()
                        try:
                            threshold = effective_bday.replace(year=effective_bday.year + 18) + timedelta(days=14)
                            if threshold > today:
                                is_underage = True
                        except Exception:
                            pass

                    if not is_underage:
                        if hc_data.get("height") and (not person.height or person.height < 100):
                            person.height = hc_data["height"]
                        if hc_data.get("weight") and (not person.weight or person.weight < 20):
                            person.weight = hc_data["weight"]
                        if hc_data.get("hair_color") and not person.hair_color:
                            person.hair_color = hc_data["hair_color"]
                        if hc_data.get("eye_color") and not person.eye_color:
                            person.eye_color = hc_data["eye_color"]
                        if hc_data.get("waist") and not person.waist:
                            person.waist = hc_data["waist"]
                        if hc_data.get("hip") and not person.hip:
                            person.hip = hc_data["hip"]
                        if hc_data.get("cup_size") and not person.cup_size:
                            person.cup_size = hc_data["cup_size"]
                        if hc_data.get("band_size") and not person.band_size:
                            person.band_size = hc_data["band_size"]

                        # Auto-calculate butt_size from height/waist/hip
                        if person.height and person.waist and person.hip and not person.butt_size:
                            try:
                                height_in = float(person.height) / 2.54
                                fah = float(person.hip) / (height_in * 0.53)
                                whr = float(person.waist) / float(person.hip)
                                ccf = 0.72 / whr
                                bcs = float(person.hip) * fah * ccf
                                if bcs < 33:
                                    person.butt_size = "SMALL"
                                elif bcs < 40:
                                    person.butt_size = "MEDIUM"
                                elif bcs < 50:
                                    person.butt_size = "BIG"
                                else:
                                    person.butt_size = "EXTRA_BIG"
                            except (ValueError, TypeError, ZeroDivisionError):
                                pass

                        # Auto-calculate breast_size from cup_size/band_size/height
                        if person.cup_size and person.band_size and not person.breast_size:
                            try:
                                cup_str = str(person.cup_size).strip().upper()
                                cup_map = {
                                    "A": 1, "B": 2, "C": 3, "D": 4, "DD": 5, "E": 5,
                                    "DDD": 6, "F": 6, "DDDD": 7, "G": 7, "H": 8, "I": 9, "J": 10, "K": 11
                                }
                                cup_val = cup_map.get(cup_str, 0)
                                if cup_val == 0:
                                    if cup_str.startswith("A"): cup_val = 1
                                    elif cup_str.startswith("B"): cup_val = 2
                                    elif cup_str.startswith("C"): cup_val = 3
                                    elif cup_str.startswith("D"): cup_val = 4
                                    elif "E" in cup_str: cup_val = 5
                                    elif "F" in cup_str: cup_val = 6
                                    elif "G" in cup_str: cup_val = 7
                                    elif "H" in cup_str: cup_val = 8
                                    else: cup_val = 4

                                band_val = float(person.band_size)
                                height_val = float(person.height) if person.height else 165.0

                                index = cup_val + (band_val - 32.0) * 0.5 - (height_val - 165.0) * 0.05

                                if index < 2.5:
                                    person.breast_size = "SMALL"
                                elif index < 4.5:
                                    person.breast_size = "MEDIUM"
                                elif index < 6.5:
                                    person.breast_size = "BIG"
                                else:
                                    person.breast_size = "EXTRA_BIG"
                            except (ValueError, TypeError):
                                pass

                    if hc_data.get("ethnicity") and not person.ethnicity:
                        person.ethnicity = hc_data["ethnicity"]
                    if hc_data.get("place_of_birth") and not person.place_of_birth:
                        person.place_of_birth = hc_data["place_of_birth"]
                    
                    db.commit()
                    logger.info(f"Successfully auto-enriched SFW performer {person.name} from HealthyCeleb.")
                except Exception as e:
                    logger.warning(f"Auto-HealthyCeleb enrichment skipped/failed for {person.name}: {e}")
        except Exception as e:
            logger.error(f"Failed to enrich person {person_id} in background queue: {e}", exc_info=True)
        finally:
            db.close()


_enrichment_queue = PersonEnrichmentQueue()


def enqueue_person_enrichment(person_id: int):
    _enrichment_queue.enqueue(person_id)


class PeopleStatusService:
    def __init__(
        self,
        db: Session,
        scrapers: Optional[Any] = None,
        library_port: Optional[Any] = None,
        image_service: Optional[Any] = None
    ):
        self.db = db
        self.scrapers = scrapers

        self.library_port = library_port

        if image_service is None:
            from app.domains.media_assets.services.images import image_processing_service
            image_service = image_processing_service
        self.image_service = image_service

    def resolve_person(self, person_id: Any) -> Optional[Person]:
        """Resolves a person by numeric ID or by provider:external_id format."""
        person_id_str = str(person_id)
        if ":" in person_id_str:
            parts = person_id_str.split(":", 1)
            source_name = parts[0]
            uuid_str = parts[1]
            
            scraper_name = "porndb" if source_name == "theporndb" else source_name
            try:
                provider_enum = Provider(scraper_name)
                link = self.db.query(ExternalSourceLink).filter(
                    ExternalSourceLink.provider == provider_enum,
                    ExternalSourceLink.external_id == uuid_str
                ).first()
                if link:
                    return link.person
            except Exception as e:
                logger.debug(f"Swallowed exception in domains/people/services/people_status_service.py:135: {e}", exc_info=True)
            return None
        else:
            try:
                p_id = int(person_id_str)
                return self.db.query(Person).filter(Person.id == p_id).first()
            except (ValueError, TypeError):
                return None

    def list_people_by_type(self, is_adult: bool, limit: int = 50) -> List[Person]:
        """Retrieve mainstream (is_adult=False) or adult (is_adult=True) people."""
        return self.db.query(Person).filter(Person.is_adult == is_adult).limit(limit).all()

    def update_person_status(self, person_id: str, payload_data: Dict[str, Any], fields_set: set) -> Dict[str, Any]:
        """Updates person active status and/or user-specific overrides (favorite, rating, comment)."""
        person = self.resolve_person(person_id)
        if not person:
            # Try to import/create the person dynamically if we have scrapers
            if self.scrapers:
                from app.domains.people.services.people_search_service import PeopleSearchService
                search_service = PeopleSearchService(
                    self.db,
                    self.scrapers,
                    self.library_port,
                    self.image_service
                )
                try:
                    res = search_service.add_person_tmdb(person_id, is_active=True)
                    if res and res.get("status") == "success":
                        person = self.resolve_person(res["id"])
                except Exception as e:
                    logger.error(f"Failed to dynamically import virtual person {person_id}: {e}")

            if not person:
                raise NotFoundException("Person not found")

        user_id = get_current_user_id() or 1

        newly_activated = False

        # 1. Update Person level fields
        if "is_active" in fields_set and payload_data.get("is_active") is not None:
            if payload_data.get("is_active") and not person.is_active:
                newly_activated = True
            person.is_active = payload_data.get("is_active")

        # Auto-activate on user interaction
        has_user_interaction = (
            ("user_rating" in fields_set and payload_data.get("user_rating") is not None)
            or ("is_favorite" in fields_set and payload_data.get("is_favorite"))
            or ("user_comment" in fields_set and payload_data.get("user_comment") is not None)
            or ("custom_tags" in fields_set and payload_data.get("custom_tags") is not None)
        )
        if has_user_interaction:
            if not person.is_active:
                newly_activated = True
            person.is_active = True

        # 2. Update UserOverride fields
        has_override_update = (
            "user_rating" in fields_set
            or "is_favorite" in fields_set
            or "user_comment" in fields_set
            or "custom_tags" in fields_set
        )
        if has_override_update:
            override = self.db.query(UserOverride).filter(
                UserOverride.user_id == user_id,
                UserOverride.person_id == person.id
            ).first()

            if not override:
                override = UserOverride(
                    user_id=user_id,
                    person_id=person.id
                )
                self.db.add(override)

            if "user_rating" in fields_set:
                rating_val = payload_data.get("user_rating")
                override.user_rating = float(rating_val) if rating_val is not None else None
                override.user_rating_at = datetime.now(timezone.utc) if rating_val is not None else None

            if "is_favorite" in fields_set:
                fav_val = payload_data.get("is_favorite")
                override.is_favorite = fav_val if fav_val is not None else False
                override.is_favorite_at = datetime.now(timezone.utc) if fav_val else None

            if "user_comment" in fields_set:
                comment_val = payload_data.get("user_comment")
                override.user_comment = comment_val
                override.user_comment_at = datetime.now(timezone.utc) if comment_val else None

            if "custom_tags" in fields_set:
                tags_input = payload_data.get("custom_tags")
                if tags_input is not None:
                    tags_list = []
                    for t in tags_input:
                        tag_obj = None
                        if isinstance(t, str):
                            tag_obj = self.db.query(Tag).filter(func.lower(Tag.name) == func.lower(t), Tag.is_adult == bool(person.is_adult)).first()
                            if not tag_obj:
                                tag_obj = Tag(name=t, is_adult=bool(person.is_adult))
                                self.db.add(tag_obj)
                                self.db.flush()
                        if tag_obj and tag_obj not in tags_list:
                            tags_list.append(tag_obj)
                    override.tags = tags_list

        self.db.commit()

        if newly_activated:
            enqueue_person_enrichment(person.id)

        override = self.db.query(UserOverride).filter(
            UserOverride.user_id == user_id,
            UserOverride.person_id == person.id
        ).first()

        return {
            "status": "ok",
            "is_active": person.is_active,
            "is_favorite": override.is_favorite if override else False,
            "user_rating": override.user_rating if override else None,
            "user_comment": override.user_comment if override else None,
            "custom_tags": [t.name for t in override.tags if t.is_adult == bool(person.is_adult)] if (override and override.tags) else [],
        }
