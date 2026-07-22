import logging
from typing import Optional

from app.core.enums import Provider, MediaType
from app.modules.scrapers.support.base import BaseScraper

from app.core.constants import FANSDB_DEFAULT_ENDPOINT, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class FansDBScraper(BaseScraper):
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

        # Using Stash-compatible GraphQL schema supported by FansDB's GraphQL endpoint
        query = """
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
        headers = {"ApiKey": api_token, "Content-Type": "application/json"}
        payload = {"query": query, "variables": {"id": scene_id}}

        def extract_and_map_measurements(result):
            if "errors" in result:
                logger.error(f"GraphQL errors from FansDB: {result['errors']}")
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
            result_extractor=extract_and_map_measurements,
            timeout=SCRAPER_REQUEST_TIMEOUT,
        )


