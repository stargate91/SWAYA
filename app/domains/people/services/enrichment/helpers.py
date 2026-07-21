import re
from typing import List, Optional
from app.core.enums import Provider

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
        if not existing:
            existing = []
        seen = set()
        res_list = []

        def normalize_key(img: str) -> str:
            if img.startswith(("http://", "https://")):
                return img.split("?")[0].lower()
            return img.split("/")[-1].split("?")[0].lower()

        for img in existing:
            if not img:
                continue
            norm = normalize_key(img)
            if norm not in seen:
                seen.add(norm)
                res_list.append(img)
        for img in new_images:
            if not img:
                continue
            norm = normalize_key(img)
            if norm not in seen:
                seen.add(norm)
                res_list.append(img)
        return res_list
