import logging
import requests
from typing import Optional, Dict, Any, List

from app.core.cache_service import CacheService
from app.core.enums import Provider


logger = logging.getLogger(__name__)

class BaseScraper:
    """
    Base scraper class containing cache services, reusable request sessions,
    and configuration helpers using SettingsPort.
    """

    def __init__(self, settings_port: Any, cache_service: Optional[CacheService] = None, provider: Optional[Provider] = None):
        from sqlalchemy.orm import Session
        if isinstance(settings_port, Session):
            from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
            self.settings_port = DbSettingsAdapter(settings_port)
        else:
            self.settings_port = settings_port
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

    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Helper to get a setting from settings port, falling back to environment."""
        if not hasattr(self, "_settings_cache"):
            self._settings_cache = {}
        if key in self._settings_cache:
            return self._settings_cache[key]

        import os
        val = None
        try:
            val = self.settings_port.get_setting(key)
        except Exception as e:
            logger.debug(f"Failed to query setting {key} from settings port: {e}")
        
        if val is not None:
            ret = str(val)
        else:
            # Fallback to env variables (uppercase)
            env_val = os.getenv(key.upper())
            ret = env_val if env_val else default
            
        self._settings_cache[key] = ret
        return ret


    def execute_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Executes a GraphQL query against the provider's endpoint."""
        if not self.provider:
            return None

        # Resolve endpoint and API keys
        pref = self.provider.value  # e.g. 'stashdb', 'fansdb', 'porndb'
        endpoint = self.get_setting(f"{pref}_endpoint")
        api_key = self.get_setting(f"{pref}_api_key") or self.get_setting(f"{pref}_api_token")

        if not endpoint:
            if pref == "stashdb":
                endpoint = "https://stashdb.org/graphql"
            elif pref == "fansdb":
                endpoint = "https://fansdb.cc/graphql"
            elif pref == "porndb":
                endpoint = "https://theporndb.net/graphql"

        headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            # StashDB and FansDB use ApiKey header, PornDB uses Authorization Bearer
            if pref in ("stashdb", "fansdb"):
                headers["ApiKey"] = api_key
            else:
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
        is_stash = self.provider == Provider.STASHDB
        measurements_field = """
            band_size
            cup_size
            waist_size
            hip_size
        """ if is_stash else """
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
            if is_stash:
                res["measurements"] = {
                    "band_size": res.get("band_size"),
                    "cup_size": res.get("cup_size"),
                    "waist": res.get("waist_size"),
                    "hip": res.get("hip_size"),
                }
        return res
