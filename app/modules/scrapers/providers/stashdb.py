import logging
from typing import Optional

from app.core.enums import Provider, MediaType
from app.modules.scrapers.support.base import BaseStashGraphQLScraper

from app.core.constants import STASHDB_DEFAULT_ENDPOINT, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class StashDBScraper(BaseStashGraphQLScraper):
    """StashDB-specific metadata retriever and parser utilizing GraphQL and ScraperNormalizer."""

    def __init__(self, settings, cache_service=None):
        super().__init__(settings, cache_service, Provider.STASHDB)

    def fetch_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        """Queries StashDB GraphQL endpoint for scene info. Always mapped to English locale."""
        import re
        if not re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", str(scene_id)):
            logger.debug(f"Invalid UUID for StashDB fetch_scene: {scene_id}")
            return None

        endpoint = self.get_setting("stashdb_endpoint", STASHDB_DEFAULT_ENDPOINT)
        api_key = self.get_setting("stashdb_api_key")
        if not api_key:
            logger.warning("StashDB API key not configured.")
            return None

        cache_key = f"stashdb/scene/v4/{scene_id}"
        cached_data = self.cache.get(Provider.STASHDB, cache_key, force_refresh=force_refresh)
        if cached_data:
            if cached_data.get("cached_error"):
                return None
            return cached_data

        headers = {"ApiKey": api_key, "Content-Type": "application/json"}
        payload = {"query": self.STASH_FIND_SCENE_QUERY, "variables": {"id": scene_id}}

        return self.get_json_cached(
            Provider.STASHDB,
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



