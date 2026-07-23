import logging
from typing import List, Dict, Any, Optional
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE

logger = logging.getLogger(__name__)

class TmdbSearchResolver:
    def search_tmdb(
        self,
        tmdb_client: Any,
        query: str,
        item_type: str,
        year: Optional[int],
        language: Optional[str],
        include_adult: bool,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """Searches TMDB for movies and TV shows, fetching season information concurrently for TV shows."""
        results = tmdb_client.search(query, item_type=item_type, year=year, language=language, include_adult=include_adult, page=page)

        if item_type == "tv" and results:
            from concurrent.futures import ThreadPoolExecutor
            def fetch_tv_seasons(r):
                try:
                    details = tmdb_client.get_details(r["id"], "tv", language=language)
                    r["last_air_date"] = details.get("last_air_date")
                    r["release_status"] = details.get("status")
                    seasons = details.get("seasons") or []
                    return [{
                        "season_number": s.get("season_number"),
                        "name": s.get("name"),
                        "episode_count": s.get("episode_count"),
                        "poster_path": s.get("poster_path"),
                        "air_date": s.get("air_date"),
                    } for s in seasons]
                except Exception as e:
                    logger.error(f"Failed to fetch seasons for TV {r.get('id')}: {e}")
                    return []

            with ThreadPoolExecutor(max_workers=5) as executor:
                seasons_lists = list(executor.map(fetch_tv_seasons, results))

            for r, s_list in zip(results, seasons_lists):
                r["seasons"] = s_list

        formatted = []
        for r in results:
            release_date = r.get("release_date") or r.get("first_air_date")
            year_val = None
            if release_date:
                try:
                    year_val = int(release_date.split("-")[0])
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            formatted.append({
                "id": r.get("id"),
                "title": r.get("title") or r.get("name") or r.get("original_title") or r.get("original_name"),
                "original_title": r.get("original_title") or r.get("original_name"),
                "release_date": release_date,
                "year": year_val,
                "overview": r.get("overview"),
                "poster_path": r.get("poster_path"),
                "backdrop_path": r.get("backdrop_path"),
                "rating": r.get("vote_average"),
                "media_type": item_type,
                "provider": "tmdb",
                "seasons": r.get("seasons") or [],
                "last_air_date": r.get("last_air_date"),
                "release_status": r.get("release_status"),
                "is_adult": bool(r.get("adult"))
            })
        return formatted

    def global_search_all(
        self,
        tmdb_client: Any,
        query: str,
        include_adult: bool,
        language: Optional[str],
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """Performs multi-type global searches on TMDB."""
        params = {
            "query": query,
            "include_adult": "true" if include_adult else "false",
            "language": language or DEFAULT_FALLBACK_LANGUAGE,
            "page": max(1, int(page or 1))
        }
        data = tmdb_client._call_api("/search/multi", params)
        results = data.get("results", []) or []
        # Fetch TV show details concurrently for multi-search results
        tv_items = [r for r in results if r.get("media_type") == "tv"]
        if tv_items:
            from concurrent.futures import ThreadPoolExecutor
            def fetch_tv_details(r):
                try:
                    details = tmdb_client.get_details(r["id"], "tv", language=language or DEFAULT_FALLBACK_LANGUAGE)
                    r["last_air_date"] = details.get("last_air_date")
                    r["release_status"] = details.get("status")
                except Exception as e:
                    logger.error(f"Failed to fetch details for TV {r.get('id')}: {e}")
            with ThreadPoolExecutor(max_workers=5) as executor:
                list(executor.map(fetch_tv_details, tv_items))

        formatted = []
        for r in results:
            media_type = r.get("media_type")
            if media_type not in ("movie", "tv", "person"):
                continue
            release_date = r.get("release_date") or r.get("first_air_date")
            year_val = None
            if release_date:
                try:
                    year_val = int(release_date.split("-")[0])
                except Exception as e:
                    try:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)
                    except Exception:
                        pass
                    pass
            formatted.append({
                "id": r.get("id"),
                "title": r.get("title") or r.get("name") or r.get("original_title") or r.get("original_name"),
                "original_title": r.get("original_title") or r.get("original_name"),
                "release_date": release_date,
                "year": year_val,
                "overview": r.get("overview") if media_type != "person" else f"Known for: {r.get('known_for_department', 'Acting')}",
                "poster_path": r.get("poster_path") if media_type != "person" else r.get("profile_path"),
                "backdrop_path": r.get("backdrop_path") if media_type != "person" else None,
                "rating": r.get("vote_average") or r.get("popularity") or 0.0,
                "media_type": media_type,
                "provider": "tmdb",
                "last_air_date": r.get("last_air_date"),
                "release_status": r.get("release_status"),
                "is_adult": bool(r.get("adult"))
            })
        return formatted

    def global_search_person(
        self,
        tmdb_client: Any,
        query: str,
        include_adult: bool,
        language: Optional[str],
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """Performs global performer search on TMDB."""
        results = tmdb_client.search_person(query, language=language or DEFAULT_FALLBACK_LANGUAGE, include_adult=include_adult, page=page)
        formatted = []
        for r in results:
            formatted.append({
                "id": r.get("id"),
                "title": r.get("name"),
                "original_title": None,
                "release_date": None,
                "year": None,
                "overview": f"Known for: {r.get('known_for_department', 'Acting')}",
                "poster_path": r.get("profile_path"),
                "backdrop_path": None,
                "rating": r.get("popularity") or 0.0,
                "media_type": "person",
                "provider": "tmdb",
                "is_adult": bool(r.get("adult"))
            })
        return formatted