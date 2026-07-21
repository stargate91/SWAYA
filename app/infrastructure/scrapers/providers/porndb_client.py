import logging
from typing import Optional, Dict, Any

from app.shared_kernel.enums import Provider
from app.infrastructure.scrapers.support.base import BaseScraper
from app.shared_kernel.constants import PORNDB_API_BASE, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class PornDbClient(BaseScraper):
    def __init__(self, settings_port):
        super().__init__(settings_port, cache_service=None, provider=Provider.PORNDB)

    def _get_headers(self) -> Dict[str, str]:
        api_token = self.get_setting("porndb_api_key") or self.get_setting("porndb_api_token")
        if not api_token:
            return {}
        return {
            "Authorization": f"Bearer {api_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def get_rating(self, rating_type: str, identifier: str) -> Optional[float]:
        headers = self._get_headers()
        if not headers:
            return None
        try:
            url = f"{PORNDB_API_BASE}/{rating_type}s/{identifier}"
            resp = self.session.get(url, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json().get("data")
                rating = data.get("rating") if data else None
                return float(rating) if rating is not None else None
            return None
        except Exception as e:
            logger.error(f"Error fetching PornDB rating for {rating_type} {identifier}: {e}")
            return None

    def get_performer_bio(self, performer_id: str) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        if not headers:
            return None
        try:
            response = self.session.get(
                f"{PORNDB_API_BASE}/performers/{performer_id}",
                headers=headers,
                timeout=SCRAPER_REQUEST_TIMEOUT,
            )
            if response.status_code == 200:
                return response.json().get("data")
            return None
        except Exception as exc:
            logger.error(f"Error fetching PornDB performer bio/extras: {exc}")
            return None

    def get_movie_by_hash(self, file_hash: str, hash_type: str) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        if not headers:
            return None
        try:
            response = self.session.get(
                f"{PORNDB_API_BASE}/movies/hash/{file_hash}",
                params={"type": hash_type},
                headers=headers,
                timeout=SCRAPER_REQUEST_TIMEOUT,
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as exc:
            logger.error(f"Error querying PornDB movie hash {file_hash}: {exc}")
            return None

    def get_movie_details(self, movie_id: str) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        if not headers:
            return None
        try:
            url = f"{PORNDB_API_BASE}/movies/{movie_id}"
            response = self.session.get(url, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error fetching PornDB movie {movie_id}: {e}")
            return None

    def search_movies(self, query: str, year: Optional[int] = None, per_page: int = 10, page: int = 1) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        if not headers:
            return None
        params = {"q": query, "per_page": max(1, min(per_page, 25)), "page": page}
        if year:
            params["year"] = year
        try:
            response = self.session.get(
                f"{PORNDB_API_BASE}/movies",
                params=params,
                headers=headers,
                timeout=SCRAPER_REQUEST_TIMEOUT,
            )
            return response.json()
        except Exception as exc:
            logger.error(f"Error searching PornDB movies for {query}: {exc}")
            return None

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
