import logging
from typing import Optional, Tuple
from app.core.enums import Provider, ItemStatus
from app.modules.library.models import MediaItem
from app.core.constants import PORNDB_API_BASE, SCRAPER_REQUEST_TIMEOUT
from app.modules.scrapers.resolvers.adult.base_resolver import BaseStashGraphQLResolver

logger = logging.getLogger(__name__)

class PornDbResolver(BaseStashGraphQLResolver):
    """
    Submodule to resolve matches from PornDB API.
    """
    def __init__(self, scraper):
        super().__init__(scraper, Provider.PORNDB, ['porndb_api_key', 'porndb_api_token'])

    def resolve_by_hash(
        self,
        item: MediaItem,
        hash_type: str,
        hash_value: str,
        validate_fn
    ) -> Tuple[Optional[dict], Optional[ItemStatus]]:
        if not hash_value or hash_type != 'oshash':
            return None, None

        api_token = self.scraper.get_setting('porndb_api_key') or self.scraper.get_setting('porndb_api_token')
        headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        cache_key = f'porndb/scenes/hash/v4/{hash_type.lower()}/{hash_value}'
        cached = self.scraper.cache.get(self.provider, cache_key)
        if cached is not None:
            if cached and cached.get("scene"):
                scene_data = cached["scene"]
                status = validate_fn(item, scene_data, ItemStatus(cached["status"]))
                return scene_data, status
            return None, None

        url = f'{PORNDB_API_BASE}/scenes/hash/{hash_value}?type={hash_type.upper()}'
        try:
            resp = self.scraper.session.get(url, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
            if resp.status_code == 200:
                res_json = resp.json()
                candidate = (res_json or {}).get('data')
                if candidate:
                    status = validate_fn(item, candidate, ItemStatus.MATCHED)
                    self.scraper.cache.set(self.provider, cache_key, {"scene": candidate, "status": status.value})
                    return candidate, status
                else:
                    self.scraper.cache.set(self.provider, cache_key, {})
            else:
                self.scraper.cache.set(self.provider, cache_key, {})
        except Exception as exc:
            logger.error('PornDB %s query failed for scenes: %s', hash_type.upper(), exc)

        return None, None

