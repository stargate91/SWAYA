from typing import List, Dict, Any, Optional
from app.application.organizer.strategies.base_organizer import BaseMediaOrganizer
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.language import LanguageService

class SceneOrganizer(BaseMediaOrganizer):
    def build_images_list(self, item: MediaItem, active_m: Optional[MetadataMatch], target_lang: str) -> List[Dict[str, Any]]:
        images_list = []
        if active_m:
            resolved = self._resolve_image_with_fallback(active_m.local_backdrop_path, active_m.backdrop_path, "scene_stills")
            if resolved:
                images_list.append({"path": resolved})
            else:
                loc = LanguageService.get_best_localization(active_m.localizations, target_lang)
                if loc:
                    resolved = self._resolve_image_with_fallback(loc.local_poster_path, loc.poster_path, "posters")
                    if resolved:
                        images_list.append({"path": resolved})
        return images_list
