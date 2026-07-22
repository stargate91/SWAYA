import logging
import time
import random
from typing import Optional, List, Dict, Any

from app.core.enums import Provider
from app.core.language import LanguageService
from app.modules.scrapers.support.base import BaseScraper

from app.core.constants import TMDB_API_BASE, DEFAULT_FALLBACK_LANGUAGE, TMDB_MOVIE_APPEND_PARTS, TMDB_TV_APPEND_PARTS, SCRAPER_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class TMDBScraper(BaseScraper):
    """TMDB-specific metadata retriever and parser utilizing ScraperNormalizer."""

    def __init__(self, settings, cache_service=None):
        super().__init__(settings, cache_service, Provider.TMDB)

    def _call_api(self, endpoint: str, params: Dict[str, Any], max_retries: int = 3, force_refresh: bool = False) -> Dict[str, Any]:
        """Central API caller with caching and rate limit (429) handling."""
        api_key = self.get_setting("tmdb_api_key")
        if not api_key:
            logger.warning("TMDB API key not configured.")
            return {}

        p = params.copy()
        if 'api_key' not in p:
            p['api_key'] = api_key

        # Generate unique cache key (exclude API key for security)
        cache_params = p.copy()
        cache_params.pop('api_key', None)
        sorted_params = sorted(cache_params.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params)
        cache_key = f"tmdb{endpoint}?{param_str}"

        url = f"{TMDB_API_BASE}{endpoint}"
        res = self.get_json_cached(
            Provider.TMDB,
            cache_key,
            url,
            params=p,
            force_refresh=force_refresh,
            external_id=lambda d: str(d.get("id")) if d else None,
            max_retries=max_retries,
            timeout=SCRAPER_REQUEST_TIMEOUT,
        )
        return res or {}

    def search(self, query: str, item_type: str = "movie", year: Optional[int] = None, language: Optional[str] = None, include_adult: bool = False, page: int = 1) -> List[Dict[str, Any]]:
        """Search TMDB (Movie or TV Show)."""
        if not query:
            return []

        resolved_lang = LanguageService.resolve_request_locale(Provider.TMDB, language) or DEFAULT_FALLBACK_LANGUAGE
        endpoint = "/search/movie" if item_type == "movie" else "/search/tv"
        params = {
            "query": query,
            "include_adult": "true" if include_adult else "false",
            "page": max(1, int(page or 1)),
            "language": resolved_lang
        }
        if year:
            key = "primary_release_year" if item_type == "movie" else "first_air_date_year"
            params[key] = year

        data = self._call_api(endpoint, params)
        return data.get("results", [])

    def search_person(self, query: str, language: str = "en-US", include_adult: bool = False, page: int = 1) -> List[Dict[str, Any]]:
        """Search for people (actors/directors) on TMDB."""
        if not query:
            return []

        endpoint = "/search/person"
        params = {
            "query": query,
            "language": language,
            "include_adult": "true" if include_adult else "false",
            "page": max(1, int(page or 1)),
        }
        data = self._call_api(endpoint, params)
        return data.get("results", [])

    def find_by_imdb(self, imdb_id: str, language: str = "en-US") -> Optional[Dict[str, Any]]:
        """Find a movie or TV show by its IMDb ID."""
        if not imdb_id:
            return None

        params = {
            "external_source": "imdb_id",
            "language": language
        }
        data = self._call_api(f"/find/{imdb_id}", params)
        
        movies = data.get("movie_results", [])
        tv = data.get("tv_results", [])
        
        if movies:
            return {**movies[0], "item_type": "movie"}
        if tv:
            return {**tv[0], "item_type": "tv"}
        return None

    def get_details(
        self,
        tmdb_id: int,
        item_type: str,
        language: Optional[str] = None,
        include_images: bool = True,
        append_parts: Optional[List[str]] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Retrieve detailed information about a movie or TV show."""
        endpoint = f"/movie/{tmdb_id}" if item_type == "movie" else f"/tv/{tmdb_id}"
        resolved_lang = LanguageService.resolve_request_locale(Provider.TMDB, language) or DEFAULT_FALLBACK_LANGUAGE
        
        if append_parts is None:
            if item_type == "movie":
                append_parts = list(TMDB_MOVIE_APPEND_PARTS)
            else:
                append_parts = list(TMDB_TV_APPEND_PARTS)

        # Do NOT include "images" in append_to_response to avoid filtering before we know original_language
        actual_append_parts = [p for p in append_parts if p != "images"]
        append = ",".join(actual_append_parts)
        normalized_lang = resolved_lang.split("-", 1)[0].strip() or DEFAULT_FALLBACK_LANGUAGE
        include_video_language = ",".join(dict.fromkeys([normalized_lang, DEFAULT_FALLBACK_LANGUAGE, "null"]))

        params = {
            "language": resolved_lang,
            "append_to_response": append,
            "include_video_language": include_video_language,
        }

        details = {}
        try:
            details = self._call_api(endpoint, params, force_refresh=force_refresh)
        except Exception as e:
            # Fallback 1: Try without credits/translations
            try:
                reduced_parts = [p for p in actual_append_parts if p not in ("credits", "aggregate_credits", "translations")]
                params["append_to_response"] = ",".join(reduced_parts)
                details = self._call_api(endpoint, params, force_refresh=force_refresh)
            except Exception:
                # Fallback 2: Try with no appends at all
                try:
                    params.pop("append_to_response", None)
                    details = self._call_api(endpoint, params, force_refresh=force_refresh)
                except Exception as ex:
                    logger.debug(f"Swallowed exception in modules/scrapers/providers/tmdb.py:170: {ex}", exc_info=True)
                    raise e

        # If details were fetched successfully and images are requested, fetch them separately incorporating original_language
        if include_images and details:
            orig_lang = details.get("original_language")
            img_langs = dict.fromkeys([normalized_lang, DEFAULT_FALLBACK_LANGUAGE, orig_lang, "null"])
            img_params = {
                "include_image_language": ",".join([l for l in img_langs if l])
            }
            try:
                images_data = self._call_api(f"/{item_type}/{tmdb_id}/images", img_params, force_refresh=force_refresh)
                details["images"] = images_data
            except Exception as e:
                logger.warning(f"Failed to fetch TMDB images separately: {e}")
                details["images"] = {}

        return details

    def get_episode_details(self, tv_id: int, season_number: int, episode_number: int, language: str = "en-US", force_refresh: bool = False) -> Dict[str, Any]:
        """Retrieve details for a specific episode."""
        endpoint = f"/tv/{tv_id}/season/{season_number}/episode/{episode_number}"
        params = {
            "language": language,
            "append_to_response": "credits,external_ids,images,translations,videos"
        }
        return self._call_api(endpoint, params, force_refresh=force_refresh)

    def get_season_details(self, tv_id: int, season_number: int, language: str = "en-US", force_refresh: bool = False) -> Dict[str, Any]:
        """Retrieve details for a specific season."""
        endpoint = f"/tv/{tv_id}/season/{season_number}"
        normalized_lang = str(language or DEFAULT_FALLBACK_LANGUAGE).split("-", 1)[0].strip() or DEFAULT_FALLBACK_LANGUAGE
        include_image_language = ",".join(dict.fromkeys([normalized_lang, DEFAULT_FALLBACK_LANGUAGE, "null"]))
        params = {
            "language": language,
            "append_to_response": "external_ids,videos,images",
            "include_image_language": include_image_language,
        }
        return self._call_api(endpoint, params, force_refresh=force_refresh)

    def get_person_images(self, person_id: int, force_refresh: bool = False) -> Dict[str, Any]:
        """Retrieve all available profile pictures for a person."""
        endpoint = f"/person/{person_id}/images"
        return self._call_api(endpoint, {}, force_refresh=force_refresh)

    def get_person_details(self, person_id: int, language: str = "en-US", force_refresh: bool = False) -> Dict[str, Any]:
        """Retrieve detailed information about a person."""
        endpoint = f"/person/{person_id}"
        params = {
            "language": language,
            "append_to_response": "images,translations,external_ids,combined_credits"
        }
        try:
            return self._call_api(endpoint, params, force_refresh=force_refresh)
        except Exception as e:
            # Fallback 1: Try without combined_credits
            try:
                params["append_to_response"] = "images,translations,external_ids"
                return self._call_api(endpoint, params, force_refresh=force_refresh)
            except Exception:
                # Fallback 2: Try with no appends at all
                try:
                    params.pop("append_to_response", None)
                    return self._call_api(endpoint, params, force_refresh=force_refresh)
                except Exception as e:
                    logger.debug(f"Swallowed exception in modules/scrapers/providers/tmdb.py:219: {e}", exc_info=True)
            
            # If all original language attempts failed, try English fallback
            normalized_lang = str(language or DEFAULT_FALLBACK_LANGUAGE).split("-", 1)[0].strip() or DEFAULT_FALLBACK_LANGUAGE
            if normalized_lang != DEFAULT_FALLBACK_LANGUAGE:
                params["language"] = f"{DEFAULT_FALLBACK_LANGUAGE}-US"
                params["append_to_response"] = "images,translations,external_ids,combined_credits"
                try:
                    return self._call_api(endpoint, params, force_refresh=force_refresh)
                except Exception:
                    try:
                        params["append_to_response"] = "images,translations,external_ids"
                        return self._call_api(endpoint, params, force_refresh=force_refresh)
                    except Exception:
                        try:
                            params.pop("append_to_response", None)
                            return self._call_api(endpoint, params, force_refresh=force_refresh)
                        except Exception as e:
                            logger.debug(f"Swallowed exception in modules/scrapers/providers/tmdb.py:237: {e}", exc_info=True)
            raise e

    def fetch_movie(self, movie_id: str, language: Optional[str] = None, force_refresh: bool = False) -> Optional[dict]:
        """Fetches movie details from TMDB with caching and localization."""
        data = self.get_details(int(movie_id), "movie", language=language, force_refresh=force_refresh)
        return data if data else None

    def fetch_tv(self, tv_id: str, language: Optional[str] = None, force_refresh: bool = False) -> Optional[dict]:
        """Fetches TV show details from TMDB with caching and localization."""
        data = self.get_details(int(tv_id), "tv", language=language, force_refresh=force_refresh)
        return data if data else None

    def get_trending(self, media_type: str, time_window: str = "day", language: Optional[str] = None) -> Dict[str, Any]:
        """Fetch trending items from TMDB."""
        resolved_lang = LanguageService.resolve_request_locale(Provider.TMDB, language) or DEFAULT_FALLBACK_LANGUAGE
        endpoint = f"/trending/{media_type}/{time_window}"
        return self._call_api(endpoint, {"language": resolved_lang})

    def discover(
        self,
        media_type: str,
        language: Optional[str] = None,
        sort_by: str = "popularity.desc",
        include_adult: bool = False,
        with_companies: Optional[str] = None,
        page: Optional[int] = None,
        with_genres: Optional[str] = None,
        primary_release_year: Optional[int] = None,
        vote_count_gte: Optional[int] = None
    ) -> Dict[str, Any]:
        """Discover media items from TMDB."""
        resolved_lang = LanguageService.resolve_request_locale(Provider.TMDB, language) or DEFAULT_FALLBACK_LANGUAGE
        endpoint = f"/discover/{media_type}"
        params = {"language": resolved_lang, "sort_by": sort_by, "include_adult": str(include_adult).lower()}
        if with_companies:
            params["with_companies"] = with_companies
        if page is not None:
            params["page"] = str(page)
        if with_genres is not None:
            params["with_genres"] = with_genres
        if primary_release_year is not None:
            params["primary_release_year"] = str(primary_release_year)
        if vote_count_gte is not None:
            params["vote_count.gte"] = str(vote_count_gte)
        return self._call_api(endpoint, params)

    def get_collection_details(self, collection_id: int, language: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """Retrieve details for a specific movie collection/saga."""
        resolved_lang = LanguageService.resolve_request_locale(Provider.TMDB, language) or DEFAULT_FALLBACK_LANGUAGE
        endpoint = f"/collection/{collection_id}"
        params = {
            "language": resolved_lang,
            "append_to_response": "images",
        }
        if resolved_lang:
            lang_short = resolved_lang.split("-")[0]
            params["include_image_language"] = f"{lang_short},en,null"
        return self._call_api(endpoint, params, force_refresh=force_refresh)


