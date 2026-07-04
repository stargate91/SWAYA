import math
from typing import Optional, Any
from sqlalchemy.orm import Session

from app.domains.people.models import MediaPersonLink
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.language import LanguageService

class PaginatedCreditsRetriever:
    def __init__(self, db: Session, library_port: Any, resolve_img_fn: Any, fetch_remote_credits_fn: Any):
        self.db = db
        self.library_port = library_port
        self.resolve_img_fn = resolve_img_fn
        self.fetch_remote_credits_fn = fetch_remote_credits_fn

    def get_person_movies(self, person_id: int, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False):
        """Fetches paginated, formatted movies that a performer is credited in."""
        if not local_only and source and source.lower() in ("porndb", "stashdb", "fansdb"):
            res = self.fetch_remote_credits_fn(person_id, source, "movie", page, page_size)
            if res:
                return res
                
        db = self.db
        active_match_ids = self.library_port.get_active_match_ids(media_type="movie", provider=source)
        links = db.query(MediaPersonLink).filter(
            MediaPersonLink.person_id == person_id,
            MediaPersonLink.match_id.in_(active_match_ids)
        ).all()
        
        movies = []
        ui_lang = DEFAULT_FALLBACK_LANGUAGE
        for link in links:
            match = link.match
            item = match.media_item
            match_loc = LanguageService.get_best_localization(match.localizations, ui_lang)
            title = match_loc.title if match_loc else item.filename
            
            movies.append({
                "id": item.id,
                "title": title,
                "type": "movie",
                "tmdb_id": int(match.external_id) if match.external_id.isdigit() else 0,
                "year": match.release_date.year if match.release_date else None,
                "poster_path": self.resolve_img_fn(match_loc.poster_path if match_loc else None, "posters"),
                "backdrop_path": self.resolve_img_fn(match.backdrop_path, "backdrops", size="original"),
                "rating": match.rating_tmdb or 0.0,
                "rating_porndb": match.rating_porndb,
                "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                "character": link.character_name,
                "in_library": True,
                "source": match.provider.value if hasattr(match.provider, "value") else str(match.provider),
            })
            
        total_items = len(movies)
        total_pages = max(1, math.ceil(total_items / page_size))
        start_idx = (page - 1) * page_size
        sliced = movies[start_idx : start_idx + page_size]
        
        return {
            "items": sliced,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }

    def get_person_tv(self, person_id: int, page: int = 1, page_size: int = 12):
        """Fetches paginated, formatted TV shows that a performer is credited in."""
        db = self.db
        active_match_ids = self.library_port.get_active_match_ids(media_type="tv_or_episode")
        links = db.query(MediaPersonLink).filter(
            MediaPersonLink.person_id == person_id,
            MediaPersonLink.match_id.in_(active_match_ids)
        ).all()
        
        tv_map = {}
        ui_lang = DEFAULT_FALLBACK_LANGUAGE
        for link in links:
            match = link.match
            item = match.media_item
            match_loc = LanguageService.get_best_localization(match.localizations, ui_lang)
            title = match_loc.title if match_loc else item.filename
            
            sid = match.parent_id or match.id
            if sid not in tv_map:
                tv_map[sid] = {
                    "id": item.id,
                    "title": title,
                    "type": "tv",
                    "tmdb_id": int(match.external_id) if match.external_id.isdigit() else 0,
                    "year": match.release_date.year if match.release_date else None,
                    "poster_path": self.resolve_img_fn(match_loc.poster_path if match_loc else None, "posters"),
                    "backdrop_path": self.resolve_img_fn(match.backdrop_path, "backdrops", size="original"),
                    "rating": match.rating_tmdb or 0.0,
                    "rating_porndb": match.rating_porndb,
                    "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                    "character": link.character_name,
                    "in_library": True,
                    "source": match.provider.value if hasattr(match.provider, "value") else str(match.provider),
                }
                
        tv_list = list(tv_map.values())
        total_items = len(tv_list)
        total_pages = max(1, math.ceil(total_items / page_size))
        start_idx = (page - 1) * page_size
        sliced = tv_list[start_idx : start_idx + page_size]
        
        return {
            "items": sliced,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }

    def get_person_scenes(self, person_id: int, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False):
        """Fetches paginated, formatted scenes (adult) that a performer is credited in."""
        if not local_only and source and source.lower() in ("porndb", "stashdb", "fansdb"):
            res = self.fetch_remote_credits_fn(person_id, source, "scene", page, page_size)
            if res:
                return res
                
        db = self.db
        active_match_ids = self.library_port.get_active_match_ids(media_type="scene", provider=source)
        links = db.query(MediaPersonLink).filter(
            MediaPersonLink.person_id == person_id,
            MediaPersonLink.match_id.in_(active_match_ids)
        ).all()
        
        scenes = []
        ui_lang = DEFAULT_FALLBACK_LANGUAGE
        for link in links:
            match = link.match
            item = match.media_item
            match_loc = LanguageService.get_best_localization(match.localizations, ui_lang)
            title = match_loc.title if match_loc else item.filename
            
            scenes.append({
                "id": item.id,
                "title": title,
                "type": "scene",
                "tmdb_id": int(match.external_id) if match.external_id.isdigit() else 0,
                "year": match.release_date.year if match.release_date else None,
                "release_date": match.release_date.isoformat() if match.release_date else None,
                "poster_path": self.resolve_img_fn(match_loc.poster_path if match_loc else None, "posters"),
                "backdrop_path": self.resolve_img_fn(match.backdrop_path, "backdrops", size="original"),
                "rating": match.rating_tmdb or 0.0,
                "rating_porndb": match.rating_porndb,
                "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                "character": link.character_name,
                "in_library": True,
                "source": match.provider.value if hasattr(match.provider, "value") else str(match.provider),
            })
            
        total_items = len(scenes)
        total_pages = max(1, math.ceil(total_items / page_size))
        start_idx = (page - 1) * page_size
        sliced = scenes[start_idx : start_idx + page_size]
        
        return {
            "items": sliced,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }
