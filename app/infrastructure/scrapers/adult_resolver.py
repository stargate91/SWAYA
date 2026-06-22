import logging
import difflib
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.enums import Provider, MediaType, ItemStatus, ScanMode
from app.infrastructure.scrapers.resolver import normalize_title, normalize_title_words

logger = logging.getLogger(__name__)

from app.shared_kernel.constants import PORNDB_API_BASE, SCRAPER_REQUEST_TIMEOUT

class AdultResolver:
    """
    Handles resolving adult scene items against StashDB, PornDB, and FansDB APIs.
    """

    def __init__(self, db_session: Session):
        self.db = db_session

    def _extract_jav_search_queries(self, item: MediaItem) -> list[str]:
        import re

        parsed = item.parsed_info or {}
        fn_data = parsed.get("fn") or {}
        it_data = parsed.get("it") or {}
        fd_data = parsed.get("fd") or {}

        raw_values = [
            item.filename,
            item.folder_name,
            item.relative_path,
            item.current_path,
            fn_data.get("title"),
            fd_data.get("title"),
            it_data.get("title"),
        ]

        queries = []
        seen = set()

        def add_query(value: Optional[str]):
            text = normalize_title_words(str(value or "")).strip()
            if not text or text in seen:
                return
            seen.add(text)
            queries.append(text)

        for value in raw_values:
            raw_text = str(value or "")
            for prefix, number in re.findall(r'(?i)\b([a-z0-9]{2,10})[-._ ]?([0-9]{2,5})\b', raw_text):
                code = f"{prefix.upper()}-{number}"
                if code not in seen:
                    seen.add(code)
                    queries.append(code)

        for value in raw_values:
            if not value:
                continue
            cleaned = re.sub(r'(?i)\b(uncensored|censored|xxx|jav|japanese|web[ -]?rip|webrip|bluray|bdrip|dvdrip|x264|x265|hevc|aac|mp3|h264|h265|1080p|720p|2160p|480p|tbp|narcos|sample)\b', ' ', str(value))
            cleaned = cleaned.replace('.', ' ').replace('_', ' ').replace('-', ' ')
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            add_query(cleaned)

        return queries[:8]

    def resolve_adult_item(self, item: MediaItem, mode: ScanMode = ScanMode.SCENES, task_id: Optional[int] = None):
        """Resolves adult scene/JAV items using MD5 fingerprinting, OSHash, or text search fallbacks."""
        from app.infrastructure.scrapers.stashdb import StashDBScraper
        from app.infrastructure.scrapers.porndb import PornDBScraper
        from app.infrastructure.scrapers.fansdb import FansDBScraper
        stash_scraper = StashDBScraper(self.db)
        porndb_scraper = PornDBScraper(self.db)
        fans_scraper = FansDBScraper(self.db)

        target_media_type = MediaType.JAV if mode.is_jav else MediaType.SCENE
        scrapers_to_try = []
        logger.info("[adult:%s] Resolving %s | file=%s | md5=%s | oshash=%s", mode.value, item.id, item.filename, (item.hash_md5 or "")[:12], (item.hash_oshash or "")[:12])
        if mode.is_jav:
            if porndb_scraper.get_setting("porndb_api_key") or porndb_scraper.get_setting("porndb_api_token"):
                scrapers_to_try.append((porndb_scraper, Provider.PORNDB))
        else:
            order_setting = stash_scraper.get_setting("scenes_scraper_order") or "stashdb,porndb,fansdb"
            order = [o.strip().lower() for o in str(order_setting).split(",")]
            
            available = {}
            if stash_scraper.get_setting("stashdb_api_key"):
                available["stashdb"] = (stash_scraper, Provider.STASHDB)
            if porndb_scraper.get_setting("porndb_api_key") or porndb_scraper.get_setting("porndb_api_token"):
                available["porndb"] = (porndb_scraper, Provider.PORNDB)
            if fans_scraper.get_setting("fansdb_api_key"):
                available["fansdb"] = (fans_scraper, Provider.FANSDB)
                
            for prov_name in order:
                if prov_name in available:
                    scrapers_to_try.append(available[prov_name])

        logger.info("[adult:%s] Providers to try: %s", mode.value, [provider.value for _scraper, provider in scrapers_to_try])

        if not scrapers_to_try:
            logger.warning("No adult metadata provider API key configured.")
            logger.info("[adult:%s] No match for %s after all providers", mode.value, item.filename)
            item.status = ItemStatus.NO_MATCH
            self.db.flush()
            return

        for scraper, provider in scrapers_to_try:
            scene_data = None

            # 1. Try Hash Lookup
            if provider in (Provider.STASHDB, Provider.FANSDB):
                hash_query = """
                query FindSceneByHash($hash: String!) {
                  queryScenes(input: { fingerprints: { value: [$hash], modifier: EQUALS }, page: 1, per_page: 1 }) {
                    scenes {
                      id
                      title
                      details
                      date
                      tags {
                        name
                      }
                      studio {
                        id
                        name
                        images {
                          url
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
                          measurements {
                            band_size
                            cup_size
                            waist
                            hip
                          }
                        }
                      }
                      images {
                        url
                      }
                    }
                  }
                }
                """
                # Try MD5 first
                if item.hash_md5:
                    logger.info("[adult:%s] Trying %s MD5 lookup for %s", mode.value, provider.value, item.filename)
                    cache_key_md5 = f"{provider.value}/hash/v3/md5/{item.hash_md5}"
                    cached = scraper.cache.get(provider, cache_key_md5)
                    if cached is not None:
                        if cached:  # Not empty negative cache
                            scene_data = cached
                    else:
                        try:
                            res = scraper.execute_query(hash_query, {"hash": item.hash_md5})
                            if res and res.get("queryScenes", {}).get("scenes"):
                                scene_data = res["queryScenes"]["scenes"][0]
                                scraper.cache.set(provider, cache_key_md5, scene_data)
                            else:
                                scraper.cache.set(provider, cache_key_md5, {})
                        except Exception as e:
                            logger.error(f"{provider.value} MD5 hash query failed: {e}")

                # Try OSHash fallback
                if not scene_data and item.hash_oshash:
                    logger.info("[adult:%s] Trying %s OSHASH lookup for %s", mode.value, provider.value, item.filename)
                    cache_key_osh = f"{provider.value}/hash/v3/oshash/{item.hash_oshash}"
                    cached = scraper.cache.get(provider, cache_key_osh)
                    if cached is not None:
                        if cached:
                            scene_data = cached
                    else:
                        try:
                            res = scraper.execute_query(hash_query, {"hash": item.hash_oshash})
                            if res and res.get("queryScenes", {}).get("scenes"):
                                scene_data = res["queryScenes"]["scenes"][0]
                                scraper.cache.set(provider, cache_key_osh, scene_data)
                            else:
                                scraper.cache.set(provider, cache_key_osh, {})
                        except Exception as e:
                            logger.error(f"{provider.value} OSHash query failed: {e}")

            elif provider == Provider.PORNDB and item.hash_oshash:
                logger.info("[adult:%s] Trying PornDB %s hash lookup with OSHASH for %s", mode.value, "jav" if mode.is_jav else "scene", item.filename)
                # Use REST API hash lookup with caching for the selected adult mode
                cache_key_pornhash = f"porndb/{mode.value}/hash/oshash/{item.hash_oshash}"
                cached = scraper.cache.get(provider, cache_key_pornhash)
                if cached is not None:
                    if cached:
                        scene_data = cached
                else:
                    api_token = scraper.get_setting("porndb_api_key") or scraper.get_setting("porndb_api_token")
                    headers = {
                        "Authorization": f"Bearer {api_token}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                    
                    endpoint = "jav" if mode.is_jav else "scenes"
                    for ep in [endpoint]:
                        url = f"{PORNDB_API_BASE}/{ep}/hash/{item.hash_oshash}?type=OSHASH"
                        try:
                            resp = scraper.session.get(url, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
                            logger.info("[adult:%s] PornDB GET %s -> status %s", mode.value, url, resp.status_code)
                            if resp.status_code == 200:
                                res_json = resp.json()
                                if res_json and res_json.get("data"):
                                    scene_data = res_json["data"]
                                    scraper.cache.set(provider, cache_key_pornhash, scene_data)
                                    break
                        except Exception as e:
                            logger.error(f"PornDB OSHash query failed for {ep}: {e}")
                    
                    if not scene_data:
                        scraper.cache.set(provider, cache_key_pornhash, {})

            if scene_data:
                logger.info("[adult:%s] Hash lookup matched %s -> provider=%s external_id=%s title=%s", mode.value, item.filename, provider.value, scene_data.get("id"), scene_data.get("title"))
                # Save hash match
                self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).delete()
                self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider == provider,
                    MetadataMatch.external_id == str(scene_data["id"]),
                    MetadataMatch.media_type == target_media_type
                ).delete()

                from app.infrastructure.scrapers.persistence import ScraperPersister
                from app.infrastructure.scrapers.normalizer import ScraperNormalizer
                if provider == Provider.PORNDB:
                    scene_data = scraper.enrich_scene_ratings(scene_data)
                normalized = ScraperNormalizer.normalize_adult_scene(provider.value, scene_data)
                persister = ScraperPersister(self.db)
                match = persister.persist_normalized_scene(provider, str(scene_data["id"]), normalized, media_type=target_media_type)
                match.media_item_id = item.id
                item.status = ItemStatus.MATCHED
                
                # Log successful hash match
                scraper.log_search(
                    task_id=task_id,
                    media_item_id=item.id,
                    search_query=f"hash: md5={item.hash_md5}, oshash={item.hash_oshash}",
                    result_count=1,
                    details={
                        "hash_match": True,
                        "matched_scene_id": str(scene_data["id"]),
                        "matched_title": scene_data.get("title"),
                        "final_status": "matched"
                    }
                )
                self.db.flush()
                return

            # 2. Try Text Search Fallback
            if mode.is_jav:
                search_queries = self._extract_jav_search_queries(item)
                logger.info("[adult:%s] JAV fallback queries for %s -> %s", mode.value, item.filename, search_queries)
            else:
                parsed = item.parsed_info or {}
                fn_data = parsed.get("fn") or {}
                it_data = parsed.get("it") or {}
                fd_data = parsed.get("fd") or {}
                search_title = fn_data.get("title") or fd_data.get("title") or it_data.get("title")
                search_queries = [search_title] if search_title else []

            if not search_queries:
                logger.info("[adult:%s] No fallback search title for %s", mode.value, item.filename)
                continue

            best_score = 0.0
            best_scene = None
            best_query = None
            best_scenes = []

            for search_title in search_queries:
                logger.info("[adult:%s] Fallback search title for %s -> %s", mode.value, item.filename, search_title)

                cache_key_search = f"{provider.value}/{mode.value}/search/v3/{search_title.strip().lower()}"
                cached_search = scraper.cache.get(provider, cache_key_search)
                if cached_search is not None:
                    scenes = cached_search
                else:
                    if provider == Provider.PORNDB and mode.is_jav:
                        scenes = scraper.search_jav(search_title, per_page=10)
                        scraper.cache.set(provider, cache_key_search, scenes)
                    else:
                        search_query = """
                query SearchScenes($q: String!) {
                  searchScene(term: $q) {
                    id
                    title
                    details
                    date
                    tags {
                      name
                    }
                    studio {
                      id
                      name
                      images {
                        url
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
                        measurements {
                          band_size
                          cup_size
                          waist
                          hip
                        }
                      }
                    }
                    images {
                      url
                    }
                  }
                }
                """
                        try:
                            res = scraper.execute_query(search_query, {"q": search_title})
                            scenes = res.get("searchScene", []) if res else []
                            if scenes is None:
                                scenes = []
                            scraper.cache.set(provider, cache_key_search, scenes)
                        except Exception as e:
                            logger.error(f"Text query failed for provider {provider.value}: {e}")
                            scenes = []

                if not scenes:
                    logger.info("[adult:%s] No search results from %s for %s", mode.value, provider.value, search_title)
                    continue

                logger.info("[adult:%s] %s returned %s candidates for %s", mode.value, provider.value, len(scenes), search_title)

                candidates = []
                for scene in scenes:
                    title = scene.get("title") or ""
                    if mode.is_jav:
                        ext_id = scene.get("external_id") or ""
                        if normalize_title(search_title) == normalize_title(ext_id):
                            score = 1.0
                        elif normalize_title(search_title) in normalize_title(title):
                            score = 0.95
                        else:
                            score = difflib.SequenceMatcher(
                                None, normalize_title(search_title), normalize_title(title)
                            ).ratio()
                    else:
                        score = difflib.SequenceMatcher(
                            None, normalize_title(search_title), normalize_title(title)
                        ).ratio()
                    candidates.append((score, scene))

                candidates.sort(key=lambda x: x[0], reverse=True)
                if candidates and candidates[0][0] > best_score:
                    best_score, best_scene = candidates[0]
                    best_query = search_title
                    best_scenes = scenes

            if best_scene:
                logger.info("[adult:%s] Best candidate for %s via %s -> score=%.3f query=%s id=%s title=%s", mode.value, item.filename, provider.value, best_score, best_query, best_scene.get("id"), best_scene.get("title"))
                if best_score >= 0.8:
                    self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).delete()
                    self.db.query(MetadataMatch).filter(
                        MetadataMatch.provider == provider,
                        MetadataMatch.external_id == str(best_scene["id"]),
                        MetadataMatch.media_type == target_media_type
                    ).delete()

                    from app.infrastructure.scrapers.persistence import ScraperPersister
                    from app.infrastructure.scrapers.normalizer import ScraperNormalizer
                    if provider == Provider.PORNDB:
                        best_scene = scraper.enrich_scene_ratings(best_scene)
                    normalized = ScraperNormalizer.normalize_adult_scene(provider.value, best_scene)
                    persister = ScraperPersister(self.db)
                    match = persister.persist_normalized_scene(provider, str(best_scene["id"]), normalized, media_type=target_media_type)
                    match.media_item_id = item.id
                    item.status = ItemStatus.MATCHED
                    
                    # Log successful text match
                    scraper.log_search(
                        task_id=task_id,
                        media_item_id=item.id,
                        search_query=best_query,
                        result_count=len(best_scenes),
                        details={
                            "hash_match": False,
                            "candidates": [
                                {
                                    "id": s.get("id"),
                                    "title": s.get("title"),
                                    "score": difflib.SequenceMatcher(None, normalize_title(best_query or search_title), normalize_title(s.get("title") or "")).ratio()
                                }
                                for s in best_scenes[:10]
                            ],
                            "best_score": best_score,
                            "matched_scene_id": str(best_scene["id"]),
                            "final_status": "matched"
                        }
                    )
                    self.db.flush()
                    return
                else:
                    # Log failed text match due to low score
                    scraper.log_search(
                        task_id=task_id,
                        media_item_id=item.id,
                        search_query=best_query,
                        result_count=len(best_scenes),
                        details={
                            "hash_match": False,
                            "candidates": [
                                {
                                    "id": s.get("id"),
                                    "title": s.get("title"),
                                    "score": difflib.SequenceMatcher(None, normalize_title(best_query or search_title), normalize_title(s.get("title") or "")).ratio()
                                }
                                for s in best_scenes[:10]
                            ],
                            "best_score": best_score,
                            "final_status": "no_match_low_score"
                        }
                    )

        logger.info("[adult:%s] No match for %s after all providers", mode.value, item.filename)
        item.status = ItemStatus.NO_MATCH
        self.db.flush()
        
        # Log final fallback no match outcome
        last_scraper = scrapers_to_try[-1][0] if scrapers_to_try else stash_scraper
        last_scraper.log_search(
            task_id=task_id,
            media_item_id=item.id,
            search_query=item.filename,
            result_count=0,
            details={"hash_match": False, "candidates": [], "final_status": "no_match"}
        )
