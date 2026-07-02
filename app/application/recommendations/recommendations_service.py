import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.shared_kernel.ports.settings_port import SettingsPort
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.application.recommendations.schemas import RecommendationsResponse, ActionResponse
from app.application.catalog.lists_service import ListsService as DomainListsService

from app.domains.users.models import CustomList
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.shared_kernel.enums import MediaType, ItemStatus, Provider

logger = logging.getLogger(__name__)


class RecommendationsService:
    def __init__(self, db: Session, scrapers: ScraperGatewayPort, settings_port: Optional[SettingsPort] = None):
        self.db = db
        self.scraper = scrapers.tmdb(db)
        from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
        self.settings = settings_port or DbSettingsAdapter(db)
        self.lists_service = DomainListsService(db)

    def _preferred_metadata_language(self) -> str:
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE

    def get_recommendations(self, language: Optional[str] = None) -> RecommendationsResponse:
        watchlist_tmdb_ids = self._fetch_watchlist_tmdb_ids()
        pref_lang = language or self._preferred_metadata_language()
        
        include_adult_val = self.settings.get_setting("include_adult")
        include_adult = str(include_adult_val).lower() == "true"

        trending_movie = self.scraper.get_trending("movie", "day", language=pref_lang)
        trending_tv = self.scraper.get_trending("tv", "day", language=pref_lang)

        trending_results = trending_movie.get("results", [])[:10] + trending_tv.get("results", [])[:10]
        if not include_adult:
            trending_results = [item for item in trending_results if not item.get("adult", False)]

        discover_movies = self.scraper.discover("movie", language=pref_lang, sort_by="popularity.desc", include_adult=include_adult).get("results", [])
        discover_tv = self.scraper.discover("tv", language=pref_lang, sort_by="popularity.desc", include_adult=include_adult).get("results", [])

        discover_adult = []
        if include_adult:
            import random
            from datetime import datetime
            import math
            
            # Fetch a larger pool of 60 items (3 pages) to select from
            pool = []
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
                    pool.extend(results)
                except Exception as e:
                    logger.error(f"Failed to fetch adult recommendations page {page}: {e}")
                    break

            # Filter to keep only actual adult items
            pool = [item for item in pool if item.get("adult")]

            if pool:
                # Use current date as seed (stable for the entire day)
                day_str = datetime.utcnow().strftime("%Y-%m-%d")
                seed_val = int(day_str.replace("-", ""))
                
                # Score function: popularity * (vote_average + 1) * log10(vote_count)
                def get_score(x):
                    pop = float(x.get("popularity") or 0.0)
                    vote_avg = float(x.get("vote_average") or 0.0)
                    vote_cnt = int(x.get("vote_count") or 0)
                    return pop * (vote_avg + 1.0) * math.log10(max(vote_cnt, 2))
                
                # Sort pool and select the top 40 highest quality/popular items
                pool.sort(key=get_score, reverse=True)
                top_pool = pool[:40]
                
                # Shuffle deterministically based on today's seed
                rng = random.Random(seed_val)
                rng.shuffle(top_pool)
                
                # Return the final 20 recommendations for today
                discover_adult = top_pool[:20]

        # Parallel fetch for TV show details to populate last_air_date and release_status for items not in the library
        all_tv_shows = discover_tv + [item for item in trending_results if item.get("media_type") == "tv" or not item.get("title")]
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

        bindings = self._resolve_local_recommendation_bindings(
            trending_results + discover_movies + discover_tv + discover_adult
        )

        def annotate(items):
            return self._annotate_recommendations(items, bindings)

        return RecommendationsResponse(
            trending=annotate(trending_results),
            discover_movies=annotate(discover_movies),
            discover_tv=annotate(discover_tv),
            discover_adult=annotate(discover_adult) if include_adult else [],
            top_movie_genre="Action",
            top_tv_genre="Drama",
            watchlist_item_ids=watchlist_tmdb_ids
        )

    def add_to_watchlist(self, tmdb_id: int, media_type: str) -> ActionResponse:
        # Get watchlist ID
        lists = self.lists_service.get_all_lists()
        watchlist = next((l for l in lists if l.name == "Watchlist"), None)
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")
        
        item = self.lists_service.add_item_to_list(watchlist.id, {"tmdb_id": tmdb_id, "media_type": media_type})
        return ActionResponse(status="success", id=item.id)

    def remove_from_watchlist(self, tmdb_id: int) -> ActionResponse:
        lists = self.lists_service.get_all_lists()
        watchlist = next((l for l in lists if l.name == "Watchlist"), None)
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")
        
        list_item_id = None
        for item in watchlist.items:
            if item.match and item.match.provider == Provider.TMDB and item.match.external_id == str(tmdb_id):
                list_item_id = item.id
                break
        
        if list_item_id is not None:
            self.lists_service.remove_item_from_list(watchlist.id, list_item_id)
            return ActionResponse(status="success")
            
        return ActionResponse(status="error", message="Item not found in watchlist")

    def _annotate_recommendations(
        self,
        items: List[Dict[str, Any]],
        bindings: Dict[tuple, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        annotated = []
        for item in items:
            tmdb_id = item.get("id")
            media_type = item.get("media_type") or ("movie" if item.get("title") else "tv")
            bind = bindings.get((media_type, tmdb_id), {})
            annotated.append({
                **item,
                "media_type": media_type,
                "in_library": bind.get("media_item_id") is not None,
                "media_item_id": bind.get("media_item_id"),
                "rating_imdb": bind.get("rating_imdb"),
                "rating_tmdb": bind.get("rating_tmdb") or item.get("vote_average"),
                "last_air_date": bind.get("last_air_date") or item.get("last_air_date"),
                "release_status": bind.get("release_status") or item.get("release_status"),
            })
        return annotated

    def _fetch_watchlist_tmdb_ids(self) -> List[int]:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            return []
        return [
            int(item.match.external_id) for item in watchlist.items
            if item.match and item.match.provider == Provider.TMDB and item.match.external_id.isdigit()
        ]

    def _resolve_local_recommendation_bindings(self, items: List[Dict[str, Any]]) -> Dict[tuple, Dict[str, Any]]:
        movie_ids = set()
        tv_ids = set()
        for item in items or []:
            tmdb_id = item.get("id")
            if not tmdb_id:
                continue
            media_type = item.get("media_type") or ("movie" if item.get("title") else "tv")
            if media_type == "tv":
                tv_ids.add(str(tmdb_id))
            else:
                movie_ids.add(str(tmdb_id))

        if not movie_ids and not tv_ids:
            return {}

        bindings = {}

        # 1. Query TV matches directly from metadata_matches table
        if tv_ids:
            tv_rows = self.db.query(
                MetadataMatch.external_id,
                MetadataMatch.rating_tmdb,
                MetadataMatch.rating_imdb,
                MetadataMatch.last_air_date,
                MetadataMatch.release_status
            ).filter(
                MetadataMatch.provider == Provider.TMDB,
                MetadataMatch.media_type == MediaType.TV,
                MetadataMatch.external_id.in_(tv_ids)
            ).all()
            for r in tv_rows:
                ext_id = int(r.external_id)
                bindings[("tv", ext_id)] = {
                    "media_item_id": ext_id,
                    "rating_imdb": r.rating_imdb,
                    "rating_tmdb": r.rating_tmdb,
                    "last_air_date": r.last_air_date.isoformat() if r.last_air_date else None,
                    "release_status": r.release_status,
                }

        # 2. Query Movie matches joined with MediaItem to verify active status
        if movie_ids:
            movie_rows = self.db.query(
                MediaItem.id,
                MetadataMatch.external_id,
                MetadataMatch.rating_tmdb,
                MetadataMatch.rating_imdb,
                MetadataMatch.release_status
            ).join(
                MetadataMatch, MetadataMatch.media_item_id == MediaItem.id
            ).filter(
                MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
                MetadataMatch.provider == Provider.TMDB,
                MetadataMatch.media_type == MediaType.MOVIE,
                MetadataMatch.external_id.in_(movie_ids)
            ).all()
            for r in movie_rows:
                ext_id = int(r.external_id)
                bindings[("movie", ext_id)] = {
                    "media_item_id": r.id,
                    "rating_imdb": r.rating_imdb,
                    "rating_tmdb": r.rating_tmdb,
                    "last_air_date": None,
                    "release_status": r.release_status,
                }

        return bindings
