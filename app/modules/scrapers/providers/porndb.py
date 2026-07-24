import logging
from typing import Optional

from app.core.enums import Provider, MediaType
from app.modules.scrapers.support.base import BaseStashGraphQLScraper
from app.modules.scrapers.providers.porndb_client import PornDbClient
from app.core.constants import PORNDB_DEFAULT_ENDPOINT, PORNDB_API_BASE, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class PornDBScraper(BaseStashGraphQLScraper):
    """ThePornDB-specific metadata retriever and parser utilizing GraphQL and ScraperNormalizer."""

    def __init__(self, settings, cache_service=None):
        super().__init__(settings, cache_service, Provider.PORNDB)
        self.client = PornDbClient(settings, session=self.session)

    def _fetch_rating(
        self,
        identifier: str,
        rating_type: str,
        force_refresh: bool = False,
    ) -> Optional[float]:
        media_type = {
            "performer": MediaType.PERSON,
            "movie": MediaType.MOVIE,
        }.get(rating_type, MediaType.SCENE)
        cache_key = f"porndb/rating/{rating_type}/v1/{identifier}"
        url = f"{PORNDB_API_BASE}/{rating_type}s/{identifier}"
        headers = self.client._get_headers()
        
        data = self.get_json_cached(
            provider=Provider.PORNDB,
            cache_key=cache_key,
            url=url,
            headers=headers,
            force_refresh=force_refresh,
            media_type=media_type,
            external_id=str(identifier),
            result_extractor=lambda x: x.get("data") if x else None,
            timeout=SCRAPER_REQUEST_TIMEOUT
        )
        if data:
            rating = data.get("rating")
            return float(rating) if rating is not None else None
        return None

    def fetch_performer_rating(self, performer_id: str, force_refresh: bool = False) -> Optional[float]:
        return self._fetch_rating(performer_id, "performer", force_refresh)

    def fetch_movie_rating(self, movie_id: str, force_refresh: bool = False) -> Optional[float]:
        return self._fetch_rating(movie_id, "movie", force_refresh)

    def fetch_scene_rating(self, scene_id: str, force_refresh: bool = False) -> Optional[float]:
        return self._fetch_rating(scene_id, "scene", force_refresh)

    def enrich_movie_ratings(self, movie: dict) -> dict:
        if movie and "id" in movie:
            movie["rating_porndb"] = self.fetch_movie_rating(str(movie["id"]))
        return movie

    def enrich_scene_ratings(self, scene: dict) -> dict:
        if scene and "id" in scene:
            scene["rating_porndb"] = self.fetch_scene_rating(str(scene["id"]))
        return scene

    def fetch_performer_bio(self, performer_id: str, force_refresh: bool = False) -> Optional[dict]:
        headers = self.client._get_headers()
        if not headers:
            return None
        cache_key = f"porndb/performer/bio/v1/{performer_id}"
        url = f"{PORNDB_API_BASE}/performers/{performer_id}"
        
        return self.get_json_cached(
            provider=Provider.PORNDB,
            cache_key=cache_key,
            url=url,
            headers=headers,
            force_refresh=force_refresh,
            media_type=MediaType.PERSON,
            external_id=str(performer_id),
            result_extractor=lambda x: x.get("data") if x else None,
            timeout=SCRAPER_REQUEST_TIMEOUT
        )

    def get_performer_details(self, performer_id: str) -> Optional[dict]:
        details = super().get_performer_details(performer_id)
        if details:
            details["rating_porndb"] = self.fetch_performer_rating(performer_id)
            rest_data = self.fetch_performer_bio(performer_id)
            if rest_data:
                if rest_data.get("bio"):
                    details["details"] = rest_data["bio"]
                rest_extras = rest_data.get("extras") or {}
                if rest_extras and "same_sex_only" in rest_extras:
                    is_same_sex = rest_extras.get("same_sex_only")
                    details["same_sex_only"] = "Yes" if is_same_sex else "No"
                if rest_extras and rest_extras.get("tattoos"):
                    details["tattoos"] = rest_extras["tattoos"]
                if rest_extras and rest_extras.get("piercings"):
                    details["piercings"] = rest_extras["piercings"]
                if rest_extras and "fake_boobs" in rest_extras:
                    is_fake = rest_extras.get("fake_boobs")
                    details["breast_type"] = "FAKE" if is_fake else "NATURAL"
        return details

    def find_movie_by_hash(self, file_hash: str, hash_type: str = "OSHASH", force_refresh: bool = False) -> Optional[dict]:
        if not file_hash:
            return None
        cache_key = f"porndb/movie/hash/v1/{hash_type.lower()}/{file_hash}"
        url = f"{PORNDB_API_BASE}/movies/hash/{file_hash}"
        headers = self.client._get_headers()
        params = {"type": hash_type}
        
        data = self.get_json_cached(
            provider=Provider.PORNDB,
            cache_key=cache_key,
            url=url,
            method="GET",
            params=params,
            headers=headers,
            force_refresh=force_refresh,
            media_type=MediaType.MOVIE,
            external_id=lambda x: str(x.get("id")) if x and x.get("id") else None,
            result_extractor=lambda x: x.get("data") if x else None,
            timeout=SCRAPER_REQUEST_TIMEOUT
        )
        return self.enrich_movie_ratings(data) if data else None

    def fetch_movie(self, movie_id: str, force_refresh: bool = False) -> Optional[dict]:
        cache_key = f"porndb/movie/v1/{movie_id}"
        url = f"{PORNDB_API_BASE}/movies/{movie_id}"
        headers = self.client._get_headers()
        
        data = self.get_json_cached(
            provider=Provider.PORNDB,
            cache_key=cache_key,
            url=url,
            headers=headers,
            force_refresh=force_refresh,
            media_type=MediaType.MOVIE,
            external_id=str(movie_id),
            result_extractor=lambda x: x.get("data") if x else None,
            timeout=SCRAPER_REQUEST_TIMEOUT
        )
        return self.enrich_movie_ratings(data) if data else None

    def search_performers(self, query_str: str, page: int = 1) -> list[dict]:
        normalized_query = str(query_str or "").strip()
        if not normalized_query:
            return []

        try:
            cache_key = f"porndb/performer/search/v1/{normalized_query.lower()}/{page}"
            url = f"{PORNDB_API_BASE}/performers"
            headers = self.client._get_headers()
            params = {"q": normalized_query, "page": page}
            
            resp_json = self.get_json_cached(
                provider=Provider.PORNDB,
                cache_key=cache_key,
                url=url,
                params=params,
                headers=headers,
                media_type=MediaType.PERSON,
                timeout=SCRAPER_REQUEST_TIMEOUT
            )
            if not resp_json:
                return super().search_performers(normalized_query)

            performers = resp_json.get("data") or []
            formatted = []
            for perf in performers:
                parent = perf.get("parent") or perf
                perf_id = parent.get("id")
                if not perf_id:
                    continue

                images = []
                image_url = parent.get("image") or parent.get("face")
                if image_url:
                    images.append({"url": image_url})

                extras = parent.get("extras") or {}
                formatted.append({
                    "id": str(perf_id),
                    "name": parent.get("name"),
                    "gender": extras.get("gender") or parent.get("gender"),
                    "scene_count": parent.get("scene_count") or 0,
                    "images": images,
                })
            return formatted
        except Exception as exc:
            logger.error(f"PornDB REST performers search error: {exc}")
            return super().search_performers(normalized_query)

    def search_movies(
        self,
        query: str,
        year: Optional[int] = None,
        per_page: int = 10,
        page: int = 1,
        force_refresh: bool = False,
    ) -> list[dict]:
        normalized_query = str(query or "").strip()
        if not normalized_query:
            return []

        cache_key = f"porndb/movie/search/v1/{normalized_query.lower()}/{year or 'all'}/{page}"
        url = f"{PORNDB_API_BASE}/movies"
        headers = self.client._get_headers()
        params = {"q": normalized_query, "per_page": max(1, min(per_page, 25)), "page": page}
        if year:
            params["year"] = year

        cached_resp = self.get_json_cached(
            provider=Provider.PORNDB,
            cache_key=cache_key,
            url=url,
            params=params,
            headers=headers,
            force_refresh=force_refresh,
            media_type=MediaType.MOVIE,
            result_extractor=lambda x: {"data": x.get("data") or []} if x else None,
            timeout=SCRAPER_REQUEST_TIMEOUT
        )
        return cached_resp.get("data", []) if cached_resp else []

    def fetch_scene(self, scene_id: str, force_refresh: bool = False) -> Optional[dict]:
        """Queries ThePornDB GraphQL endpoint for scene info. Always mapped to English locale."""
        endpoint = self.get_setting("porndb_endpoint", PORNDB_DEFAULT_ENDPOINT)
        cache_key = f"porndb/scene/v4/{scene_id}"
        cached_data = self.cache.get(Provider.PORNDB, cache_key, force_refresh=force_refresh)
        if cached_data:
            if cached_data.get("cached_error"):
                return None
            return cached_data

        result = self.client.get_scene_graphql(endpoint, self.STASH_FIND_SCENE_QUERY, scene_id)
        if result:
            data = self.extract_and_map_measurements(result)
            if data:
                data = self.enrich_scene_ratings(data)
                self.cache.set(Provider.PORNDB, cache_key, data, status_code=200, media_type=MediaType.SCENE, external_id=scene_id)
                return data

        return self._fetch_scene_rest(scene_id, cache_key)

    def _fetch_scene_rest(self, scene_id: str, cache_key: str) -> Optional[dict]:
        res_json = self.client.get_scene_rest(scene_id)
        if res_json:
            res_data = res_json.get("data")
            if res_data:
                mapped_data = self._map_rest_scene_to_graphql(res_data)
                mapped_data = self.enrich_scene_ratings(mapped_data)
                self.cache.set(Provider.PORNDB, cache_key, mapped_data, status_code=200, media_type=MediaType.SCENE, external_id=scene_id)
                return mapped_data

        self.cache.set(Provider.PORNDB, cache_key, {}, status_code=404, media_type=MediaType.SCENE, external_id=scene_id)
        return None

    def _map_rest_scene_to_graphql(self, data: dict) -> dict:
        site = data.get("site") or {}
        network = site.get("network") or site.get("parent") or {}
        
        studio_data = {
            "id": site.get("uuid") or str(site.get("id")) if site else None,
            "name": site.get("name") if site else None,
            "images": [{"url": site.get("logo")}] if site and site.get("logo") else []
        }
        if network:
            studio_data["parent"] = {
                "id": network.get("uuid") or str(network.get("id")),
                "name": network.get("name"),
                "images": [{"url": network.get("logo")}] if network.get("logo") else []
            }
            
        performers_data = []
        for perf in data.get("performers") or []:
            p_info = perf.get("parent") or perf
            p_images = []
            if p_info.get("image"):
                p_images.append({"url": p_info["image"]})
                
            performers_data.append({
                "performer": {
                    "id": p_info.get("id"),
                    "name": p_info.get("name"),
                    "gender": p_info.get("extras", {}).get("gender") or p_info.get("gender"),
                    "scene_count": None,
                    "rating_porndb": p_info.get("rating"),
                    "images": p_images,
                    "birth_date": p_info.get("extras", {}).get("birthday") or p_info.get("birthday"),
                    "ethnicity": p_info.get("extras", {}).get("ethnicity") or p_info.get("ethnicity"),
                    "hair_color": p_info.get("extras", {}).get("hair_colour") or p_info.get("hair_color"),
                    "eye_color": p_info.get("extras", {}).get("eye_colour") or p_info.get("eye_color"),
                    "height": p_info.get("extras", {}).get("height") or p_info.get("height"),
                    "weight": p_info.get("extras", {}).get("weight") or p_info.get("weight"),
                    "measurements": {
                        "band_size": p_info.get("extras", {}).get("band_size"),
                        "cup_size": p_info.get("extras", {}).get("cupsize") or p_info.get("cup_size"),
                        "waist": p_info.get("extras", {}).get("waist"),
                        "hip": p_info.get("extras", {}).get("hips"),
                    }
                }
            })
            
        tags_data = []
        for t in data.get("tags") or []:
            tags_data.append({
                "name": t.get("name")
            })
            
        images_data = []
        if data.get("poster"):
            images_data.append({"url": data["poster"]})
        elif data.get("image"):
            images_data.append({"url": data["image"]})
            
        mapped = {
            "id": data.get("id"),
            "title": data.get("title"),
            "details": data.get("description"),
            "date": data.get("date"),
            "rating": data.get("rating"),
            "duration": data.get("duration"),
            "studio": studio_data,
            "performers": performers_data,
            "tags": tags_data,
            "images": images_data,
            "background": data.get("background"),
            "background_back": data.get("background_back"),
            "poster": data.get("poster"),
            "image": data.get("image")
        }
        return mapped

    @staticmethod
    def extract_poster(data: dict) -> Optional[str]:
        if not data or not isinstance(data, dict):
            return None
        for key in ("image", "poster_image", "poster", "front_image", "cover"):
            val = data.get(key)
            if isinstance(val, str) and val.startswith("http"):
                return val
            if isinstance(val, dict):
                for k in ("large", "medium", "url", "original", "small"):
                    if isinstance(val.get(k), str) and val.get(k).startswith("http"):
                        return val.get(k)
        posters = data.get("posters")
        if isinstance(posters, dict):
            for k in ("large", "medium", "url", "original", "small"):
                if isinstance(posters.get(k), str) and posters.get(k).startswith("http"):
                    return posters.get(k)
        elif isinstance(posters, str) and posters.startswith("http"):
            return posters
        return None

    @staticmethod
    def extract_backdrop(data: dict) -> Optional[str]:
        if not data or not isinstance(data, dict):
            return None
        for key in ("backdrop", "backdrops", "banner", "fanart"):
            val = data.get(key)
            if isinstance(val, str) and val.startswith("http"):
                return val
            if isinstance(val, dict):
                for k in ("large", "medium", "url", "original"):
                    if isinstance(val.get(k), str) and val.get(k).startswith("http"):
                        return val.get(k)
        return None
