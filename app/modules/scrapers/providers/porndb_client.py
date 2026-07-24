import logging
from typing import Optional, Dict, Any

from app.core.enums import Provider
from app.modules.scrapers.support.base import BaseScraper
from app.core.constants import PORNDB_API_BASE, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class PornDbClient(BaseScraper):
    def __init__(self, settings, session=None):
        super().__init__(settings, cache_service=None, provider=Provider.PORNDB)
        if session is not None:
            self.session = session

    def _get_headers(self) -> Dict[str, str]:
        api_token = self.get_setting("porndb_api_key") or self.get_setting("porndb_api_token")
        if not api_token:
            return {}
        return {
            "Authorization": f"Bearer {api_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def get_scene_graphql(self, endpoint: str, query: str, scene_id: str) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        if not headers:
            return None
        payload = {"query": query, "variables": {"id": scene_id}}
        try:
            resp = self.session.post(endpoint, json=payload, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception as e:
            logger.error(f"Error querying ThePornDB GraphQL for scene {scene_id}: {e}")
            return None

    def get_scene_rest(self, scene_id: str) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        if not headers:
            return None
        try:
            url = f"{PORNDB_API_BASE}/scenes/{scene_id}"
            resp = self.session.get(url, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception as rest_e:
            logger.error(f"Error querying PornDB REST fallback for scene {scene_id}: {rest_e}")
            return None
