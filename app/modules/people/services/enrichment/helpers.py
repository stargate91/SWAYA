import re
from typing import List, Optional
from app.core.enums import Provider
from app.modules.people.domain.images import merge_images as _merge_images

class EnrichmentHelpers:
    @staticmethod
    def extract_ids_from_urls(urls: List[str]) -> List[dict]:
        links = []
        for url in urls:
            if not url or not isinstance(url, str):
                continue
            
            # PornDB: https://theporndb.net/performers/<uuid> or <slug>
            match_porndb = re.search(r'theporndb\.net/performers/([A-Za-z0-9_-]+)', url)
            if match_porndb:
                links.append({"provider": Provider.PORNDB, "external_id": match_porndb.group(1)})
                continue
                
            # FansDB: https://fansdb.cc/performers/<uuid>
            match_fansdb = re.search(r'fansdb\.cc/performers/([a-fA-F0-9\-]+)', url)
            if match_fansdb:
                links.append({"provider": Provider.FANSDB, "external_id": match_fansdb.group(1)})
                continue
                
            # StashDB: https://stashdb.org/performers/<uuid>
            match_stashdb = re.search(r'stashdb\.org/performers/([a-fA-F0-9\-]+)', url)
            if match_stashdb:
                links.append({"provider": Provider.STASHDB, "external_id": match_stashdb.group(1)})
                continue
                
            # TMDB: https://www.themoviedb.org/person/(\d+)
            match_tmdb = re.search(r'themoviedb\.org/person/(\d+)', url)
            if match_tmdb:
                links.append({"provider": Provider.TMDB, "external_id": match_tmdb.group(1)})
                continue
                
        return links

    @staticmethod
    def merge_images(existing: Optional[List[str]], new_images: List[str]) -> List[str]:
        return _merge_images(existing, new_images)
