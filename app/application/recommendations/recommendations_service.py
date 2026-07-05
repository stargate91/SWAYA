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

    def get_recommendations(self, language: Optional[str] = None, include_adult: Optional[bool] = None) -> RecommendationsResponse:
        watchlist_tmdb_ids = self._fetch_watchlist_tmdb_ids()
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
        bindings = self._resolve_local_recommendation_bindings(all_candidates)

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
            return self._annotate_recommendations(items, bindings)

        return RecommendationsResponse(
            trending=annotate(trending_results),
            discover_movies=annotate(clean_discover_movies),
            discover_tv=annotate(clean_discover_tv),
            discover_adult=annotate(clean_discover_adult),
            top_movie_genre="Action",
            top_tv_genre="Drama",
            watchlist_item_ids=watchlist_tmdb_ids,
            recently_added=recently_added,
            recently_activated_people=recently_activated_people
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

        bindings = self._resolve_local_recommendation_bindings(results_pool)
        
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
        import math
        def get_compound_score(item):
            vote_avg = float(item.get("vote_average") or 0.0)
            vote_cnt = int(item.get("vote_count") or 0)
            return vote_avg * math.log10(vote_cnt + 1)

        filtered_results.sort(key=get_compound_score, reverse=True)
        top_results = filtered_results[:20]
            
        return self._annotate_recommendations(top_results, bindings)

    def get_recently_added_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        include_adult: Optional[bool] = None,
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        pref_lang = language or self._preferred_metadata_language()
        if include_adult is None:
            include_adult_val = self.settings.get_setting("include_adult")
            include_adult = str(include_adult_val).lower() == "true"
            
        from sqlalchemy import desc, case, String, func
        from sqlalchemy.orm import selectinload
        from app.shared_kernel.language import LanguageService
        
        offset = (page - 1) * limit
        
        # Collapse TV shows by external_id (TMDB TV ID), other media by MediaItem.id
        group_key = case(
            (MetadataMatch.media_type == MediaType.TV, MetadataMatch.external_id),
            else_=func.cast(MediaItem.id, String)
        )
        
        filter_conds = [
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MetadataMatch.is_adult == include_adult,
            MetadataMatch.media_type.in_([MediaType.MOVIE, MediaType.TV, MediaType.SCENE])
        ]
            
        recent_matches = self.db.query(
            func.max(MediaItem.id).label("max_media_id"),
            group_key.label("collapsed_key")
        ).join(
            MetadataMatch, MetadataMatch.media_item_id == MediaItem.id
        ).filter(
            *filter_conds
        ).group_by(
            "collapsed_key"
        ).order_by(
            desc("max_media_id")
        ).offset(offset).limit(limit).all()

        if not recent_matches:
            return []
            
        from app.domains.people.models import MediaPersonLink
        media_ids = [r.max_media_id for r in recent_matches]
        recent_media = self.db.query(MediaItem).filter(
            MediaItem.id.in_(media_ids)
        ).options(
            selectinload(MediaItem.matches).selectinload(MetadataMatch.localizations),
            selectinload(MediaItem.matches).selectinload(MetadataMatch.parent).selectinload(MetadataMatch.parent),
            selectinload(MediaItem.matches).selectinload(MetadataMatch.people_links).selectinload(MediaPersonLink.person)
        ).all()
        
        # Sort in python to match query order
        media_id_to_index = {mid: idx for idx, mid in enumerate(media_ids)}
        recent_media.sort(key=lambda item: media_id_to_index.get(item.id, 999))

        from sqlalchemy import or_
        from app.domains.users.models import UserOverride
        from app.shared_kernel.user_context import get_current_user_id
        current_uid = get_current_user_id() or 1
        
        # Collect match IDs to resolve overrides linked by metadata_match_id
        match_ids = []
        for item in recent_media:
            for m in item.matches:
                match_ids.append(m.id)
                if m.parent_id:
                    match_ids.append(m.parent_id)
                    if m.parent and m.parent.parent_id:
                        match_ids.append(m.parent.parent_id)

        overrides = self.db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            or_(
                UserOverride.media_item_id.in_(media_ids),
                UserOverride.metadata_match_id.in_(match_ids)
            )
        ).all()
        overrides_by_media = {o.media_item_id: o for o in overrides if o.media_item_id}
        overrides_by_match = {o.metadata_match_id: o for o in overrides if o.metadata_match_id}

        recently_added = []
        for item in recent_media:
            match = next((m for m in item.matches if m.is_adult == include_adult), None)
            if not match:
                continue
            
            loc = LanguageService.get_best_localization(match.localizations, pref_lang) if match.localizations else None
            title = loc.title if loc else (match.original_title or item.filename)
            overview = loc.overview if loc else None

            # Resolve parent show match for TV shows / episodes to get show-level metadata
            show_match = match
            if match.media_type.value == "episode":
                if match.parent and match.parent.parent:
                    show_match = match.parent.parent
                elif match.parent:
                    show_match = match.parent
            elif match.media_type.value == "season":
                if match.parent:
                    show_match = match.parent

            o = overrides_by_media.get(item.id) or overrides_by_match.get(match.id)
            if not o and show_match != match:
                o = overrides_by_match.get(show_match.id)
                
            custom_poster = o.custom_poster if o else None
            custom_backdrop = o.custom_backdrop if o else None
            
            poster_path = custom_poster or (loc.poster_path if loc else None)
            backdrop_path = custom_backdrop or match.backdrop_path

            rating_imdb = show_match.rating_imdb
            rating_tmdb = show_match.rating_tmdb
            rating_porndb = show_match.rating_porndb
            
            release_date = show_match.release_date.isoformat() if show_match.release_date else None
            first_air_date = show_match.release_date.isoformat() if show_match.release_date else None
            last_air_date = show_match.last_air_date.isoformat() if show_match.last_air_date else None
            release_status = show_match.release_status
            
            people_list = []
            if match.people_links:
                for link in match.people_links:
                    if link.person:
                        people_list.append({
                            "id": link.person.id,
                            "name": link.person.name,
                            "gender": link.person.gender,
                        })

            recently_added.append({
                "id": int(match.external_id) if match.external_id and match.external_id.isdigit() else item.id,
                "title": title,
                "name": title,
                "media_type": match.media_type.value,
                "in_library": True,
                "media_item_id": item.id,
                "rating_imdb": rating_imdb,
                "rating_tmdb": rating_tmdb,
                "rating_porndb": rating_porndb,
                "poster_path": poster_path,
                "backdrop_path": backdrop_path,
                "release_date": release_date,
                "first_air_date": first_air_date,
                "last_air_date": last_air_date,
                "release_status": release_status,
                "overview": overview,
                "people": people_list,
            })
        return recently_added

    def get_recently_activated_people_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        include_adult: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        if include_adult is None:
            include_adult_val = self.settings.get_setting("include_adult")
            include_adult = str(include_adult_val).lower() == "true"
            
        from sqlalchemy import desc
        from app.domains.people.models import Person
        
        offset = (page - 1) * limit
        
        recent_people = self.db.query(Person).filter(
            Person.is_active == True,
            Person.is_adult == include_adult
        ).order_by(desc(Person.id)).offset(offset).limit(limit).all()
        
        from app.domains.users.models import UserOverride
        from app.shared_kernel.user_context import get_current_user_id
        current_uid = get_current_user_id() or 1
        
        person_ids = [p.id for p in recent_people]
        overrides = self.db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            UserOverride.person_id.in_(person_ids)
        ).all()
        overrides_dict = {o.person_id: o for o in overrides if o.person_id}

        recently_activated_people = []
        for p in recent_people:
            o = overrides_dict.get(p.id)
            custom_profile = o.custom_poster if o else None
            
            profile_path = custom_profile or p.local_profile_path or p.profile_path
            
            recently_activated_people.append({
                "id": p.id,
                "name": p.name,
                "profile_path": profile_path,
                "local_profile_path": p.local_profile_path,
                "is_adult": p.is_adult,
                "is_active": p.is_active,
                "scene_count": p.scene_count,
                "popularity": p.popularity,
                "known_for_department": p.known_for_department,
            })
        return recently_activated_people
