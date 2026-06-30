import logging
import requests
import concurrent.futures
from typing import List, Tuple, Dict, Any
from app.domains.people.services.filmography.strategies.base_strategy import BaseFilmographyStrategy
from app.shared_kernel.enums import Provider

logger = logging.getLogger(__name__)

class PornDbFilmographyStrategy(BaseFilmographyStrategy):
    def query_remote(self, media_type: str, ext_id: str, source: str) -> Tuple[List[Dict[str, Any]], int]:
        mapped_items = []
        total_items = 0

        try:
            scraper = self.scrapers.adult(Provider.PORNDB, self.db)
            api_token = scraper.get_setting("porndb_api_key") or scraper.get_setting("porndb_api_token")
            if api_token:
                headers = {"Authorization": f"Bearer {api_token}", "Accept": "application/json"}
                
                if media_type == "movie":
                    url = f"https://api.theporndb.net/performers/{ext_id}/movies?page=1&per_page=100"
                    resp = requests.get(url, headers=headers, timeout=10)
                    data_list = []
                    if resp.status_code == 200:
                        resp_json = resp.json()
                        data_list.extend(resp_json.get("data") or [])
                        meta = resp_json.get("meta") or {}
                        last_page = meta.get("last_page") or 1
                        last_page = min(last_page, 20) # Max 2000 movies
                        
                        if last_page > 1:
                            def fetch_page(page):
                                try:
                                    page_url = f"https://api.theporndb.net/performers/{ext_id}/movies?page={page}&per_page=100"
                                    page_resp = requests.get(page_url, headers=headers, timeout=10)
                                    if page_resp.status_code == 200:
                                        return page_resp.json().get("data") or []
                                except Exception as ex:
                                    logger.error(f"Error fetching PornDB movie page {page}: {ex}")
                                return []
                                
                            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                                futures = [executor.submit(fetch_page, p) for p in range(2, last_page + 1)]
                                for fut in concurrent.futures.as_completed(futures):
                                    data_list.extend(fut.result())

                    total_items = len(data_list)
                    for x in data_list:
                        xid = x.get("id")
                        title = x.get("title") or "Unknown"
                        date_str = x.get("date")
                        year = None
                        if date_str:
                            try:
                                year = int(date_str.split("-")[0])
                            except Exception as e:
                                logger.debug(f"Swallowed exception: {e}", exc_info=True)
                        studio_name = x.get("site", {}).get("name") if x.get("site") else None
                        poster_val = x.get("poster")
                        if isinstance(poster_val, dict):
                            poster_url = poster_val.get("large") or poster_val.get("medium") or poster_val.get("small") or poster_val.get("full")
                        else:
                            poster_url = poster_val
                        rating = x.get("rating")
                        
                        mapped_items.append({
                            "id": xid,
                            "title": title,
                            "type": "movie",
                            "media_type": "movie",
                            "year": year,
                            "release_date": date_str,
                            "studio": studio_name,
                            "poster_path": poster_url,
                            "rating": 0.0,
                            "rating_porndb": rating,
                            "in_library": False,
                            "stash_id": xid,
                            "source": "porndb",
                        })
                        
                elif media_type == "scene":
                    url = f"https://api.theporndb.net/performers/{ext_id}/scenes?page=1&per_page=100"
                    resp = requests.get(url, headers=headers, timeout=10)
                    data_list = []
                    if resp.status_code == 200:
                        resp_json = resp.json()
                        data_list.extend(resp_json.get("data") or [])
                        meta = resp_json.get("meta") or {}
                        last_page = meta.get("last_page") or 1
                        last_page = min(last_page, 30) # Max 3000 scenes
                        
                        if last_page > 1:
                            def fetch_page(page):
                                try:
                                    page_url = f"https://api.theporndb.net/performers/{ext_id}/scenes?page={page}&per_page=100"
                                    page_resp = requests.get(page_url, headers=headers, timeout=10)
                                    if page_resp.status_code == 200:
                                        return page_resp.json().get("data") or []
                                except Exception as ex:
                                    logger.error(f"Error fetching PornDB scene page {page}: {ex}")
                                return []
                                
                            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                                futures = [executor.submit(fetch_page, p) for p in range(2, last_page + 1)]
                                for fut in concurrent.futures.as_completed(futures):
                                    data_list.extend(fut.result())

                    total_items = len(data_list)
                    for x in data_list:
                        xid = x.get("id")
                        title = x.get("title") or "Unknown"
                        date_str = x.get("date")
                        year = None
                        if date_str:
                            try:
                                year = int(date_str.split("-")[0])
                            except Exception as e:
                                logger.debug(f"Swallowed exception: {e}", exc_info=True)
                        studio_name = x.get("site", {}).get("name") if x.get("site") else None
                        poster_val = x.get("poster")
                        if isinstance(poster_val, dict):
                            poster_url = poster_val.get("large") or poster_val.get("medium") or poster_val.get("small") or poster_val.get("full")
                        else:
                            poster_url = poster_val

                        images_list = x.get("images") or []
                        backdrop_url = None
                        if isinstance(images_list, list) and images_list:
                            first_img = images_list[0]
                            if isinstance(first_img, dict):
                                backdrop_url = first_img.get("url")
                            elif isinstance(first_img, str):
                                backdrop_url = first_img

                        if not backdrop_url:
                            backdrop_val = x.get("background") or x.get("image")
                            if isinstance(backdrop_val, dict):
                                backdrop_url = backdrop_val.get("full") or backdrop_val.get("large") or backdrop_val.get("medium") or backdrop_val.get("small")
                            else:
                                backdrop_url = backdrop_val or poster_url
                        rating = x.get("rating")
                        
                        mapped_items.append({
                            "id": xid,
                            "title": title,
                            "type": "scene",
                            "media_type": "scene",
                            "year": year,
                            "release_date": date_str,
                            "studio": studio_name,
                            "poster_path": poster_url,
                            "backdrop_path": backdrop_url,
                            "rating": 0.0,
                            "rating_porndb": rating,
                            "in_library": False,
                            "stash_id": xid,
                            "source": "porndb",
                        })
        except Exception as e:
            logger.error(f"Error querying PornDB REST API for performer {ext_id}: {e}")

        return mapped_items, total_items
