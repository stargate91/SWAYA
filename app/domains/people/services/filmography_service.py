import logging
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.shared_kernel.ports.library_port import LibraryPort
from app.shared_kernel.ports.image_service_port import ImageServicePort

from app.domains.people.services.filmography.local_aggregator import LocalCreditsAggregator
from app.domains.people.services.filmography.prioritizer import CreditsPrioritizer
from app.domains.people.services.filmography.remote_fetcher import RemoteCreditsFetcher
from app.domains.people.services.filmography.combined_resolver import CombinedFilmographyResolver
from app.domains.people.services.filmography.paginated_retriever import PaginatedCreditsRetriever

logger = logging.getLogger(__name__)

class FilmographyService:
    def __init__(self, db: Session, library_port: Optional[LibraryPort] = None, image_service: Optional[ImageServicePort] = None, scrapers: Optional[Any] = None):
        self.db = db
        self.library_port = library_port
        
        if image_service is None:
            from app.domains.media_assets.services.images import image_processing_service
            image_service = image_processing_service
        self.image_service = image_service

        self.local_aggregator = LocalCreditsAggregator(db, library_port, image_service)
        self.prioritizer = CreditsPrioritizer()
        self.remote_fetcher = RemoteCreditsFetcher(db, library_port, image_service, scrapers=scrapers)
        self.combined_resolver = CombinedFilmographyResolver(self.prioritizer, self._resolve_img)
        self.paginated_retriever = PaginatedCreditsRetriever(db, library_port, self._resolve_img, self._fetch_remote_credits)

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def aggregate_credits(self, person_id: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        return self.local_aggregator.aggregate_credits(person_id)

    def _fetch_remote_credits(
        self,
        person_id: int,
        source: str,
        media_type: str,
        page: int,
        page_size: int
    ) -> Optional[dict]:
        return self.remote_fetcher.fetch_remote_credits(
            person_id=person_id,
            source=source,
            media_type=media_type,
            page=page,
            page_size=page_size
        )

    def get_combined_filmography(
        self,
        person_id: int,
        tmdb_id: Optional[str],
        ui_lang: str,
        tmdb_client: Any,
        is_adult: bool,
        known_for_department: Optional[str],
        person_name: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Combines local database and remote details to compile actor filmography lists."""
        local_movies, local_tv, local_scenes = self.aggregate_credits(person_id)
        
        adult_known_for = []
        if is_adult:
            from app.domains.people.models import Person
            from app.shared_kernel.enums import Provider
            person = self.db.query(Person).filter(Person.id == person_id).first()
            if person:
                ext_ids = person.external_ids or {}
                for prov in ("stashdb", "fansdb", "porndb"):
                    ext_id = ext_ids.get(prov) or ext_ids.get(f"{prov}_id")
                    if not ext_id:
                        try:
                            prov_enum = Provider(prov)
                            link = next((x for x in person.external_links if x.provider == prov_enum), None)
                            if link:
                                ext_id = link.external_id
                        except Exception:
                            pass
                    if ext_id:
                        adult_known_for = self.remote_fetcher.fetch_remote_known_for(person_id, prov, ext_id)
                        if adult_known_for:
                            break

        return self.combined_resolver.get_combined_filmography(
            person_id=person_id,
            tmdb_id=tmdb_id,
            ui_lang=ui_lang,
            tmdb_client=tmdb_client,
            is_adult=is_adult,
            known_for_department=known_for_department,
            local_movies=local_movies,
            local_tv=local_tv,
            local_scenes=local_scenes,
            person_name=person_name,
            remote_scenes=adult_known_for
        )

    def get_person_movies(self, person_id: int, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False):
        """Delegates query for movies list."""
        return self.paginated_retriever.get_person_movies(person_id, page, page_size, source, local_only)

    def get_person_tv(self, person_id: int, page: int = 1, page_size: int = 12):
        """Delegates query for TV shows list."""
        return self.paginated_retriever.get_person_tv(person_id, page, page_size)

    def get_person_scenes(self, person_id: int, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False):
        """Delegates query for adult scenes list."""
        return self.paginated_retriever.get_person_scenes(person_id, page, page_size, source, local_only)
