import logging
import math
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.shared_kernel.enums import Provider, MediaType
from app.domains.people.models import Person, MediaPersonLink
from app.shared_kernel.ports.library_port import LibraryPort
from app.shared_kernel.ports.image_service_port import ImageServicePort
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.language import LanguageService

logger = logging.getLogger(__name__)

class RemoteCreditsFetcher:
    def __init__(self, db: Session, library_port: LibraryPort, image_service: ImageServicePort):
        self.db = db
        self.library_port = library_port
        self.image_service = image_service

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def fetch_remote_credits(
        self,
        person_id: int,
        source: str,
        media_type: str, # "scene" or "movie"
        page: int,
        page_size: int
    ) -> Optional[dict]:
        from app.infrastructure.scrapers.support.gateway import scraper_gateway
        
        db = self.db
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            return None
            
        ext_ids = person.external_ids or {}
        ext_id = ext_ids.get(source.lower()) or ext_ids.get(f"{source.lower()}_id")
        if not ext_id and source.lower() == "porndb":
            ext_id = ext_ids.get("theporndb") or ext_ids.get("theporndb_id")
            
        if not ext_id:
            try:
                prov_enum = Provider(source.lower())
                link = next((l for l in person.external_links if l.provider == prov_enum), None)
                if link:
                    ext_id = link.external_id
            except ValueError as e:
                logger.debug(f"Swallowed exception in domains/people/services/filmography/remote_fetcher.py:50: {e}", exc_info=True)
                
        if not ext_id:
            return None
            
        # Check Cache
        from app.domains.people.models import RemoteFilmographyCache
        cache_entry = db.query(RemoteFilmographyCache).filter(
            RemoteFilmographyCache.person_id == person_id,
            RemoteFilmographyCache.provider == source.lower(),
            RemoteFilmographyCache.media_type == media_type
        ).first()

        cache_hit = False
        if cache_entry and cache_entry.data is not None:
            mapped_items = cache_entry.data.get("items") or []
            if not mapped_items or all("release_date" in item for item in mapped_items):
                total_items = cache_entry.data.get("total_items") or len(mapped_items)
                cache_hit = True
        
        if not cache_hit:
            mapped_items, total_items = self._query_remote_source(source, media_type, ext_id)
            
            # Save to Cache
            if mapped_items:
                clean_items = []
                for item in mapped_items:
                    clean_item = dict(item)
                    clean_item.pop("in_library", None)
                    clean_item.pop("library_item_id", None)
                    clean_items.append(clean_item)

                # Double check under concurrency before creating a new entry
                if not cache_entry:
                    cache_entry = db.query(RemoteFilmographyCache).filter(
                        RemoteFilmographyCache.person_id == person_id,
                        RemoteFilmographyCache.provider == source.lower(),
                        RemoteFilmographyCache.media_type == media_type
                    ).first()

                if not cache_entry:
                    cache_entry = RemoteFilmographyCache(
                        person_id=person_id,
                        provider=source.lower(),
                        media_type=media_type,
                        data={"items": clean_items, "total_items": total_items}
                    )
                    db.add(cache_entry)
                else:
                    cache_entry.data = {"items": clean_items, "total_items": total_items}
                
                try:
                    db.commit()
                except Exception as e:
                    db.rollback()
                    if "UNIQUE constraint failed" in str(e):
                        try:
                            existing = db.query(RemoteFilmographyCache).filter(
                                RemoteFilmographyCache.person_id == person_id,
                                RemoteFilmographyCache.provider == source.lower(),
                                RemoteFilmographyCache.media_type == media_type
                            ).first()
                            if existing:
                                existing.data = {"items": clean_items, "total_items": total_items}
                                db.commit()
                                return
                        except Exception as inner_e:
                            db.rollback()
                    logger.error(f"Error saving remote filmography cache: {e}")

        local_items = []
        try:
            prov_enum = Provider(source.lower())
            active_match_ids = self.library_port.get_active_match_ids(media_type=media_type, provider=source.lower())
            from app.shared_kernel.language import LanguageService
            
            links = db.query(MediaPersonLink).filter(
                MediaPersonLink.person_id == person_id,
                MediaPersonLink.match_id.in_(active_match_ids)
            ).all()
            
            ui_lang = DEFAULT_FALLBACK_LANGUAGE
            for link in links:
                match = link.match
                item = match.media_item
                match_loc = LanguageService.get_best_localization(match.localizations, ui_lang)
                title = match_loc.title if match_loc else item.filename
                
                local_items.append({
                    "id": item.id,
                    "title": title,
                    "type": media_type,
                    "media_type": media_type,
                    "year": match.release_date.year if match.release_date else None,
                    "release_date": match.release_date.isoformat() if match.release_date else None,
                    "poster_path": self._resolve_img(match_loc.poster_path if match_loc else None, "posters"),
                    "backdrop_path": self._resolve_img(match.backdrop_path, "backdrops", size="original"),
                    "rating": match.rating_tmdb or 0.0,
                    "rating_porndb": match.rating_porndb,
                    "job": link.role.value if hasattr(link.role, "value") else str(link.role),
                    "character": link.character_name,
                    "in_library": True,
                    "library_item_id": item.id,
                    "stash_id": match.external_id if (match.provider and match.provider.value == source.lower()) else None,
                    "source": source.lower(),
                })
        except Exception as e:
            logger.error(f"Error querying local items in _fetch_remote_credits: {e}")

        local_by_ext_id = {str(li["stash_id"]).lower().strip(): li for li in local_items if li.get("stash_id")}
        combined_items = []
        
        for item in mapped_items:
            ext_id_key = str(item["id"]).lower().strip()
            if ext_id_key in local_by_ext_id:
                local_item = local_by_ext_id[ext_id_key]
                item.update({
                    "in_library": True,
                    "library_item_id": local_item["id"],
                })
                local_item["_merged"] = True
            else:
                item.update({
                    "in_library": False,
                    "library_item_id": None,
                })
            combined_items.append(item)
            
        for li in local_items:
            if not li.get("_merged"):
                combined_items.append(li)
                
        combined_items.sort(
            key=lambda x: (
                -(x.get("year") or 0),
                x.get("title") or ""
            )
        )
        
        total_items = max(total_items, len(combined_items))
        total_pages = max(1, math.ceil(total_items / page_size))
        start_idx = (page - 1) * page_size
        sliced = combined_items[start_idx : start_idx + page_size]
        
        return {
            "items": sliced,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }

    def _query_remote_source(self, source: str, media_type: str, ext_id: str) -> tuple[list, int]:
        from app.infrastructure.scrapers.support.gateway import scraper_gateway
        db = self.db
        mapped_items = []
        total_items = 0
        remote_per_page = 5000

        if source.lower() in ("stashdb", "fansdb"):
            if media_type != "scene":
                return [], 0
                
            try:
                prov_enum = Provider(source.lower())
                scraper = scraper_gateway.adult(prov_enum, db)
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
                                logger.debug(f"Swallowed exception in domains/people/services/filmography/remote_fetcher.py:257: {e}", exc_info=True)
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
                
        elif source.lower() == "porndb":
            try:
                scraper = scraper_gateway.adult(Provider.PORNDB, db)
                api_token = scraper.get_setting("porndb_api_key") or scraper.get_setting("porndb_api_token")
                if api_token:
                    import requests
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
                                import concurrent.futures
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
                                    logger.debug(f"Swallowed exception in domains/people/services/filmography/remote_fetcher.py:324: {e}", exc_info=True)
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
                                import concurrent.futures
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
                                    logger.debug(f"Swallowed exception in domains/people/services/filmography/remote_fetcher.py:387: {e}", exc_info=True)
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
