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
                endpoint_type = "movies" if media_type == "movie" else "scenes"
                url = f"https://api.theporndb.net/performers/{ext_id}/{endpoint_type}?page=1&per_page=100"
                resp = requests.get(url, headers=headers, timeout=40)
                
                if resp.status_code == 200:
                    resp_json = resp.json()
                    page_1_data = resp_json.get("data") or []
                    meta = resp_json.get("meta") or {}
                    last_page = meta.get("last_page") or 1
                    total_items = meta.get("total") or len(page_1_data)
                    
                    max_pages = 20 if media_type == "movie" else 30
                    last_page = min(last_page, max_pages)

                    # Map page 1 items
                    for x in page_1_data:
                        xid = x.get("id")
                        title = x.get("title") or "Unknown"
                        date_str = x.get("date")
                        year = None
                        if date_str:
                            try:
                                year = int(date_str.split("-")[0])
                            except Exception:
                                pass
                        studio_name = x.get("site", {}).get("name") if x.get("site") else None
                        poster_val = x.get("poster")
                        if isinstance(poster_val, dict):
                            poster_url = poster_val.get("large") or poster_val.get("medium") or poster_val.get("small") or poster_val.get("full")
                        else:
                            poster_url = poster_val
                        
                        if media_type == "movie":
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
                        else:
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

                    # If there are more pages, spawn a background thread to fetch them and update the cache
                    if last_page > 1:
                        from app.domains.people.models import ExternalSourceLink
                        link = self.db.query(ExternalSourceLink).filter(
                            ExternalSourceLink.provider == Provider.PORNDB,
                            ExternalSourceLink.external_id == ext_id
                        ).first()
                        person_id = link.person_id if link else None
                        
                        if person_id:
                            import threading
                            bg_thread = threading.Thread(
                                target=self._fetch_remaining_pages_bg,
                                args=(person_id, ext_id, media_type, source, headers, last_page, mapped_items, total_items),
                                daemon=True
                            )
                            bg_thread.start()
        except Exception as e:
            logger.error(f"Error querying PornDB REST API for performer {ext_id}: {e}", exc_info=True)

        return mapped_items, total_items

    def _fetch_remaining_pages_bg(self, person_id: int, ext_id: str, media_type: str, source: str, headers: dict, last_page: int, page_1_items: list, total_items: int):
        from app.shared_kernel.database import SessionLocal
        from app.domains.people.models import RemoteFilmographyCache
        
        endpoint_type = "movies" if media_type == "movie" else "scenes"
        data_list = []
        
        def fetch_page(page):
            try:
                page_url = f"https://api.theporndb.net/performers/{ext_id}/{endpoint_type}?page={page}&per_page=100"
                page_resp = requests.get(page_url, headers=headers, timeout=25)
                if page_resp.status_code == 200:
                    return page_resp.json().get("data") or []
            except Exception as ex:
                logger.error(f"Error fetching PornDB page {page} in background: {ex}")
            return []
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_page, p) for p in range(2, last_page + 1)]
            for fut in concurrent.futures.as_completed(futures):
                data_list.extend(fut.result())
                
        mapped_rest = []
        for x in data_list:
            xid = x.get("id")
            title = x.get("title") or "Unknown"
            date_str = x.get("date")
            year = None
            if date_str:
                try:
                    year = int(date_str.split("-")[0])
                except Exception:
                    pass
            studio_name = x.get("site", {}).get("name") if x.get("site") else None
            poster_val = x.get("poster")
            if isinstance(poster_val, dict):
                poster_url = poster_val.get("large") or poster_val.get("medium") or poster_val.get("small") or poster_val.get("full")
            else:
                poster_url = poster_val
            
            if media_type == "movie":
                rating = x.get("rating")
                mapped_rest.append({
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
            else:
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
                
                mapped_rest.append({
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

        db_session = SessionLocal()
        try:
            clean_page_1 = []
            for item in page_1_items:
                clean_item = dict(item)
                clean_item.pop("in_library", None)
                clean_item.pop("library_item_id", None)
                clean_page_1.append(clean_item)
                
            all_clean_items = clean_page_1 + mapped_rest
            all_clean_items.sort(
                key=lambda x: (
                    -(x.get("year") or 0),
                    x.get("title") or ""
                )
            )
            
            cache_entry = db_session.query(RemoteFilmographyCache).filter(
                RemoteFilmographyCache.person_id == person_id,
                RemoteFilmographyCache.provider == source.lower(),
                RemoteFilmographyCache.media_type == media_type
            ).first()
            
            if not cache_entry:
                cache_entry = RemoteFilmographyCache(
                    person_id=person_id,
                    provider=source.lower(),
                    media_type=media_type,
                    data={"items": all_clean_items, "total_items": total_items}
                )
                db_session.add(cache_entry)
            else:
                cache_entry.data = {"items": all_clean_items, "total_items": total_items}
                
            db_session.commit()
            logger.info(f"Background fetch completed: {len(all_clean_items)} PornDB {media_type} items cached.")
        except Exception as e:
            db_session.rollback()
            logger.error(f"Error updating cache in background: {e}", exc_info=True)
        finally:
            db_session.close()

