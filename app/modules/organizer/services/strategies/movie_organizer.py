from typing import List, Dict, Any, Optional
from app.modules.organizer.services.strategies.base_organizer import BaseMediaOrganizer
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.core.language import LanguageService

class MovieOrganizer(BaseMediaOrganizer):
    def build_images_list(self, item: MediaItem, active_m: Optional[MetadataMatch], target_lang: str) -> List[Dict[str, Any]]:
        images_list = []
        if active_m:
            loc = LanguageService.get_best_localization(active_m.localizations, target_lang)
            if loc:
                resolved = self._resolve_image_with_fallback(loc.local_poster_path, loc.poster_path, "posters")
                if resolved:
                    images_list.append({"path": resolved})
        return images_list
