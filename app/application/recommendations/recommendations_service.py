import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func

from app.shared_kernel.enums import Provider, MediaType, ItemStatus, CustomListType
from app.domains.users.models import User, CustomList, CustomListItem
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
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

    def _preferred_metadata_language(self) -> str:
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE


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

        filters = []
        if movie_ids:
            filters.append((MetadataMatch.provider == Provider.TMDB) & (MetadataMatch.external_id.in_(movie_ids)))
        if tv_ids:
            filters.append((MetadataMatch.provider == Provider.TMDB) & (MetadataMatch.external_id.in_(tv_ids)))

        rows = self.db.query(
            MediaItem.id,
            MetadataMatch.external_id,
            MetadataMatch.media_type,
            MetadataMatch.rating_tmdb,
            MetadataMatch.rating_imdb
        ).join(
            MetadataMatch, MetadataMatch.media_item_id == MediaItem.id
        ).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            or_(*filters)
        ).all()

        bindings = {}
        for r in rows:
            m_type = "tv" if r.media_type == MediaType.TV else "movie"
            bindings[(m_type, int(r.external_id))] = {
                "media_item_id": r.id,
                "rating_imdb": r.rating_imdb,
                "rating_tmdb": r.rating_tmdb,
            }
        return bindings

    def get_recommendations(self, language: Optional[str] = None) -> RecommendationsResponse:
        # 1. Fetch watchlist TMDB IDs
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        watchlist_tmdb_ids = []
        if watchlist:
            watchlist_tmdb_ids = [
                int(item.match.external_id) for item in watchlist.items
                if item.match and item.match.provider == Provider.TMDB and item.match.external_id.isdigit()
            ]

        pref_lang = language or self._preferred_metadata_language()

        # Fetch trending and popular items from TMDB via scraper API
        trending_movie = self.scraper.get_trending("movie", "day", language=pref_lang)
        trending_tv = self.scraper.get_trending("tv", "day", language=pref_lang)

        trending_results = trending_movie.get("results", [])[:10] + trending_tv.get("results", [])[:10]
        discover_movies = self.scraper.discover("movie", language=pref_lang, sort_by="popularity.desc").get("results", [])
        discover_tv = self.scraper.discover("tv", language=pref_lang, sort_by="popularity.desc").get("results", [])

        # Annotate items with library bindings
        bindings = self._resolve_local_recommendation_bindings(trending_results + discover_movies + discover_tv)

        def annotate(items):
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
                    "rating_imdb": bind.get("rating_imdb") or item.get("vote_average"),
                    "rating_tmdb": bind.get("rating_tmdb") or item.get("vote_average"),
                })
            return annotated

        return RecommendationsResponse(
            trending=annotate(trending_results),
            discover_movies=annotate(discover_movies),
            discover_tv=annotate(discover_tv),
            top_movie_genre="Action",
            top_tv_genre="Drama",
            watchlist_item_ids=watchlist_tmdb_ids
        )

    def add_to_watchlist(self, tmdb_id: int, media_type: str) -> ActionResponse:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            watchlist = CustomList(
                name="Watchlist",
                description="Default system watchlist.",
                list_type=CustomListType.MATCH,
                color="#3b82f6",
                icon="Bookmark"
            )
            self.db.add(watchlist)
            self.db.commit()

        # Ensure MetadataMatch placeholder
        match = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tmdb_id)
        ).first()

        if not match:
            match = MetadataMatch(
                provider=Provider.TMDB,
                external_id=str(tmdb_id),
                media_type=MediaType.MOVIE if media_type == "movie" else MediaType.TV
            )
            self.db.add(match)
            self.db.commit()

        # Add to watchlist if not already there
        exists = self.db.query(CustomListItem).filter(
            CustomListItem.list_id == watchlist.id,
            CustomListItem.match_id == match.id
        ).first()

        if not exists:
            item = CustomListItem(list_id=watchlist.id, match_id=match.id)
            self.db.add(item)
            self.db.commit()
            return ActionResponse(status="success", id=item.id)

        return ActionResponse(status="success", message="Already in watchlist")

    def remove_from_watchlist(self, tmdb_id: int) -> ActionResponse:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")

        match = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.external_id == str(tmdb_id)
        ).first()

        if match:
            self.db.query(CustomListItem).filter(
                CustomListItem.list_id == watchlist.id,
                CustomListItem.match_id == match.id
            ).delete()
            self.db.commit()
            return ActionResponse(status="success")

        return ActionResponse(status="error", message="Item not found in watchlist")

