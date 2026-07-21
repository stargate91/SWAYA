import logging
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.enums import MediaType, Provider
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE

logger = logging.getLogger(__name__)


class TmdbRecommendationService:
    def __init__(self, db: Session, scraper, settings_port):
        self.db = db
        self.scraper = scraper
        self.settings = settings_port

    def _preferred_metadata_language(self) -> str:
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE

    def annotate_recommendations(
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

    def resolve_local_recommendation_bindings(self, items: List[Dict[str, Any]]) -> Dict[tuple, Dict[str, Any]]:
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
        if tv_ids:
            # Query local TV shows matching these TMDB IDs
            tv_rows = self.db.query(
                MetadataMatch.external_id,
                MediaItem.id,
                MetadataMatch.rating_imdb,
                MetadataMatch.rating_tmdb,
                MetadataMatch.last_air_date,
                MetadataMatch.release_status
            ).outerjoin(
                MediaItem, MediaItem.id == MetadataMatch.media_item_id
            ).filter(
                MetadataMatch.provider == Provider.TMDB,
                MetadataMatch.media_type == MediaType.TV,
                MetadataMatch.external_id.in_(tv_ids)
            ).all()
            for r in tv_rows:
                ext_id = int(r.external_id)
                bindings[("tv", ext_id)] = {
                    "media_item_id": r.id,
                    "rating_imdb": r.rating_imdb,
                    "rating_tmdb": r.rating_tmdb,
                    "last_air_date": r.last_air_date,
                    "release_status": r.release_status,
                }

        if movie_ids:
            # Query local movies matching these TMDB IDs
            movie_rows = self.db.query(
                MetadataMatch.external_id,
                MediaItem.id,
                MetadataMatch.rating_imdb,
                MetadataMatch.rating_tmdb,
                MetadataMatch.release_status
            ).outerjoin(
                MediaItem, MediaItem.id == MetadataMatch.media_item_id
            ).filter(
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

    def discover_top_items(
        self,
        genre_id: Optional[int] = None,
        year: Optional[int] = None,
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        pref_lang = language or self._preferred_metadata_language()
        include_adult_val = self.settings.get_setting("include_adult")
        include_adult = str(include_adult_val).lower() == "true"
        
        # Fetch 3 pages of popular candidates for the genre/year (60 items total)
        results_pool = []
        for page in (1, 2, 3):
            try:
                res = self.scraper.discover(
                    "movie",
                    language=pref_lang,
                    sort_by="popularity.desc",
                    include_adult=include_adult,
                    with_genres=str(genre_id) if genre_id else None,
                    primary_release_year=year,
                    page=page
                )
                items = res.get("results", [])
                if not items:
                    break
                results_pool.extend(items)
            except Exception as e:
                logger.error(f"Failed to discover top items page {page}: {e}")
                break

        # Deduplicate candidates in results_pool by ID
        seen_ids = set()
        deduped_results_pool = []
        for item in results_pool:
            tmdb_id = item.get("id")
            if tmdb_id not in seen_ids:
                seen_ids.add(tmdb_id)
                deduped_results_pool.append(item)
        results_pool = deduped_results_pool

        bindings = self.resolve_local_recommendation_bindings(results_pool)
        
        def is_in_library(item):
            tmdb_id = item.get("id")
            if not tmdb_id:
                return False
            media_type = item.get("media_type") or ("movie" if item.get("title") else "tv")
            bind = bindings.get((media_type, tmdb_id), {})
            return bind.get("media_item_id") is not None

        # Filter out items that are already in the library
        filtered_results = [item for item in results_pool if not is_in_library(item)]

        # Score remaining items locally: vote_average * log10(vote_count + 1)
        def get_compound_score(item):
            vote_avg = float(item.get("vote_average") or 0.0)
            vote_cnt = int(item.get("vote_count") or 0)
            return vote_avg * math.log10(vote_cnt + 1)

        filtered_results.sort(key=get_compound_score, reverse=True)
        top_results = filtered_results[:20]
            
        return self.annotate_recommendations(top_results, bindings)
