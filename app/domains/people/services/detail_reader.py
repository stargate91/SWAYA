import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.shared_kernel.enums import MediaType
from app.domains.people.models import Person
from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.ports.library_port import LibraryPort
from app.domains.people.services.filmography_service import FilmographyService
from app.domains.people.schemas import (
    PeopleSearchResponse,
    PersonDetailResponse,
    PersonFilmographyResponse,
)
from app.shared_kernel.ports.image_service_port import ImageServicePort

# Import sub-components
from app.domains.people.services.people_query import PeopleQueryBuilder
from app.domains.people.services.people_search_service import PeopleSearchService
from app.domains.people.services.detail.person_resolver import PersonResolver
from app.domains.people.services.detail.detail_collator import PersonDetailCollator
from app.domains.people.services.detail.filmography_paginator import FilmographyPaginator

logger = logging.getLogger(__name__)

class PerformerDetailReader:
    def __init__(self, db: Session, scrapers: ScraperGatewayPort, library_port: LibraryPort, image_service: ImageServicePort, filmography_service: FilmographyService):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = scrapers.tmdb(db)
        self.library_port = library_port
        self.image_service = image_service
        self.filmography_service = filmography_service

        # Instantiate helper services
        self.query_builder = PeopleQueryBuilder(db, library_port, image_service)
        self.search_service = PeopleSearchService(db, scrapers, library_port, image_service)
        self.resolver = PersonResolver(db, self.search_service)
        self.collator = PersonDetailCollator(db, scrapers, self.tmdb, library_port, image_service, filmography_service)
        self.paginator = FilmographyPaginator(self.tmdb, filmography_service)

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def get_people(
        self,
        search: str = None,
        role: str = None,
        sort_by: str = "library_count",
        include_inactive: bool = False,
        adult_only: bool = False,
        gender: str = "all",
        offset: int = 0,
        limit: int = 20,
    ) -> PeopleSearchResponse:
        return self.query_builder.get_people(
            search=search,
            role=role,
            sort_by=sort_by,
            include_inactive=include_inactive,
            adult_only=adult_only,
            gender=gender,
            offset=offset,
            limit=limit,
        )

    def _resolve_person(self, person_id: Any, load_localizations: bool = False) -> Person:
        return self.resolver.resolve_person(person_id, load_localizations)

    def get_person_detail(self, person_id: Any) -> PersonDetailResponse:
        person = self._resolve_person(person_id, load_localizations=True)
        return self.collator.get_person_detail(person, user_id=1, ui_lang=DEFAULT_FALLBACK_LANGUAGE)

    def get_person_movies(self, person_id: Any, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False) -> PersonFilmographyResponse:
        person = self._resolve_person(person_id)
        return self.paginator.get_person_movies(person, page=page, page_size=page_size, source=source, local_only=local_only)

    def get_person_tv(self, person_id: Any, page: int = 1, page_size: int = 12, local_only: bool = False) -> PersonFilmographyResponse:
        person = self._resolve_person(person_id)
        return self.paginator.get_person_tv(person, page=page, page_size=page_size, local_only=local_only)

    def get_person_scenes(self, person_id: Any, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False) -> PersonFilmographyResponse:
        person = self._resolve_person(person_id)
        return self.paginator.get_person_scenes(person, page=page, page_size=page_size, source=source, local_only=local_only)

    def get_person_credit_backdrops(self, person_id: Any, tmdb_id: int, media_type: str) -> Dict[str, Any]:
        person = self._resolve_person(person_id)
        normalized_type = "tv" if str(media_type or "").lower() in {"tv", "series"} else "movie"
        ui_lang = DEFAULT_FALLBACK_LANGUAGE

        raw_data = self.tmdb.get_details(tmdb_id, normalized_type, language=ui_lang, include_images=True, append_parts=["images"])
        backdrops = ((raw_data or {}).get("images") or {}).get("backdrops") or []
        has_valid_backdrops = any((not bd.get("iso_639_1") or bd.get("iso_639_1") == "") and int(bd.get("width") or 0) >= 1280 for bd in backdrops)

        resolved_backdrops = []
        for bd in backdrops:
            resolved_bd = dict(bd)
            resolved_bd["file_path"] = self._resolve_img(bd.get("file_path"), "backdrops", size="original")
            resolved_backdrops.append(resolved_bd)

        return {
            "tmdb_id": tmdb_id,
            "media_type": normalized_type,
            "title": raw_data.get("title") or raw_data.get("name") or raw_data.get("original_title") or raw_data.get("original_name"),
            "backdrops": resolved_backdrops,
            "has_valid_backdrops": has_valid_backdrops,
        }

    def search_people_tmdb(self, query: str, language: Optional[str] = None, adult_only: bool = False, page: int = 1, source: str = "all") -> List[Dict[str, Any]]:
        return self.search_service.search_people_tmdb(
            query=query,
            language=language,
            adult_only=adult_only,
            page=page,
            source=source,
        )

    def add_person_tmdb(
        self,
        db_id_or_external: str,
        name: Optional[str] = None,
        profile_path: Optional[str] = None,
        gender: Optional[int] = None,
        is_adult: Optional[bool] = None,
        is_active: bool = False
    ) -> Dict[str, Any]:
        return self.search_service.add_person_tmdb(
            db_id_or_external=db_id_or_external,
            name=name,
            profile_path=profile_path,
            gender=gender,
            is_adult=is_adult,
            is_active=is_active,
        )
