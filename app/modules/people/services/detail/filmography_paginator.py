import math
from typing import Optional, Any

from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.people.services.filmography_service import FilmographyService
from app.modules.people.schemas import PersonFilmographyResponse
from app.modules.people.models import Person

class FilmographyPaginator:
    def __init__(self, tmdb: Any, filmography_service: FilmographyService):
        self.tmdb = tmdb
        self.filmography_service = filmography_service

    def get_person_movies(self, person: Person, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False, sort_by: Optional[str] = None) -> PersonFilmographyResponse:
        person_id = person.id
        ext_ids = person.external_ids or {}
        tmdb_id = ext_ids.get("tmdb") or ext_ids.get("tmdb_id")
        if not tmdb_id:
            for link in person.external_links:
                if link.provider.value == "tmdb":
                    tmdb_id = link.external_id
                    break
        if not tmdb_id and not person.is_adult and str(person_id).isdigit() and person_id < 100000000:
            tmdb_id = person_id

        if local_only or (source and source.lower() != "tmdb"):
            res = self.filmography_service.get_person_movies(person_id, page, page_size, source, local_only=local_only, sort_by=sort_by)
            return PersonFilmographyResponse(**res)

        movies, _, _, _ = self.filmography_service.get_combined_filmography(
            person_id,
            tmdb_id=tmdb_id,
            ui_lang=DEFAULT_FALLBACK_LANGUAGE,
            tmdb_client=self.tmdb,
            is_adult=person.is_adult,
            known_for_department=person.known_for_department,
            person_name=person.name,
            sort_by=sort_by
        )

        total_items = len(movies)
        total_pages = max(1, math.ceil(total_items / page_size))
        start_idx = (page - 1) * page_size
        sliced = movies[start_idx : start_idx + page_size]
        
        res = {
            "items": sliced,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return PersonFilmographyResponse(**res)

    def get_person_tv(self, person: Person, page: int = 1, page_size: int = 12, local_only: bool = False, sort_by: Optional[str] = None) -> PersonFilmographyResponse:
        person_id = person.id
        if local_only:
            res = self.filmography_service.get_person_tv(person_id, page, page_size, sort_by=sort_by)
            return PersonFilmographyResponse(**res)

        ext_ids = person.external_ids or {}
        tmdb_id = ext_ids.get("tmdb") or ext_ids.get("tmdb_id")
        if not tmdb_id:
            for link in person.external_links:
                if link.provider.value == "tmdb":
                    tmdb_id = link.external_id
                    break
        if not tmdb_id and not person.is_adult and str(person_id).isdigit() and person_id < 100000000:
            tmdb_id = person_id

        _, tv, _, _ = self.filmography_service.get_combined_filmography(
            person_id,
            tmdb_id=tmdb_id,
            ui_lang=DEFAULT_FALLBACK_LANGUAGE,
            tmdb_client=self.tmdb,
            is_adult=person.is_adult,
            known_for_department=person.known_for_department,
            person_name=person.name,
            sort_by=sort_by
        )
        
        total_items = len(tv)
        total_pages = max(1, math.ceil(total_items / page_size))
        start_idx = (page - 1) * page_size
        sliced = tv[start_idx : start_idx + page_size]
        
        res = {
            "items": sliced,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return PersonFilmographyResponse(**res)

    def get_person_scenes(self, person: Person, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False) -> PersonFilmographyResponse:
        person_id = person.id
        res = self.filmography_service.get_person_scenes(person_id, page, page_size, source, local_only=local_only)
        return PersonFilmographyResponse(**res)
