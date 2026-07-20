import logging
from typing import List, Dict, Any, Optional, Union
from sqlalchemy.orm import Session

from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.shared_kernel.ports.settings_port import SettingsPort
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.application.recommendations.schemas import RecommendationsResponse, ActionResponse

logger = logging.getLogger(__name__)


class RecommendationsService:
    def __init__(self, db: Session, scrapers: ScraperGatewayPort, settings_port: Optional[SettingsPort] = None):
        self.db = db
        self.scraper = scrapers.tmdb(db)
        from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
        self.settings = settings_port or DbSettingsAdapter(db)
        
        from app.domains.recommendations.services.watchlist_service import RecommendationWatchlistService
        from app.domains.recommendations.services.adult_discovery_service import AdultDiscoveryService
        from app.domains.recommendations.services.library_content_service import LibraryContentService
        from app.domains.recommendations.services.tmdb_recommendation_service import TmdbRecommendationService
        
        self.watchlist_service = RecommendationWatchlistService(db)
        self.adult_discovery_service = AdultDiscoveryService(db, self.settings)
        self.library_content_service = LibraryContentService(db, self.settings)
        self.tmdb_recommendation_service = TmdbRecommendationService(db, self.scraper, self.settings)

    def _preferred_metadata_language(self) -> str:
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE

    def get_recommendations(self, language: Optional[str] = None, include_adult: Optional[bool] = None) -> RecommendationsResponse:
        watchlist_ids = self._fetch_watchlist_ids()
        pref_lang = language or self._preferred_metadata_language()
        
        if include_adult is None:
            include_adult_val = self.settings.get_setting("include_adult")
            include_adult = str(include_adult_val).lower() == "true"

        # Fetch Candidates
        trending_movie = self.scraper.get_trending("movie", "day", language=pref_lang)
        trending_tv = self.scraper.get_trending("tv", "day", language=pref_lang)
        
        trending_movie_results = trending_movie.get("results", [])
        trending_tv_results = trending_tv.get("results", [])

        # Discover Movies (fetch 3 pages = 60 items)
        discover_movies_pool = []
        for page in (1, 2, 3):
            try:
                res = self.scraper.discover("movie", language=pref_lang, sort_by="popularity.desc", include_adult=include_adult, page=page)
                res_items = res.get("results", [])
                if not res_items:
                    break
                discover_movies_pool.extend(res_items)
            except Exception as e:
                logger.error(f"Failed to fetch discover movies page {page}: {e}")
                break

        # Discover TV (fetch 3 pages = 60 items)
        discover_tv_pool = []
        for page in (1, 2, 3):
            try:
                res = self.scraper.discover("tv", language=pref_lang, sort_by="popularity.desc", include_adult=include_adult, page=page)
                res_items = res.get("results", [])
                if not res_items:
                    break
                discover_tv_pool.extend(res_items)
            except Exception as e:
                logger.error(f"Failed to fetch discover tv page {page}: {e}")
                break

        # Discover Adult
        discover_adult_pool = []
        adult_companies = "6886|6463|5979|6112|8552|6316|15887|56675|281764|6258|5788|195672|115980|115981|115982|128489|5785|6013|7360|6109|15891|8551|147321|18625"
        for page in (1, 2, 3):
            try:
                res = self.scraper.discover(
                    "movie",
                    language=pref_lang,
                    sort_by="popularity.desc",
                    include_adult=True,
                    with_companies=adult_companies,
                    page=page
                )
                results = res.get("results", [])
                if not results:
                    break
                discover_adult_pool.extend(results)
            except Exception as e:
                logger.error(f"Failed to fetch adult recommendations page {page}: {e}")
                break
        discover_adult_pool = [item for item in discover_adult_pool if item.get("adult")]

        # Resolve local bindings for all candidate items
        all_candidates = (
            trending_movie_results +
            trending_tv_results +
            discover_movies_pool +
            discover_tv_pool +
            discover_adult_pool
        )
        bindings = self.tmdb_recommendation_service.resolve_local_recommendation_bindings(all_candidates)

        def is_in_library(item):
            tmdb_id = item.get("id")
            if not tmdb_id:
                return False
            media_type = item.get("media_type") or ("movie" if item.get("title") else "tv")
            bind = bindings.get((media_type, tmdb_id), {})
            return bind.get("media_item_id") is not None

        # Filter out items already in the library
        clean_trending_movie = [item for item in trending_movie_results if not is_in_library(item)]
        clean_trending_tv = [item for item in trending_tv_results if not is_in_library(item)]
        
        trending_results = clean_trending_movie[:10] + clean_trending_tv[:10]
        if not include_adult:
            trending_results = [item for item in trending_results if not item.get("adult", False)]

        clean_discover_movies = [item for item in discover_movies_pool if not is_in_library(item)][:20]
        clean_discover_tv = [item for item in discover_tv_pool if not is_in_library(item)][:20]

        clean_discover_adult = []
        if discover_adult_pool:
            import random
            from datetime import datetime
            import math
            
            def get_score(x):
                pop = float(x.get("popularity") or 0.0)
                vote_avg = float(x.get("vote_average") or 0.0)
                vote_cnt = int(x.get("vote_count") or 0)
                return pop * (vote_avg + 1.0) * math.log10(max(vote_cnt, 2))

            filtered_adult_pool = [item for item in discover_adult_pool if not is_in_library(item)]
            filtered_adult_pool.sort(key=get_score, reverse=True)
            top_pool = filtered_adult_pool[:40]
            
            day_str = datetime.utcnow().strftime("%Y-%m-%d")
            seed_val = int(day_str.replace("-", ""))
            rng = random.Random(seed_val)
            rng.shuffle(top_pool)
            
            clean_discover_adult = top_pool[:20]

        # Parallel fetch for TV show details to populate last_air_date and release_status for items not in the library
        all_tv_shows = clean_discover_tv + [item for item in trending_results if item.get("media_type") == "tv" or not item.get("title")]
        tv_items_to_enrich = [item for item in all_tv_shows if not item.get("last_air_date")]
        if tv_items_to_enrich:
            from concurrent.futures import ThreadPoolExecutor
            def fetch_tv_details(item):
                try:
                    details = self.scraper.get_details(
                        tmdb_id=item["id"],
                        item_type="tv",
                        language=pref_lang,
                        include_images=False,
                        append_parts=[]
                    )
                    if details:
                        item["last_air_date"] = details.get("last_air_date")
                        item["release_status"] = details.get("status")
                except Exception as e:
                    logger.debug(f"Failed to fetch details for recommended TV {item.get('id')}: {e}")

            with ThreadPoolExecutor(max_workers=10) as executor:
                executor.map(fetch_tv_details, tv_items_to_enrich)

        # 5. Fetch recently added library items and active people matching the mode (Page 1)
        recently_added = self.get_recently_added_paginated(page=1, limit=20, include_adult=include_adult, language=pref_lang)
        recently_activated_people = self.get_recently_activated_people_paginated(page=1, limit=20, include_adult=include_adult)

        def annotate(items):
            return self.tmdb_recommendation_service.annotate_recommendations(items, bindings)

        return RecommendationsResponse(
            trending=annotate(trending_results),
            discover_movies=annotate(clean_discover_movies),
            discover_tv=annotate(clean_discover_tv),
            discover_adult=annotate(clean_discover_adult),
            discover_stashdb=self._get_adult_discovery("stashdb") if include_adult else [],
            discover_fansdb=self._get_adult_discovery("fansdb") if include_adult else [],
            top_movie_genre="Action",
            top_tv_genre="Drama",
            watchlist_item_ids=watchlist_ids,
            recently_added=recently_added,
            recently_activated_people=recently_activated_people
        )

    def add_to_watchlist(self, tmdb_id: Optional[Union[int, str]], media_type: str, media_item_id: Optional[Union[int, str]] = None) -> ActionResponse:
        return self.watchlist_service.add_to_watchlist(tmdb_id, media_type, media_item_id)

    def remove_from_watchlist(self, tmdb_id: Union[int, str]) -> ActionResponse:
        return self.watchlist_service.remove_from_watchlist(tmdb_id)

    def _annotate_recommendations(
        self,
        items: List[Dict[str, Any]],
        bindings: Dict[tuple, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        return self.tmdb_recommendation_service.annotate_recommendations(items, bindings)

    def _fetch_watchlist_ids(self) -> List[Union[int, str]]:
        return self.watchlist_service.fetch_watchlist_ids()

    def _resolve_local_recommendation_bindings(self, items: List[Dict[str, Any]]) -> Dict[tuple, Dict[str, Any]]:
        return self.tmdb_recommendation_service.resolve_local_recommendation_bindings(items)

    def discover_top_items(
        self,
        genre_id: Optional[int] = None,
        year: Optional[int] = None,
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.tmdb_recommendation_service.discover_top_items(genre_id, year, language)

    def get_recently_added_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        include_adult: Optional[bool] = None,
        language: Optional[str] = None,
        media_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.library_content_service.get_recently_added_paginated(page, limit, include_adult, media_type, language)

    def get_recently_activated_people_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        include_adult: Optional[bool] = None,
        gender: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.library_content_service.get_recently_activated_people_paginated(page, limit, include_adult, gender)

    def _get_adult_discovery(self, provider: str) -> List[Dict[str, Any]]:
        return self.adult_discovery_service.get_adult_discovery(provider)
