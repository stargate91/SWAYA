import logging
import math
from typing import Optional, Any
from sqlalchemy.orm import Session

from app.core.enums import Provider
from app.modules.people.models import Person, MediaPersonLink


from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.people.services.filmography.strategies.base_strategy import BaseFilmographyStrategy

logger = logging.getLogger(__name__)

class RemoteCreditsFetcher:
    def __init__(self, db: Session, resolver: Optional[Any] = None, image_service: Any = None, scrapers: Optional[Any] = None):
        self.db = db
        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            resolver = MediaItemService(db)
        self.resolver = resolver
        self.image_service = image_service
        self.scrapers = scrapers

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def fetch_remote_known_for(self, person_id: int, source: str, ext_id: str) -> list[dict[str, Any]]:
        db = self.db
        
        # Check Cache
        from app.modules.people.models import RemoteFilmographyCache
        cache_entry = db.query(RemoteFilmographyCache).filter(
            RemoteFilmographyCache.person_id == person_id,
            RemoteFilmographyCache.provider == source.lower(),
            RemoteFilmographyCache.media_type == "known_for"
        ).first()

        mapped_items = []
        if cache_entry and cache_entry.data is not None:
            mapped_items = cache_entry.data.get("items") or []
        else:
            # Query remote source using sort: POPULARITY
            try:
                from app.core.enums import Provider
                prov_enum = Provider(source.lower())
                scraper = self.scrapers.adult(prov_enum, db)
                query = """
                query QueryScenes($input: SceneQueryInput!) {
                  queryScenes(input: $input) {
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
                        width
                        height
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
                        "per_page": 10,
                        "direction": "DESC",
                        "sort": "POPULARITY"
                    }
                }
                res_data = scraper.execute_query(query, variables)
                if res_data and "queryScenes" in res_data:
                    raw_scenes = res_data["queryScenes"].get("scenes") or []
                    for s in raw_scenes:
                        sid = s.get("id")
                        title = s.get("title") or "Unknown"
                        date_str = s.get("date")
                        year = None
                        if date_str:
                            try:
                                year = int(date_str.split("-")[0])
                            except Exception:
                                pass
                        studio_name = s.get("studio", {}).get("name") if s.get("studio") else None
                        poster_url = s["images"][0].get("url") if s.get("images") else None
                        img_width = s["images"][0].get("width") if s.get("images") else None
                        img_height = s["images"][0].get("height") if s.get("images") else None
                        
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
                            "image_width": img_width,
                            "image_height": img_height,
                            "in_library": False,
                            "stash_id": sid,
                            "source": source.lower(),
                        })

                    # Save to Cache
                    if mapped_items:
                        if not cache_entry:
                            cache_entry = RemoteFilmographyCache(
                                person_id=person_id,
                                provider=source.lower(),
                                media_type="known_for",
                                data={"items": mapped_items}
                            )
                            db.add(cache_entry)
                        else:
                            cache_entry.data = {"items": mapped_items}
                        try:
                            db.commit()
                        except Exception as e:
                            db.rollback()
                            logger.error(f"Error saving remote known_for cache: {e}")
            except Exception as e:
                logger.error(f"Error fetching remote known_for: {e}")

        if not mapped_items:
            return []

        # Check local matches to set in_library and library_item_id
        try:
            from app.modules.people.models import MediaPersonLink
            active_match_ids = self.resolver.get_active_match_ids(media_type="scene", provider=source.lower())
            links = db.query(MediaPersonLink).filter(
                MediaPersonLink.person_id == person_id,
                MediaPersonLink.match_id.in_(active_match_ids)
            ).all()
            
            local_by_ext_id = {}
            for link in links:
                match = link.match
                if match and match.media_item:
                    ext_id_key = str(match.external_id).lower().strip()
                    local_by_ext_id[ext_id_key] = match.media_item.id

            for item in mapped_items:
                ext_id_key = str(item["id"]).lower().strip()
                if ext_id_key in local_by_ext_id:
                    item["in_library"] = True
                    item["library_item_id"] = local_by_ext_id[ext_id_key]
                    item["id"] = local_by_ext_id[ext_id_key]
                else:
                    item["in_library"] = False
                    item["library_item_id"] = None
        except Exception as e:
            logger.error(f"Error checking local matches for known_for: {e}")

        return mapped_items

    def fetch_remote_credits(
        self,
        person_id: int,
        source: str,
        media_type: str, # "scene" or "movie"
        page: int,
        page_size: int
    ) -> Optional[dict]:
        
        db = self.db
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            return None
            
        from app.modules.scrapers.support.registry import ProviderRegistry
        prov_enum = ProviderRegistry.resolve_prefix(source)
        ext_ids = person.external_ids or {}
        ext_id = None
        if prov_enum:
            cfg = ProviderRegistry.get_config(prov_enum)
            if cfg:
                keys_to_try = [cfg.prefix] + cfg.aliases
                for k in keys_to_try:
                    ext_id = ext_ids.get(k) or ext_ids.get(f"{k}_id")
                    if ext_id:
                        break

        if not ext_id and prov_enum:
            try:
                link = next((x for x in person.external_links if x.provider == prov_enum), None)
                if link:
                    ext_id = link.external_id
            except Exception as e:
                logger.debug(f"Swallowed exception in app/modules/people/services/filmography/remote_fetcher.py:50: {e}", exc_info=True)
                
        if not ext_id:
            return None
            
        # Check Cache
        from app.modules.people.models import RemoteFilmographyCache
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
                        except Exception:
                            db.rollback()
                    logger.error(f"Error saving remote filmography cache: {e}")

        local_items = []
        try:
            prov_enum = Provider(source.lower())
            active_match_ids = self.resolver.get_active_match_ids(media_type=media_type, provider=source.lower())
            from app.core.language import LanguageService
            
            links = db.query(MediaPersonLink).filter(
                MediaPersonLink.person_id == person_id,
                MediaPersonLink.match_id.in_(active_match_ids)
            ).all()
            
            from app.core.language import get_user_ui_language
            from app.modules.settings.services.settings_service import SettingsService
            settings = SettingsService(db)
            ui_lang = get_user_ui_language(settings)
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
        strategy = BaseFilmographyStrategy.get_strategy(source, self.scrapers, self.db)
        return strategy.query_remote(media_type, ext_id, source)
