import logging
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.core.enums import MediaType, Provider
from app.modules.people.models import MediaPersonLink
from app.core.language import LanguageService



logger = logging.getLogger(__name__)

class LocalCreditsAggregator:
    def __init__(self, db: Session, resolver: Optional[Any] = None, image_service: Any = None):
        self.db = db
        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            resolver = MediaItemService(db)
        self.resolver = resolver
        self.image_service = image_service

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def aggregate_credits(self, person_id: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        db = self.db
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        
        # Load credits linked to this person
        active_match_ids = self.resolver.get_active_match_ids()
        links = db.query(MediaPersonLink).filter(
            MediaPersonLink.person_id == person_id,
            MediaPersonLink.match_id.in_(active_match_ids)
        ).all()
        
        movies = []
        tv_map = {}
        scenes = []
        
        for link in links:
            match = link.match
            item = match.media_item
            if not item:
                continue
            match_loc = LanguageService.get_best_localization(match.localizations, ui_lang)
            title = match_loc.title if match_loc else item.filename
            
            credit_entry = {
                "id": item.id,
                "title": title,
                "type": match.media_type.value,
                "tmdb_id": int(match.external_id) if match.external_id.isdigit() else 0,
                "year": match.release_date.year if match.release_date else None,
                "release_date": match.release_date.isoformat() if match.release_date else None,
                "poster_path": self._resolve_img(match_loc.poster_path if match_loc else None, "posters"),
                "backdrop_path": self._resolve_img(match.backdrop_path, "backdrops", size="original"),
                "rating": match.rating_tmdb or 0.0,
                "rating_porndb": match.rating_porndb,
                "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                "character": link.character_name,
                "in_library": True,
            }
            
            if match.media_type.is_adult:
                scenes.append(credit_entry)
            elif match.media_type == MediaType.MOVIE:
                from app.modules.scrapers.support.registry import ProviderRegistry
                if match.provider in ProviderRegistry.get_all_providers():
                    movies.append(credit_entry)
            elif match.media_type in (MediaType.TV, MediaType.EPISODE):
                if match.provider == Provider.TMDB:
                    sid = match.parent_id or match.id
                    if sid not in tv_map:
                        tv_map[sid] = credit_entry
        
        return movies, list(tv_map.values()), scenes
