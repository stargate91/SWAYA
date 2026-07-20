import logging
from typing import List, Dict, Any, Optional, Union
from sqlalchemy.orm import Session, aliased

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
            discover_stashdb=self._get_adult_discovery("stashdb") if include_adult else [],
            discover_fansdb=self._get_adult_discovery("fansdb") if include_adult else [],
            top_movie_genre="Action",
            top_tv_genre="Drama",
            watchlist_item_ids=watchlist_tmdb_ids,
            recently_added=recently_added,
            recently_activated_people=recently_activated_people
        )

    def add_to_watchlist(self, tmdb_id: Optional[Union[int, str]], media_type: str, media_item_id: Optional[int] = None) -> ActionResponse:
        # Get watchlist ID
        lists = self.lists_service.get_all_lists()
        watchlist = next((lst for lst in lists if lst.name == "Watchlist"), None)
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")
        
        payload = {"media_type": media_type}
        if media_item_id:
            payload["media_item_id"] = media_item_id
        else:
            payload["tmdb_id"] = tmdb_id

        item = self.lists_service.add_item_to_list(watchlist.id, payload)
        return ActionResponse(status="success", id=item.id)

    def remove_from_watchlist(self, tmdb_id: Union[int, str]) -> ActionResponse:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")
        
        provider = Provider.TMDB
        external_id = str(tmdb_id)
        if isinstance(tmdb_id, str) and "_" in tmdb_id:
            prefix, val = tmdb_id.split("_", 1)
            if prefix in ("porndb", "theporndb", "stash", "stashdb", "fansdb"):
                provider = Provider.PORNDB
                if prefix in ("stash", "stashdb"):
                    provider = Provider.STASHDB
                elif prefix == "fansdb":
                    provider = Provider.FANSDB
                external_id = val

        list_item_id = None
        for item in watchlist.items:
            if item.match and item.match.provider == provider and item.match.external_id == external_id:
                list_item_id = item.id
                break
            if item.media_item_id and str(item.media_item_id) == str(tmdb_id):
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

        # Deduplicate candidates in results_pool by ID
        seen_ids = set()
        deduped_results_pool = []
        for item in results_pool:
            tmdb_id = item.get("id")
            if tmdb_id not in seen_ids:
                seen_ids.add(tmdb_id)
                deduped_results_pool.append(item)
        results_pool = deduped_results_pool

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
        
        # Subquery: for each episode match, find the show-level external_id via parent chain
        # episode -> season (parent_id) -> show (parent_id)
        season_alias = aliased(MetadataMatch)
        show_alias = aliased(MetadataMatch)
        show_external_id_subq = self.db.query(
            show_alias.external_id
        ).join(
            season_alias, season_alias.parent_id == show_alias.id
        ).filter(
            season_alias.id == MetadataMatch.parent_id
        ).correlate(MetadataMatch).scalar_subquery()
        
        # Collapse TV episodes by their show external_id, other media by MediaItem.id
        group_key = case(
            (MetadataMatch.media_type == MediaType.EPISODE, show_external_id_subq),
            else_=func.cast(MediaItem.id, String)
        )
        
        filter_conds = [
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MetadataMatch.is_adult == include_adult,
            MetadataMatch.media_type.in_([MediaType.MOVIE, MediaType.EPISODE, MediaType.SCENE])
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
            selectinload(MediaItem.matches).selectinload(MetadataMatch.parent).selectinload(MetadataMatch.localizations),
            selectinload(MediaItem.matches).selectinload(MetadataMatch.parent).selectinload(MetadataMatch.parent).selectinload(MetadataMatch.localizations),
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
            
            loc = LanguageService.get_best_localization(show_match.localizations, pref_lang) if show_match.localizations else None
            title = loc.title if loc else (show_match.original_title or item.filename)
            overview = loc.overview if loc else None

            o_media = overrides_by_media.get(item.id)
            o_match = overrides_by_match.get(match.id)
            if not o_match and show_match != match:
                o_match = overrides_by_match.get(show_match.id)

            o = o_match or o_media
            user_rating = (o_match.user_rating if (o_match and o_match.user_rating is not None) else None) or (o_media.user_rating if (o_media and o_media.user_rating is not None) else None)
            is_favorite = (o_match.is_favorite if o_match else False) or (o_media.is_favorite if o_media else False)
                
            custom_poster = o.custom_poster if o else None
            custom_backdrop = o.custom_backdrop if o else None
            
            poster_path = custom_poster or (loc.poster_path if loc else None)
            backdrop_path = custom_backdrop or show_match.backdrop_path

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

            # Determine is_watched status
            is_watched = False
            if o_match and o_match.is_watched:
                is_watched = True
            elif o_media and o_media.is_watched:
                is_watched = True
            elif match.media_type == MediaType.EPISODE:
                # Check directly on the episode override
                is_watched = bool(o_media and o_media.is_watched)
            elif match.media_type == MediaType.TV or (match.media_type == MediaType.EPISODE and show_match != match):
                # Count total episodes and check how many are watched
                total_episodes_query = self.db.query(MetadataMatch.id).outerjoin(
                    parent_season, MetadataMatch.parent_id == parent_season.id
                ).filter(
                    MetadataMatch.media_type == MediaType.EPISODE,
                    or_(
                        MetadataMatch.parent_id == show_match.id,
                        parent_season.parent_id == show_match.id
                    )
                )
                total_episode_ids = [r[0] for r in total_episodes_query.all()]
                if total_episode_ids:
                    mapping_query = self.db.query(MetadataMatch.id, MetadataMatch.media_item_id).filter(
                        MetadataMatch.id.in_(total_episode_ids)
                    ).all()
                    match_to_media = {m_id: mi_id for m_id, mi_id in mapping_query}
                    media_ids_eps = [mi_id for mi_id in match_to_media.values() if mi_id is not None]
                    
                    overrides_eps = self.db.query(UserOverride).filter(
                        UserOverride.user_id == current_uid,
                        or_(
                            UserOverride.metadata_match_id.in_(total_episode_ids),
                            UserOverride.media_item_id.in_(media_ids_eps)
                        )
                    ).all()
                    
                    watched_matches = set()
                    watched_media = set()
                    for ov in overrides_eps:
                         if ov.is_watched:
                             if ov.metadata_match_id:
                                 watched_matches.add(ov.metadata_match_id)
                             if ov.media_item_id:
                                 watched_media.add(ov.media_item_id)
                    watched_count = 0
                    for ep_id in total_episode_ids:
                        media_id = match_to_media.get(ep_id)
                        if ep_id in watched_matches or (media_id is not None and media_id in watched_media):
                            watched_count += 1
                    is_watched = watched_count >= len(total_episode_ids)

            recently_added.append({
                "id": int(show_match.external_id) if show_match.external_id and show_match.external_id.isdigit() else item.id,
                "title": title,
                "name": title,
                "media_type": "tv" if match.media_type == MediaType.EPISODE else match.media_type.value,
                "in_library": True,
                "media_item_id": item.id,
                "is_adult": bool(match.is_adult),
                "rating_imdb": rating_imdb,
                "rating_tmdb": rating_tmdb,
                "rating_porndb": rating_porndb,
                "user_rating": user_rating,
                "is_favorite": is_favorite,
                "is_watched": is_watched,
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
        include_adult: Optional[bool] = None,
        gender: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if include_adult is None:
            include_adult_val = self.settings.get_setting("include_adult")
            include_adult = str(include_adult_val).lower() == "true"
            
        from sqlalchemy import desc
        from app.domains.people.models import Person
        
        offset = (page - 1) * limit
        
        query = self.db.query(Person).filter(
            Person.is_active,
            Person.is_adult == include_adult
        )
        
        effective_gender = gender
        if effective_gender is None and include_adult:
            effective_gender = self.settings.get_setting("adult_gender_preference")
            
        if effective_gender == "female":
            query = query.filter(Person.gender == 1)
        elif effective_gender == "male":
            query = query.filter(Person.gender == 2)
            
        recent_people = query.order_by(desc(Person.id)).offset(offset).limit(limit).all()
        
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
                "user_rating": o.user_rating if o else None,
                "is_favorite": o.is_favorite if o else False,
            })
        return recently_activated_people

    def _get_adult_discovery(self, provider: str) -> List[Dict[str, Any]]:
        api_key = self.settings.get_setting(f"{provider}_api_key")
        if not api_key:
            return []

        from app.infrastructure.cache.cache_service import CacheService
        from app.shared_kernel.enums import Provider as ProviderEnum, MediaType
        from app.domains.metadata.models import MetadataMatch
        cache_srv = CacheService()
        
        provider_enum = ProviderEnum(provider.lower())
        cache_key = f"adult_discovery_{provider}"
        
        # Try to load from cache
        cached_data = cache_srv.get(provider_enum, cache_key)
        
        raw_scenes = []
        if cached_data and isinstance(cached_data, dict) and "scenes" in cached_data:
            raw_scenes = cached_data["scenes"]
        else:
            # Query trending scenes from the scraper gateway
            from app.infrastructure.scrapers.support.gateway import scraper_gateway
            try:
                scraper = scraper_gateway.adult(provider_enum, self.db)
            except Exception as e:
                logger.error(f"Failed to get {provider} scraper: {e}")
                return []

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
                  tags {
                    id
                    name
                  }
                  performers {
                    performer {
                      id
                      name
                      gender
                    }
                  }
                }
              }
            }
            """
            variables = {
                "input": {
                  "page": 1,
                  "per_page": 100,
                  "direction": "DESC",
                  "sort": "TRENDING"
                }
            }
            
            try:
                res_data = scraper.execute_query(query, variables)
                if res_data and "queryScenes" in res_data:
                    raw_scenes = res_data["queryScenes"].get("scenes") or []
                    # Cache the raw list of scenes (expired in 24 hours)
                    cache_srv.set(provider_enum, cache_key, {"scenes": raw_scenes}, ttl_seconds=86400)
            except Exception as e:
                logger.error(f"Failed to query discovery from {provider}: {e}")
                return []

        if not raw_scenes:
            return []

        # 1. Fetch user's local tag preferences using TF-IDF weighted scoring
        import math
        import json as _json
        tag_weights = {}
        # Tags that describe appearance/demographics/meta — not actual content preferences
        noise_keywords = {
            # Hair
            "brown hair", "blond hair", "blonde hair", "black hair", "red hair",
            "brunette", "blonde", "brown hair (female)", "brown hair (male)",
            "blond hair (female)", "black hair (female)", "red hair (female)",
            "long hair", "short hair", "straight hair", "wavy hair", "curly hair",
            # Body descriptors
            "tattoos", "tattoo", "piercings", "piercing", "nose piercing", "navel piercing",
            "natural tits", "fake boobs", "big tits", "small tits", "big breasts", "medium tits",
            "big ass", "small ass", "medium ass", "athletic", "athletic woman", "slim",
            "shaved", "hairy", "tall", "short", "petite", "chubby", "bbw", "average body",
            "big dick", "innie pussy", "outie pussy", "hairless pussy", "trimmed pussy",
            "tan lines", "freckles", "gauges",
            # Eye color
            "brown eyes", "blue eyes", "green eyes", "hazel eyes",
            # Skin/ethnicity/nationality
            "white woman", "white man", "pale skin", "medium skin", "dark skin",
            "american", "european", "latina woman", "asian", "asian woman",
            # Production/meta
            "hd available", "4k available",
            "indoors", "outdoors", "professional production", "pornstar",
            "bedroom", "living room", "home", "bathroom",
            "nude", "barefoot", "no bra", "no condom",
            # Clothing that's not a preference
            "panties", "thong", "lingerie", "dress", "skirt", "short skirt",
            "tank top", "strapless top", "blouse", "sandals", "casual wear",
            "stockings", "choker", "necklace", "headband", "leash", "bondage collar",
            # Gender labels
            "male - pov", "straight", "twosome",
            # Too generic
            "narrative", "3rd person narrative", "taboo",
            "step brother", "step sister",
            # Height/body variants with gender suffix
            "short woman", "tall woman", "short man", "tall man",
            # Hair (male)
            "short hair (male)", "bald (male)",
            # Footwear/accessories
            "woman's heels", "high heels", "boots", "sneakers",
            # Generic sex position labels that are too broad
            "twosome (straight)", "threesome (bgg)", "threesome (bbg)",
            # Caught/voyeur meta
            "caught", "voyeur",
            # Age bracket labels
            "teen (18-22)", "teen girl (18-22)", "teen boy (18-22)", "milf (30+)",
            # Other noise
            "orgasm", "kissing", "rubbing", "moaning", "dirty talk",
            "cum in mouth", "cum swapping", "swallowing",
            "adorable", "slutty", "upskirt",
            "puppy play", "breast play", "dick play",
            "missing performer (male)",
        }
        try:
            from sqlalchemy import text
            from collections import Counter

            # Build tag frequency from metadata_matches.suggested_tags
            tag_counter = Counter()
            tag_rating_sum = {}
            tag_rating_count = {}
            total_scenes = 0

            sql = """
                SELECT mm.suggested_tags, uo.user_rating
                FROM metadata_matches mm
                LEFT JOIN user_overrides uo ON uo.media_item_id = mm.media_item_id
                WHERE mm.is_adult = 1
                  AND mm.suggested_tags IS NOT NULL
                  AND mm.media_item_id IS NOT NULL
            """
            rows = self.db.execute(text(sql)).fetchall()
            for r in rows:
                total_scenes += 1
                tags_json = r[0]
                user_rating = r[1]
                tags = _json.loads(tags_json) if tags_json else []
                for tag in tags:
                    t_name = (tag.get("name") if isinstance(tag, dict) else str(tag)).lower()
                    if t_name:
                        tag_counter[t_name] += 1
                        if user_rating is not None:
                            tag_rating_sum[t_name] = tag_rating_sum.get(t_name, 0) + user_rating
                            tag_rating_count[t_name] = tag_rating_count.get(t_name, 0) + 1

            # Frequency-based: high library count = strong preference
            # Noise is handled by the noise_keywords set, not by IDF
            for t_name, count in tag_counter.items():
                if t_name in noise_keywords:
                    continue  # Skip noise entirely
                avg_rating = (tag_rating_sum.get(t_name, 0) / tag_rating_count[t_name]) if tag_rating_count.get(t_name) else 4.0
                weight = math.log2(1 + count) * avg_rating
                if weight > 0:
                    tag_weights[t_name] = weight

            # Keep only top 50 signal tags for scoring
            if len(tag_weights) > 50:
                top_entries = sorted(tag_weights.items(), key=lambda x: x[1], reverse=True)[:50]
                tag_weights = dict(top_entries)

        except Exception as e:
            logger.error(f"Failed to fetch library tag weights: {e}")

        # 2. Fetch local library matches for this provider to filter out already owned scenes
        matches = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == provider_enum,
            MetadataMatch.media_item_id.isnot(None)
        ).all()
        in_library_ids = {m.external_id for m in matches}

        # 3. Filter and score scenes
        scored_scenes = []
        for s in raw_scenes:
            sid = s.get("id")
            if not sid or sid in in_library_ids:
                continue

            # Calculate preference score: sum of matching signal-tag weights
            scene_tags = s.get("tags") or []
            score = 0
            for t_item in scene_tags:
                t_name = t_item.get("name") if isinstance(t_item, dict) else t_item
                if t_name:
                    score += tag_weights.get(t_name.lower(), 0)

            scored_scenes.append((score, s))

        # Sort by score desc
        scored_scenes.sort(key=lambda x: x[0], reverse=True)
        top_scenes = [item[1] for item in scored_scenes[:20]]

        # 4. Map to RecommendationItem schema format
        # Build external-ID → local Person ID lookup for performer links
        all_performer_ids = set()
        for s in top_scenes:
            for p_outer in (s.get("performers") or []):
                p = p_outer.get("performer")
                if p and p.get("id"):
                    all_performer_ids.add(p["id"])

        ext_to_local = {}
        if all_performer_ids:
            try:
                from app.domains.people.models import ExternalSourceLink
                links = self.db.query(
                    ExternalSourceLink.person_id,
                    ExternalSourceLink.external_id
                ).filter(
                    ExternalSourceLink.provider == provider_enum,
                    ExternalSourceLink.external_id.in_(list(all_performer_ids))
                ).all()
                for person_id, external_id in links:
                    ext_to_local[str(external_id)] = person_id
            except Exception as e:
                logger.error(f"Failed to query ExternalSourceLink for discovery lookup: {e}")

        result = []
        from app.domains.media_assets.services.images import image_processing_service
        for s in top_scenes:
            images = s.get("images") or []
            poster_url = images[0].get("url") if images else None
            img_width = images[0].get("width") if images else None
            img_height = images[0].get("height") if images else None
            
            resolved_img = image_processing_service.resolve_image_url(poster_url, "posters") if poster_url else None
            
            studio_name = s.get("studio", {}).get("name") if s.get("studio") else None
            
            performers_list = []
            raw_performers = s.get("performers") or []
            for p_outer in raw_performers:
                p = p_outer.get("performer")
                if p:
                    p_gender = p.get("gender")
                    gender_int = None
                    if p_gender:
                        p_gender_str = str(p_gender).upper()
                        gender_int = 1 if "FEMALE" in p_gender_str else (2 if "MALE" in p_gender_str else None)
                    ext_id = str(p.get("id", ""))
                    local_id = ext_to_local.get(ext_id)
                    performers_list.append({
                        "id": local_id if local_id is not None else f"{provider}:{ext_id}",
                        "name": p.get("name"),
                        "gender": gender_int,
                    })
            
            result.append({
                "id": s.get("id"),
                "title": s.get("title") or "Unknown",
                "media_type": "scene",
                "in_library": False,
                "media_item_id": None,
                "poster_path": resolved_img,
                "backdrop_path": resolved_img,
                "release_date": s.get("date"),
                "overview": studio_name,
                "is_adult": True,
                "image_width": img_width,
                "image_height": img_height,
                "people": performers_list,
                "source": provider,
            })
            
        return result

