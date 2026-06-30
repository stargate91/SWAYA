from typing import List, Dict, Any, Optional
from app.application.organizer.strategies.base_organizer import BaseMediaOrganizer
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.enums import MediaType
from app.shared_kernel.language import LanguageService

class EpisodeOrganizer(BaseMediaOrganizer):
    def build_images_list(self, item: MediaItem, active_m: Optional[MetadataMatch], target_lang: str) -> List[Dict[str, Any]]:
        images_list = []
        if active_m:
            if active_m.media_type == MediaType.EPISODE:
                season_m = None
                if active_m.parent_id:
                    season_m = self.db.query(MetadataMatch).filter(MetadataMatch.id == active_m.parent_id).first()

                tv_m = None
                if season_m and season_m.parent_id:
                    tv_m = self.db.query(MetadataMatch).filter(MetadataMatch.id == season_m.parent_id).first()
                elif active_m.parent_id:
                    parent_m = self.db.query(MetadataMatch).filter(MetadataMatch.id == active_m.parent_id).first()
                    if parent_m and parent_m.media_type == MediaType.TV:
                        tv_m = parent_m

                if season_m:
                    loc = LanguageService.get_best_localization(season_m.localizations, target_lang)
                    if loc:
                        resolved = self._resolve_image_with_fallback(loc.local_poster_path, loc.poster_path, "posters")
                        if resolved:
                            images_list.append({"path": resolved})

                if tv_m:
                    loc = LanguageService.get_best_localization(tv_m.localizations, target_lang)
                    if loc:
                        resolved = self._resolve_image_with_fallback(loc.local_poster_path, loc.poster_path, "posters")
                        if resolved:
                            images_list.append({"path": resolved})

                if not images_list:
                    resolved = self._resolve_image_with_fallback(active_m.local_still_path, active_m.still_path, "stills")
                    if resolved:
                        images_list.append({"path": resolved})
        return images_list
