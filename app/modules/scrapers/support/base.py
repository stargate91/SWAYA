import logging
import requests
from typing import Optional, Dict, Any, List

from app.core.cache_service import CacheService
from app.core.enums import Provider


logger = logging.getLogger(__name__)

class BaseScraper:
    """
    Base scraper class containing cache services, reusable request sessions,
    and configuration helpers using SettingsService.
    """

    def __init__(self, db: Any, cache_service: Optional[CacheService] = None, provider: Optional[Provider] = None):
        from sqlalchemy.orm import Session
        from app.modules.settings.services.settings_service import SettingsService
        if isinstance(db, Session):
            self.db = db
            self.settings_service = SettingsService(db)
        elif isinstance(db, SettingsService):
            self.settings_service = db
            self.db = db.db
        else:
            self.db = None
            self.settings_service = db
        self.cache = cache_service or CacheService()
        self.session = requests.Session()
        
        # Configure retry logic for rate limits and server errors
        from urllib3.util import Retry
        from requests.adapters import HTTPAdapter
        
        retries = Retry(
            total=5,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            raise_on_status=False
        )
        adapter = HTTPAdapter(max_retries=retries, pool_connections=10, pool_maxsize=20)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.provider = provider

    def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Search metadata provider for matching items."""
        raise NotImplementedError("Subclasses must implement search()")

    def get_details(self, external_id: str, **kwargs) -> Dict[str, Any]:
        """Fetch full details of an item by external ID."""
        raise NotImplementedError("Subclasses must implement get_details()")

    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Helper to get a setting from settings service, falling back to environment."""
        if not hasattr(self, "_settings_cache"):
            self._settings_cache = {}
        if key in self._settings_cache:
            return self._settings_cache[key]

        import os
        val = None
        try:
            val = self.settings_service.get_setting(key)
        except Exception as e:
            logger.debug(f"Failed to query setting {key} from settings service: {e}")
        
        if val is not None:
            ret = str(val)
        else:
            # Fallback to env variables (uppercase)
            env_val = os.getenv(key.upper())
            ret = env_val if env_val else default
            
        self._settings_cache[key] = ret
        return ret


    def get_json_cached(
        self,
        provider: Provider,
        cache_key: str,
        url: str,
        method: str = "GET",
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        force_refresh: bool = False,
        media_type: Optional[Any] = None,
        external_id: Optional[str] = None,
        result_extractor: Optional[Any] = None,
        max_retries: int = 3,
        timeout: int = 15,
    ) -> Optional[Any]:
        """Centralized HTTP request caller with caching, error logging, and rate-limiting retry."""
        cached_data = self.cache.get(provider, cache_key, force_refresh=force_refresh)
        if cached_data:
            if cached_data.get("cached_error"):
                return None
            return cached_data

        import time
        for attempt in range(max_retries):
            try:
                resp = self.session.request(
                    method,
                    url,
                    params=params,
                    json=json_data,
                    headers=headers,
                    timeout=timeout,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if result_extractor:
                        data = result_extractor(data)
                    
                    if data is not None and data != {}:
                        ext_id = external_id(data) if callable(external_id) else external_id
                        self.cache.set(
                            provider,
                            cache_key,
                            data,
                            status_code=200,
                            media_type=media_type,
                            external_id=ext_id,
                        )
                        return data
                    else:
                        ext_id = external_id(data) if callable(external_id) else external_id
                        self.cache.set(
                            provider,
                            cache_key,
                            {"cached_error": True},
                            status_code=404,
                            media_type=media_type,
                            external_id=ext_id,
                        )
                        return None
                elif resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 1))
                    logger.warning(f"Rate Limit (429) from {provider.value}. Waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                else:
                    ext_id = external_id(None) if callable(external_id) else external_id
                    self.cache.set(
                        provider,
                        cache_key,
                        {"cached_error": True},
                        status_code=resp.status_code,
                        media_type=media_type,
                        external_id=ext_id,
                    )
                    return None
            except Exception as e:
                logger.error(f"Error querying {provider.value} API (attempt {attempt+1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    return None
                time.sleep(1)
        return None


    def execute_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Executes a GraphQL query against the provider's endpoint."""
        if not self.provider:
            return None

        # Resolve endpoint and API keys
        from app.modules.scrapers.support.registry import ProviderRegistry
        config = ProviderRegistry.get_config(self.provider)
        pref = self.provider.value if self.provider else ""
        endpoint = self.get_setting(f"{pref}_endpoint")
        api_key = self.get_setting(f"{pref}_api_key") or self.get_setting(f"{pref}_api_token")

        if not endpoint and config:
            endpoint = config.default_endpoint

        headers = {
            "Content-Type": "application/json",
        }
        if api_key and config:
            if config.auth_header_type == "ApiKey":
                headers["ApiKey"] = api_key
            elif config.auth_header_type == "Bearer":
                headers["Authorization"] = f"Bearer {api_key}"

        try:
            response = self.session.post(
                endpoint,
                json={"query": query, "variables": variables or {}},
                headers=headers,
                timeout=15
            )
            if response.status_code != 200:
                logger.error(f"GraphQL HTTP error {response.status_code} from {pref}: {response.text}")
            response.raise_for_status()
            res_data = response.json()
            if "errors" in res_data:
                logger.error(f"GraphQL errors from {pref}: {res_data['errors']}")
                return None
            return res_data.get("data")
        except Exception as e:
            logger.error(f"Error querying {pref} GraphQL API: {e}")
            return None

    def search_performers(self, query_str: str) -> List[Dict[str, Any]]:
        """Search performers using GraphQL."""
        normalized = str(query_str or "").strip()
        if not normalized:
            return []

        performer_fields = """
            id
            name
            gender
            scene_count
            deleted
            images {
              url
            }
        """

        new_query = f"""
        query SearchPerformers($term: String!) {{
          searchPerformers(term: $term, per_page: 25) {{
            performers {{
              {performer_fields}
            }}
          }}
        }}
        """
        data = self.execute_query(new_query, {"term": normalized})
        if data and data.get("searchPerformers"):
            performers = data["searchPerformers"].get("performers") or []
            performers = [p for p in performers if not p.get("deleted")]
            if performers:
                return performers

        legacy_query = f"""
        query SearchPerformersLegacy($term: String!) {{
          searchPerformer(term: $term) {{
            {performer_fields}
          }}
        }}
        """
        data = self.execute_query(legacy_query, {"term": normalized})
        if not data or "searchPerformer" not in data:
            return []
        performers = data["searchPerformer"] or []
        return [p for p in performers if not p.get("deleted")]

    def get_performer_details(self, performer_id: str) -> Optional[Dict[str, Any]]:
        """Gets detailed performer metadata using GraphQL."""
        from app.modules.scrapers.support.registry import ProviderRegistry
        config = ProviderRegistry.get_config(self.provider) if self.provider else None
        uses_flat = config.uses_flat_measurements if config else False

        measurements_field = """
            band_size
            cup_size
            waist_size
            hip_size
        """ if uses_flat else """
            measurements {
              cup_size
              band_size
              waist
              hip
            }
        """

        gql_query = f"""
        query GetPerformer($id: ID!) {{
          findPerformer(id: $id) {{
            id
            name
            gender
            breast_type
            scene_count
            birth_date
            ethnicity
            eye_color
            hair_color
            height
            aliases
            tattoos {{
              location
              description
            }}
            piercings {{
              location
              description
            }}
            {measurements_field}
            images {{
              url
            }}
            urls {{
              url
              site {{
                id
                name
              }}
            }}
            career_start_year
            career_end_year
            death_date
            country
          }}
        }}
        """
        data = self.execute_query(gql_query, {"id": performer_id})
        if not data or "findPerformer" not in data:
            return None
        res = data["findPerformer"]
        if res:
            # Map location -> body_part for tattoos and piercings
            if "tattoos" in res and isinstance(res["tattoos"], list):
                for t in res["tattoos"]:
                    if "location" in t:
                        t["body_part"] = t["location"]
            if "piercings" in res and isinstance(res["piercings"], list):
                for p in res["piercings"]:
                    if "location" in p:
                        p["body_part"] = p["location"]
            
            # Map urls to a list of strings
            if "urls" in res and isinstance(res["urls"], list):
                res["urls"] = [u.get("url") for u in res["urls"] if u and u.get("url")]

            # Map measurements
            if uses_flat:
                res["measurements"] = {
                    "band_size": res.get("band_size"),
                    "cup_size": res.get("cup_size"),
                    "waist": res.get("waist_size"),
                    "hip": res.get("hip_size"),
                }
        return res


class BaseStashGraphQLScraper(BaseScraper):
    """
    Shared base class for scrapers that interface with StashDB-compatible
    GraphQL endpoints (StashDB, FansDB, and PornDB GraphQL).
    """

    STASH_FIND_SCENE_QUERY = """
    query FindScene($id: ID!) {
      findScene(id: $id) {
        id
        title
        details
        date
        duration
        tags {
          name
        }
        studio {
          id
          name
          images {
            url
          }
          parent {
            id
            name
            images {
              url
            }
          }
        }
        performers {
          performer {
            id
            name
            gender
            scene_count
            birth_date
            images {
              url
            }
            ethnicity
            hair_color
            eye_color
            height
            band_size
            cup_size
            waist_size
            hip_size
            urls {
              url
              site {
                id
                name
              }
            }
            career_start_year
            career_end_year
            death_date
            country
          }
        }
        images {
          url
        }
      }
    }
    """

    @staticmethod
    def extract_and_map_measurements(result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not result:
            return None
        if "errors" in result:
            logger.error(f"GraphQL errors: {result['errors']}")
            return None
        data = result.get("data", {}).get("findScene")
        if data:
            for p_entry in data.get("performers") or []:
                perf = p_entry.get("performer")
                if perf:
                    perf["measurements"] = {
                        "band_size": perf.get("band_size"),
                        "cup_size": perf.get("cup_size"),
                        "waist": perf.get("waist_size"),
                        "hip": perf.get("hip_size"),
                    }
                    if "urls" in perf and isinstance(perf["urls"], list):
                        perf["urls"] = [u.get("url") for u in perf["urls"] if u and u.get("url")]
        return data

    def fetch_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        """Queries the Stash-compatible GraphQL endpoint for scene info."""
        import re
        if not re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", str(scene_id)):
            logger.debug(f"Invalid UUID for {self.provider.value} fetch_scene: {scene_id}")
            return None

        pref = self.provider.value
        endpoint_key = f"{pref}_endpoint"
        api_key_name = f"{pref}_api_key"

        from app.modules.scrapers.support.registry import ProviderRegistry
        config = ProviderRegistry.get_config(self.provider)
        
        endpoint = self.get_setting(endpoint_key)
        if not endpoint and config:
            endpoint = config.default_endpoint

        api_token = self.get_setting(api_key_name)
        if not api_token:
            logger.warning(f"{self.provider.value.upper()} API key not configured.")
            return None

        cache_key = f"{pref}/scene/v4/{scene_id}"
        cached_data = self.cache.get(self.provider, cache_key, force_refresh=force_refresh)
        if cached_data:
            if cached_data.get("cached_error"):
                return None
            return cached_data

        headers = {"ApiKey": api_token, "Content-Type": "application/json"}
        payload = {"query": self.STASH_FIND_SCENE_QUERY, "variables": {"id": scene_id}}

        from app.core.constants import SCRAPER_REQUEST_TIMEOUT
        from app.core.enums import MediaType

        return self.get_json_cached(
            self.provider,
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

