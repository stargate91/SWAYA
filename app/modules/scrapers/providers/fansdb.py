import logging
from typing import Optional

from app.core.enums import Provider, MediaType
from app.modules.scrapers.support.base import BaseStashGraphQLScraper

from app.core.constants import FANSDB_DEFAULT_ENDPOINT, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class FansDBScraper(BaseStashGraphQLScraper):
    """FansDB-specific metadata retriever and parser utilizing GraphQL and ScraperNormalizer."""

    def __init__(self, settings, cache_service=None):
        super().__init__(settings, cache_service, Provider.FANSDB)

    def fetch_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        """Queries FansDB GraphQL endpoint for scene info. Always mapped to English locale."""
        print(f"[DEBUG] FansDBScraper.fetch_scene called with scene_id={scene_id}")
        import re
        if not re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", str(scene_id)):
            print(f"[DEBUG] FansDBScraper.fetch_scene: Invalid UUID: {scene_id}")
            return None

        endpoint = self.get_setting("fansdb_endpoint", FANSDB_DEFAULT_ENDPOINT)
        api_token = self.get_setting("fansdb_api_key")
        if not api_token:
            print("[DEBUG] FansDBScraper.fetch_scene: FansDB API key/token not configured.")
            return None

        cache_key = f"fansdb/scene/v4/{scene_id}"
        cached_data = self.cache.get(Provider.FANSDB, cache_key, force_refresh=force_refresh)
        if cached_data:
            if cached_data.get("cached_error"):
                return None
            return cached_data

        headers = {"ApiKey": api_token, "Content-Type": "application/json"}
        payload = {"query": self.STASH_FIND_SCENE_QUERY, "variables": {"id": scene_id}}

        return self.get_json_cached(
            Provider.FANSDB,
            cache_key,
            endpoint,
            method="POST",
            json_data=payload,
            headers=headers,
            force_refresh=force_refresh,
            media_type=MediaType.SCENE,
            external_id=scene_id,
            result_extractor=self.extract_and_map_measurements,
            timeout=SCRAPER_REQUEST_TIMEOUT,
        )



