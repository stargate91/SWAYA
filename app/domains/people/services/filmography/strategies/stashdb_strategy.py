import logging
from typing import List, Tuple, Dict, Any
from app.domains.people.services.filmography.strategies.base_strategy import BaseFilmographyStrategy
from app.shared_kernel.enums import Provider

logger = logging.getLogger(__name__)

class StashDbFilmographyStrategy(BaseFilmographyStrategy):
    def query_remote(self, media_type: str, ext_id: str, source: str) -> Tuple[List[Dict[str, Any]], int]:
        if media_type != "scene":
            return [], 0

        mapped_items = []
        total_items = 0
        remote_per_page = 5000

        try:
            prov_enum = Provider(source.lower())
            scraper = self.scrapers.adult(prov_enum, self.db)
            query = """
            query QueryScenes($input: SceneQueryInput!) {
              queryScenes(input: $input) {
                count
                scenes {
                  id
                  title
                  date
                  studio {
                    id
                    name
                  }
                  images {
                    url
                  }
                }
              }
            }
            """
            variables = {
                "input": {
                    "performers": {
                        "value": [ext_id],
                        "modifier": "INCLUDES"
                    },
                    "page": 1,
                    "per_page": remote_per_page,
                    "direction": "DESC",
                    "sort": "DATE"
                }
            }
            res_data = scraper.execute_query(query, variables)
            if res_data and "queryScenes" in res_data:
                qs = res_data["queryScenes"]
                total_items = qs.get("count") or 0
                raw_scenes = qs.get("scenes") or []
                for s in raw_scenes:
                    sid = s.get("id")
                    title = s.get("title") or "Unknown"
                    date_str = s.get("date")
                    year = None
                    if date_str:
                        try:
                            year = int(date_str.split("-")[0])
                        except Exception as e:
                            logger.debug(f"Swallowed exception: {e}", exc_info=True)
                    studio_name = s.get("studio", {}).get("name") if s.get("studio") else None
                    poster_url = s["images"][0].get("url") if s.get("images") else None
                    
                    mapped_items.append({
                        "id": sid,
                        "title": title,
                        "type": "scene",
                        "media_type": "scene",
                        "year": year,
                        "release_date": date_str,
                        "studio": studio_name,
                        "poster_path": poster_url,
                        "backdrop_path": poster_url,
                        "in_library": False,
                        "stash_id": sid,
                        "source": source.lower(),
                    })
        except Exception as e:
            logger.error(f"Error querying StashDB/FansDB scene credits: {e}")

        return mapped_items, total_items
