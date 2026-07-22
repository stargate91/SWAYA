import logging
from typing import List, Optional, Any
from sqlalchemy.orm import Session, joinedload

from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride
from app.modules.people.services.people_library_service import PeopleLibraryService
from app.core.enums import ItemStatus, MediaType
from app.modules.library.schemas import (
    ContinueWatchingItem,
    LibraryTabResponse,
    GroupedLibraryResponse,
)
from app.modules.library.services.listing.filter_params import ListingFilterParams
from app.modules.library.services.listing.query_builders import (
    MovieQueryBuilder,
    TvQueryBuilder,
    SceneQueryBuilder,
    PeopleQueryBuilder,
)




logger = logging.getLogger(__name__)

class LibraryListingService:
    def __init__(self, db_session: Session, resolver: Optional[Any] = None, settings: Optional[Any] = None, active_sessions: Optional[set[int]] = None):
        self.db = db_session
        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            resolver = MediaItemService(db_session)
        self.resolver = resolver
        self.settings = settings
        self.active_sessions = active_sessions

    def get_continue_watching(self, limit: int = 12, include_adult: bool = False) -> List[ContinueWatchingItem]:
        """
        Retrieves the queue of items currently being watched by the user, ordered by watch date.
        """
        query = self.db.query(UserOverride).join(
            MediaItem, UserOverride.media_item_id == MediaItem.id
        ).outerjoin(
            MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id) & (MetadataMatch.is_active)
        ).filter(
            UserOverride.resume_position > 0,
            (UserOverride.is_watched == False) | (UserOverride.is_watched.is_(None))
        ).options(
            joinedload(UserOverride.media_item).joinedload(MediaItem.matches).joinedload(MetadataMatch.localizations),
            joinedload(UserOverride.media_item).joinedload(MediaItem.matches).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.localizations)
        )
        if include_adult:
            query = query.filter(MetadataMatch.is_adult == True)
        else:
            query = query.filter((MetadataMatch.id.is_(None)) | (MetadataMatch.is_adult == False) | (MetadataMatch.is_adult.is_(None)))

        overrides = query.order_by(UserOverride.last_watched_at.desc()).limit(limit).all()

        from app.core.language import get_user_ui_language
        from app.core.language import LanguageService
        ui_lang = get_user_ui_language(self.settings)

        results = []
        for o in overrides:
            item = o.media_item
            match = next((m for m in item.matches if m.is_active), None) if item else None
            if not match and item and item.matches:
                match = item.matches[0]
            loc = LanguageService.get_best_localization(match.localizations, ui_lang) if match and match.localizations else None
            
            title = o.custom_title if o.custom_title else (loc.title if loc else item.filename)
            tv_title = None
            episode_title = None
            tv_tmdb_id = None
            
            if match and match.media_type == MediaType.EPISODE:
                episode_title = title
                tv_match = None
                if match.parent and match.parent.parent:
                    tv_match = match.parent.parent
                elif match.parent:
                    tv_match = match.parent
                
                if tv_match:
                    tv_override = self.db.query(UserOverride).filter(
                        UserOverride.metadata_match_id == tv_match.id,
                        UserOverride.user_id == o.user_id
                    ).first()
                    tv_loc = tv_match.localizations[0] if tv_match.localizations else None
                    tv_title = (tv_override.custom_title if (tv_override and tv_override.custom_title) else None) or (tv_loc.title if tv_loc else None)
                    tv_tmdb_id = int(tv_match.external_id) if tv_match.external_id.isdigit() else None
            active_set = self.active_sessions or set()
            is_active = item.id in active_set if item else False

            def get_first_int(val):
                if val is None:
                    return None
                if isinstance(val, (int, float)):
                    return int(val)
                if isinstance(val, list):
                    return get_first_int(val[0]) if val else None
                if isinstance(val, str):
                    if val.isdigit():
                        return int(val)
                    import json
                    try:
                        parsed = json.loads(val)
                        if isinstance(parsed, list):
                            return get_first_int(parsed[0]) if parsed else None
                        return int(parsed)
                    except Exception as e:
                        logger.debug(f"Swallowed exception in app/modules/library/services/library_listing_service.py:100: {e}", exc_info=True)
                return None

            rp = int(o.resume_position) if o.resume_position else 0
            dur = int(item.duration) if (item and item.duration) else 0
            prog = round((rp / dur) * 100, 1) if dur > 0 else 0.0
            prog = min(100.0, prog)
            rem = max(0, dur - rp) if dur > 0 else 0

            from app.core.episode_utils import format_episode_code
            disp_code = format_episode_code(match.season_number, match.episode_number) if (match and match.media_type.value == "episode") else None

            results.append(ContinueWatchingItem(
                id=item.id,
                title=title,
                tv_title=tv_title,
                episode_title=episode_title,
                type=match.media_type.value if match else "movie",
                season_number=get_first_int(match.season_number) if match else None,
                episode_number=get_first_int(match.episode_number) if match else None,
                tv_tmdb_id=tv_tmdb_id,
                tmdb_id=int(match.external_id) if (match and match.external_id.isdigit()) else None,
                backdrop_path=match.backdrop_path if match else None,
                still_path=match.still_path if match else None,
                resume_position=rp,
                duration=dur,
                progress_percent=prog,
                time_remaining_seconds=rem,
                is_watched=o.is_watched,
                last_watched_at=o.last_watched_at.isoformat() if o.last_watched_at else None,
                is_active=is_active,
                display_episode_code=disp_code,
            ))
        return results

    def _get_tab_counts(self, include_adult: bool) -> dict:
        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]
        
        movies_cnt_query = self.db.query(MediaItem).select_from(MediaItem).join(MetadataMatch).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.MOVIE,
            MetadataMatch.is_active,
            MetadataMatch.is_adult == include_adult
        )
        
        scenes_cnt_query = self.db.query(MediaItem).select_from(MediaItem).join(MetadataMatch).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.SCENE,
            MetadataMatch.is_active,
            MetadataMatch.is_adult == include_adult,
        )

        videos_cnt_query = self.db.query(MediaItem).select_from(MediaItem).join(MetadataMatch).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.VIDEO,
            MetadataMatch.is_active,
            MetadataMatch.is_adult == include_adult,
        )
        
        # Unique TV shows count
        parent_ids = set()
        current_parents = {
            r[0] for r in self.db.query(MetadataMatch.parent_id).join(
                MediaItem, MetadataMatch.media_item_id == MediaItem.id
            ).filter(MediaItem.status.in_(lib_statuses), MetadataMatch.parent_id.isnot(None)).all()
        }
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents),
                    MetadataMatch.parent_id.isnot(None)
                ).all()
            }
        tv_shows_count = self.db.query(MetadataMatch).filter(
            MetadataMatch.id.in_(parent_ids),
            MetadataMatch.media_type == MediaType.TV,
            MetadataMatch.is_active,
            MetadataMatch.is_adult == include_adult
        ).count()
        
        # People count
        people_service = PeopleLibraryService(self.db, resolver=self.resolver)
        people_items = people_service.get_people_group(
            role="all",
            filter_status="active",
            tab="adult_people" if include_adult else "people",
            include_adult=include_adult,
        )
        if include_adult and people_items:
            gender_pref = self.settings.get_setting("adult_gender_preference") or "all"
            if gender_pref == "female":
                people_items = [p for p in people_items if p.gender == 1]
            elif gender_pref == "male":
                people_items = [p for p in people_items if p.gender == 2]
        people_count = len(people_items) if people_items else 0
        
        # Collections count
        settings = self.settings
        collection_mode = settings.get_setting("folder_collection_mode")
        threshold = settings.get_setting("folder_collection_threshold")
        create_collection_dir = settings.get_setting("folder_create_collection_dir")

        if not collection_mode:
            if create_collection_dir is False:
                collection_mode = "never"
            else:
                collection_mode = "threshold"

        try:
            threshold = max(1, int(threshold or 3))
        except (TypeError, ValueError):
            threshold = 3

        if collection_mode == "never":
            col_cnt = 0
        else:
            from sqlalchemy import func
            min_count = threshold if collection_mode == "threshold" else 1
            col_cnt = self.db.query(MetadataMatch.collection_id).join(
                MediaItem, MetadataMatch.media_item_id == MediaItem.id
            ).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.media_type == MediaType.MOVIE,
                MetadataMatch.is_active,
                MetadataMatch.collection_id.isnot(None),
                MetadataMatch.is_adult == include_adult
            ).group_by(MetadataMatch.collection_id).having(func.count(MediaItem.id) >= min_count).count()

        if include_adult:
            return {
                "adult": movies_cnt_query.count(),
                "adult_tv": tv_shows_count,
                "adult_scenes": scenes_cnt_query.count(),
                "adult_videos": videos_cnt_query.count(),
                "adult_people": people_count,
                "adult_collections": col_cnt,
            }
        else:
            return {
                "movies": movies_cnt_query.count(),
                "tv": tv_shows_count,
                "scenes": scenes_cnt_query.count(),
                "videos": videos_cnt_query.count(),
                "people": people_count,
                "collections": col_cnt,
            }

    def get_library_tab_page(
        self,
        tab: str,
        page: int = 1,
        page_size: int = 40,
        sort_by: str = "title_asc",
        search: str = "",
        selected_tags: Optional[List[str]] = None,
        selected_genre: Optional[str] = None,
        selected_decade: Optional[str] = None,
        selected_year: Optional[int] = None,
        filter_favorite: str = "all",
        filter_watched: str = "all",
        filter_ownership: str = "owned",
        filter_status: str = "active",
        filter_gender: str = "all",
        people_role: str = "all",
        include_adult: bool = False,
        selected_performer_id: Optional[int] = None,
        selected_studio_id: Optional[int] = None,
        selected_network_id: Optional[int] = None,
        filter_hair_color: Optional[str] = None,
        filter_ethnicity: Optional[str] = None,
        filter_eye_color: Optional[str] = None,
        filter_tattoos: Optional[str] = None,
        filter_piercings: Optional[str] = None,
        filter_breast_type: Optional[str] = None,
        filter_breast_size: Optional[str] = None,
        filter_butt_shape: Optional[str] = None,
        filter_butt_size: Optional[str] = None,
        filter_rating: str = "all",
    ) -> LibraryTabResponse:
        """
        Retrieves a paginated, filtered, and sorted list of library items for a specific UI tab.
        """
        params = ListingFilterParams(
            tab=tab,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            search=search,
            selected_tags=selected_tags,
            selected_genre=selected_genre,
            selected_decade=selected_decade,
            selected_year=selected_year,
            filter_favorite=filter_favorite,
            filter_watched=filter_watched,
            filter_ownership=filter_ownership,
            filter_status=filter_status,
            filter_gender=filter_gender,
            people_role=people_role,
            include_adult=include_adult,
            selected_performer_id=selected_performer_id,
            selected_studio_id=selected_studio_id,
            selected_network_id=selected_network_id,
            filter_hair_color=filter_hair_color,
            filter_ethnicity=filter_ethnicity,
            filter_eye_color=filter_eye_color,
            filter_tattoos=filter_tattoos,
            filter_piercings=filter_piercings,
            filter_breast_type=filter_breast_type,
            filter_breast_size=filter_breast_size,
            filter_butt_shape=filter_butt_shape,
            filter_butt_size=filter_butt_size,
            filter_rating=filter_rating,
        )

        if tab in ("people", "adult_people"):
            builder = PeopleQueryBuilder(self.db, resolver=self.resolver)
            total_items, formatted_items = builder.query_people(params)
        else:
            if tab in ("tv", "adult_tv"):
                builder = TvQueryBuilder(self.db)
            elif tab in ("scenes", "adult_scenes"):
                builder = SceneQueryBuilder(self.db)
            elif tab in ("videos", "adult_videos"):
                from app.modules.library.services.listing.builders.video import VideoQueryBuilder
                builder = VideoQueryBuilder(self.db)
            else:
                builder = MovieQueryBuilder(self.db)

            _query, total_items, items = builder.build_query(params)
            formatted_items = builder.format_results(items)

        total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1
        counts = self._get_tab_counts(include_adult)

        return LibraryTabResponse(
            tab=tab,
            items=formatted_items,
            counts=counts,
            owned_counts=counts,
            total_items=total_items,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def get_grouped_library(self, include_adult: bool = False) -> GroupedLibraryResponse:
        """
        Returns a grouped snapshot of library items (movies, tv shows, adult scenes).
        """
        res_movies = self.get_library_tab_page("movies", page_size=20, include_adult=include_adult)
        res_tv = self.get_library_tab_page("tv", page_size=20, include_adult=include_adult)
        res_scenes = self.get_library_tab_page("scenes", page_size=20, include_adult=include_adult) if include_adult else LibraryTabResponse(
            tab="scenes", items=[], counts=res_movies.counts, owned_counts=res_movies.counts, total_items=0, page=1, page_size=20, total_pages=1
        )
        
        return GroupedLibraryResponse(
            movies=res_movies.items,
            tv=res_tv.items,
            scenes=res_scenes.items,
            people=[],
            counts=res_movies.counts
        )
