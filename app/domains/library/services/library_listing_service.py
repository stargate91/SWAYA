import logging
from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy import func, or_, and_, desc
from sqlalchemy.orm import Session, selectinload, joinedload

from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch, MetadataLocalization
from app.domains.users.models import UserOverride, Tag, user_override_tags
from app.domains.people.models import MediaPersonLink
from app.domains.people.services.people_library_service import PeopleLibraryService
from app.shared_kernel.enums import ItemStatus, MediaType, Provider
from app.shared_kernel.user_context import get_current_user_id
from app.domains.library.schemas import (
    ContinueWatchingItem,
    LibraryTabResponse,
    GroupedLibraryResponse,
)

logger = logging.getLogger(__name__)

class LibraryListingService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_continue_watching(self, limit: int = 12, include_adult: bool = False) -> List[ContinueWatchingItem]:
        """
        Retrieves the queue of items currently being watched by the user, ordered by watch date.
        """
        query = self.db.query(UserOverride).join(
            MediaItem, UserOverride.media_item_id == MediaItem.id
        ).join(
            MetadataMatch, UserOverride.metadata_match_id == MetadataMatch.id
        ).filter(
            UserOverride.resume_position > 0,
            UserOverride.is_watched == False
        ).options(
            joinedload(UserOverride.media_item),
            joinedload(UserOverride.metadata_match).joinedload(MetadataMatch.localizations),
            joinedload(UserOverride.metadata_match).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.localizations)
        )
        query = query.filter(MetadataMatch.is_adult == include_adult)

        overrides = query.order_by(UserOverride.last_watched_at.desc()).limit(limit).all()

        results = []
        for o in overrides:
            item = o.media_item
            match = o.metadata_match
            loc = match.localizations[0] if match and match.localizations else None
            
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
            
            results.append(ContinueWatchingItem(
                id=item.id,
                title=title,
                tv_title=tv_title,
                episode_title=episode_title,
                type=match.media_type.value if match else "movie",
                season_number=match.season_number if match else None,
                episode_number=match.episode_number if match else None,
                tv_tmdb_id=tv_tmdb_id,
                tmdb_id=int(match.external_id) if (match and match.external_id.isdigit()) else None,
                backdrop_path=match.backdrop_path if match else None,
                still_path=match.still_path if match else None,
                resume_position=o.resume_position,
                duration=item.duration or 0,
                is_watched=o.is_watched,
                last_watched_at=o.last_watched_at.isoformat() if o.last_watched_at else None,
            ))
        return results

    def _get_tab_counts(self, include_adult: bool) -> dict:
        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]
        
        movies_cnt_query = self.db.query(MediaItem).select_from(MediaItem).join(MetadataMatch).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.MOVIE,
            MetadataMatch.is_active == True,
            MetadataMatch.is_adult == include_adult
        )
        
        scenes_cnt_query = self.db.query(MediaItem).select_from(MediaItem).join(MetadataMatch).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.SCENE,
            MetadataMatch.is_active == True,
            MetadataMatch.is_adult == include_adult
        )
        
        # Unique TV shows count
        parent_ids = set()
        current_parents = {
            r[0] for r in self.db.query(MetadataMatch.parent_id).join(
                MediaItem, MetadataMatch.media_item_id == MediaItem.id
            ).filter(MediaItem.status.in_(lib_statuses), MetadataMatch.parent_id != None).all()
        }
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents),
                    MetadataMatch.parent_id != None
                ).all()
            }
        tv_shows_count = self.db.query(MetadataMatch).filter(
            MetadataMatch.id.in_(parent_ids),
            MetadataMatch.media_type == MediaType.TV,
            MetadataMatch.is_active == True,
            MetadataMatch.is_adult == include_adult
        ).count()
        
        # People count
        people_service = PeopleLibraryService(self.db)
        people_items = people_service.get_people_group(
            role="all",
            filter_status="active",
            tab="adult_people" if include_adult else "people",
            include_adult=include_adult,
        )
        people_count = len(people_items) if people_items else 0
        
        # Collections count
        from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
        settings = DbSettingsAdapter(self.db)
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
                MetadataMatch.is_active == True,
                MetadataMatch.collection_id != None,
                MetadataMatch.is_adult == include_adult
            ).group_by(MetadataMatch.collection_id).having(func.count(MediaItem.id) >= min_count).count()

        if include_adult:
            return {
                "adult": movies_cnt_query.count(),
                "adult_tv": tv_shows_count,
                "adult_scenes": scenes_cnt_query.count(),
                "adult_people": people_count,
                "adult_collections": col_cnt,
            }
        else:
            return {
                "movies": movies_cnt_query.count(),
                "tv": tv_shows_count,
                "scenes": scenes_cnt_query.count(),
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
    ) -> LibraryTabResponse:
        """
        Retrieves a paginated, filtered, and sorted list of library items for a specific UI tab.
        """
        if tab in ("people", "adult_people"):
            return self._get_people_tab_page(
                tab=tab,
                page=page,
                page_size=page_size,
                sort_by=sort_by,
                search=search,
                filter_favorite=filter_favorite,
                filter_gender=filter_gender,
                people_role=people_role,
                filter_status=filter_status,
                include_adult=include_adult,
            )

        query = self.db.query(MetadataMatch).outerjoin(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).options(
            selectinload(MetadataMatch.localizations),
            selectinload(MetadataMatch.media_item),
            selectinload(MetadataMatch.overrides),
            selectinload(MetadataMatch.people).selectinload(MediaPersonLink.person)
        )

        joined_localization = False
        joined_override = False
        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]

        # Ownership filter
        if filter_ownership in ("tracked", "unowned"):
            query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
            joined_override = True
            query = query.filter(
                MetadataMatch.media_item_id == None,
                UserOverride.is_tracked == True
            )
            if tab in ("tv", "adult_tv"):
                query = query.filter(MetadataMatch.media_type == MediaType.TV)
            elif tab in ("scenes", "adult_scenes"):
                query = query.filter(MetadataMatch.media_type == MediaType.SCENE)
            else:
                query = query.filter(MetadataMatch.media_type == MediaType.MOVIE)

        else: # Default: owned
            if tab in ("tv", "adult_tv"):
                # Get parent/ancestor IDs for TV shows in library
                parent_ids = set()
                current_parents = {
                    r[0] for r in self.db.query(MetadataMatch.parent_id).join(
                        MediaItem, MetadataMatch.media_item_id == MediaItem.id
                    ).filter(MediaItem.status.in_(lib_statuses), MetadataMatch.parent_id != None).all()
                }
                while current_parents:
                    parent_ids.update(current_parents)
                    current_parents = {
                        r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                            MetadataMatch.id.in_(current_parents), MetadataMatch.parent_id != None
                        ).all()
                    }
                query = query.filter(
                    MetadataMatch.id.in_(parent_ids),
                    MetadataMatch.media_type == MediaType.TV,
                    MetadataMatch.is_active == True,
                )
            else:
                query = query.filter(
                    MetadataMatch.media_item_id != None,
                    MediaItem.status.in_(lib_statuses),
                    MetadataMatch.is_active == True,
                )
                if tab in ("scenes", "adult_scenes"):
                    query = query.filter(MetadataMatch.media_type == MediaType.SCENE)
                else:
                    query = query.filter(MetadataMatch.media_type == MediaType.MOVIE)

        # NSFW filter
        query = query.filter(MetadataMatch.is_adult == include_adult)

        if filter_ownership not in ("tracked", "unowned") and tab not in ("tv", "adult_tv"):
            canonical_match_ids = self.db.query(
                func.min(MetadataMatch.id)
            ).filter(
                MetadataMatch.media_item_id != None,
                MetadataMatch.is_active == True,
                MetadataMatch.is_adult == include_adult,
            )

            if tab in ("scenes", "adult_scenes"):
                canonical_match_ids = canonical_match_ids.filter(
                    MetadataMatch.media_type == MediaType.SCENE
                )
            else:
                canonical_match_ids = canonical_match_ids.filter(
                    MetadataMatch.media_type == MediaType.MOVIE
                )

            canonical_match_ids = canonical_match_ids.group_by(MetadataMatch.media_item_id).subquery()
            query = query.filter(MetadataMatch.id.in_(canonical_match_ids))

        # Search filter
        if search:
            query = query.outerjoin(MetadataLocalization, MetadataLocalization.match_id == MetadataMatch.id)
            joined_localization = True
            if filter_ownership == "tracked":
                query = query.filter(MetadataLocalization.title.ilike(f"%{search}%"))
            else:
                query = query.filter(
                    or_(
                        MetadataLocalization.title.ilike(f"%{search}%"),
                        MediaItem.filename.ilike(f"%{search}%")
                    )
                )

        # Favorite filter
        if filter_favorite in ("favorite", "not_favorite"):
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            if filter_favorite == "favorite":
                query = query.filter(UserOverride.is_favorite == True)
            else:
                query = query.filter(or_(UserOverride.is_favorite == False, UserOverride.is_favorite == None))

        # Watched filter
        if filter_watched in ("watched", "unwatched"):
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            if filter_watched == "watched":
                query = query.filter(UserOverride.is_watched == True)
            else:
                query = query.filter(or_(UserOverride.is_watched == False, UserOverride.is_watched == None))

        # Genre filter
        if selected_genre:
            if not joined_localization:
                query = query.outerjoin(MetadataLocalization, MetadataLocalization.match_id == MetadataMatch.id)
                joined_localization = True
            query = query.filter(MetadataLocalization.genres.like(f'%"{selected_genre}"%'))

        # Decade filter
        if selected_decade and selected_decade.endswith("s") and selected_decade[:-1].isdigit():
            start_year = int(selected_decade[:-1])
            end_year = start_year + 9
            query = query.filter(
                MetadataMatch.release_date >= datetime(start_year, 1, 1),
                MetadataMatch.release_date <= datetime(end_year, 12, 31)
            )

        # Year filter
        if selected_year:
            query = query.filter(
                MetadataMatch.release_date >= datetime(selected_year, 1, 1),
                MetadataMatch.release_date <= datetime(selected_year, 12, 31)
            )

        # Tags filter
        if selected_tags:
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            query = query.join(user_override_tags, user_override_tags.c.user_override_id == UserOverride.id)\
                         .join(Tag, Tag.id == user_override_tags.c.tag_id)\
                         .filter(Tag.name.in_(selected_tags))

        # Sorting
        if sort_by in ("title_asc", "title_desc", "default"):
            if not joined_localization:
                query = query.outerjoin(MetadataLocalization, MetadataLocalization.match_id == MetadataMatch.id)
                joined_localization = True
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            
            val_col = func.coalesce(UserOverride.custom_title, MetadataLocalization.title, MediaItem.filename)
            if sort_by == "title_desc":
                query = query.order_by(desc(val_col))
            else:
                query = query.order_by(val_col.asc())
        elif sort_by in ("date_desc", "release_date_desc", "year_desc"):
            query = query.order_by(desc(MetadataMatch.release_date))
        elif sort_by in ("date_asc", "release_date_asc", "year_asc"):
            query = query.order_by(MetadataMatch.release_date.asc())
        elif sort_by in ("rating_desc", "user_rating_desc"):
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            query = query.order_by(desc(func.coalesce(
                UserOverride.user_rating,
                MetadataMatch.rating_porndb,
                MetadataMatch.rating_tmdb,
            )))
        elif sort_by == "user_rating_asc":
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            query = query.order_by(func.coalesce(
                UserOverride.user_rating,
                MetadataMatch.rating_porndb,
                MetadataMatch.rating_tmdb,
            ).asc())
        elif sort_by == "duration_desc":
            query = query.order_by(desc(MediaItem.duration))
        elif sort_by == "duration_asc":
            query = query.order_by(MediaItem.duration.asc())
        elif sort_by in ("file_size_desc", "size_desc"):
            query = query.order_by(desc(MediaItem.size))
        elif sort_by in ("file_size_asc", "size_asc"):
            query = query.order_by(MediaItem.size.asc())
        elif sort_by == "last_watched_desc":
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            query = query.order_by(desc(UserOverride.last_watched_at))
        elif sort_by == "last_watched_asc":
            if not joined_override:
                query = query.outerjoin(UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == get_current_user_id()))
                joined_override = True
            query = query.order_by(UserOverride.last_watched_at.asc())

        total_items = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

        # Pre-fetch user overrides for metadata_matches
        match_ids = [m.id for m in items]
        overrides_dict = {}
        if match_ids:
            current_uid = get_current_user_id()
            ovs = self.db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.metadata_match_id.in_(match_ids)
            ).all()
            for ov in ovs:
                overrides_dict[ov.metadata_match_id] = ov

        formatted_items = []
        for match in items:
            loc = match.localizations[0] if match.localizations else None
            item = match.media_item
            
            o = overrides_dict.get(match.id)
            title = (o.custom_title if (o and o.custom_title) else None) or (loc.title if loc else (item.filename if item else "Unknown"))
            poster_path = (o.custom_poster if (o and o.custom_poster) else None) or (loc.poster_path if loc else None)
            backdrop_path = (o.custom_backdrop if (o and o.custom_backdrop) else None) or (match.backdrop_path or None)
            rating = (o.user_rating if (o and o.user_rating is not None) else None)
            if rating is None:
                rating = match.rating_porndb or match.rating_tmdb or 0.0

            from app.domains.media_assets.services.images import image_processing_service
            resolved_poster = image_processing_service.resolve_image_url(poster_path, "posters")
            resolved_backdrop = image_processing_service.resolve_image_url(backdrop_path, "backdrops")

            people_list = []
            if match.people:
                for link in sorted(match.people, key=lambda x: x.order):
                    person = link.person
                    if person:
                        people_list.append({
                            "id": person.id,
                            "name": person.name,
                            "gender": person.gender,
                            "role": link.role.value if hasattr(link.role, "value") else str(link.role),
                        })

            formatted_items.append({
                "id": item.id if item else f"stash_{match.external_id}" if match.media_type == MediaType.SCENE else f"tmdb_{match.external_id}",
                "title": title,
                "year": match.release_date.year if match.release_date else None,
                "poster_path": resolved_poster,
                "backdrop_path": resolved_backdrop,
                "rating": rating,
                "rating_porndb": match.rating_porndb,
                "rating_imdb": match.rating_imdb,
                "type": match.media_type.value,
                "tmdb_id": int(match.external_id) if (match.provider == Provider.TMDB and match.external_id and match.external_id.isdigit()) else None,
                "tv_tmdb_id": int(match.external_id) if (match.media_type == MediaType.TV and match.provider == Provider.TMDB and match.external_id and match.external_id.isdigit()) else None,
                "path": item.current_path if item else None,
                "duration": (item.duration or 0.0) if item else 0.0,
                "size": (item.size or 0) if item else 0,
                "in_library": item is not None,
                "release_date": match.release_date.isoformat() if match.release_date else None,
                "user_rating": o.user_rating if o else None,
                "people": people_list,
            })

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

    def _get_people_tab_page(
        self,
        tab: str,
        page: int,
        page_size: int,
        sort_by: str,
        search: str,
        filter_favorite: str,
        filter_gender: str,
        people_role: str,
        filter_status: str,
        include_adult: bool,
    ) -> LibraryTabResponse:
        people_service = PeopleLibraryService(self.db)
        people_items = people_service.get_people_group(
            role=people_role,
            filter_status=filter_status,
            tab=tab,
            include_adult=include_adult,
        )

        if search:
            search_lower = search.lower()
            people_items = [
                item for item in people_items
                if search_lower in (item.name or "").lower()
            ]

        if filter_gender == "female":
            people_items = [item for item in people_items if item.gender == 1]
        elif filter_gender == "male":
            people_items = [item for item in people_items if item.gender == 2]

        if filter_favorite == "favorite":
            people_items = [item for item in people_items if item.is_favorite]
        elif filter_favorite == "not_favorite":
            people_items = [item for item in people_items if not item.is_favorite]

        if sort_by in ("library_count", "library_count_desc"):
            people_items.sort(key=lambda item: (-(item.library_count or 0), -(item.rating or 0.0), (item.name or "").lower()))
        elif sort_by == "library_count_asc":
            people_items.sort(key=lambda item: ((item.library_count or 0), (item.rating or 0.0), (item.name or "").lower()))
        elif sort_by in ("rating_desc", "user_rating_desc", "popularity_desc"):
            people_items.sort(key=lambda item: (-(item.user_rating if item.user_rating is not None else item.rating or 0.0), -(item.library_count or 0), (item.name or "").lower()))
        elif sort_by in ("user_rating_asc", "popularity_asc"):
            people_items.sort(key=lambda item: ((item.user_rating if item.user_rating is not None else item.rating or 0.0), (item.library_count or 0), (item.name or "").lower()))
        elif sort_by in ("name_desc", "title_desc"):
            people_items.sort(key=lambda item: (item.name or "").lower(), reverse=True)
        else:
            people_items.sort(key=lambda item: (item.name or "").lower())

        total_items = len(people_items)
        paged_people = people_items[(page - 1) * page_size: page * page_size]
        total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

        formatted_items = [
            {
                "id": item.id,
                "title": item.name,
                "name": item.name,
                "year": item.year,
                "poster_path": item.poster_path,
                "backdrop_path": None,
                "rating": item.rating,
                "rating_porndb": item.rating_porndb,
                "rating_imdb": None,
                "type": item.type,
                "path": None,
                "duration": 0.0,
                "size": 0,
                "in_library": True,
                "release_date": None,
                "user_rating": item.user_rating,
                "is_favorite": item.is_favorite,
                "is_active": item.is_active,
                "gender": item.gender,
                "library_count": item.library_count,
                "people_role": item.people_role,
                "is_adult_person": item.is_adult_person,
                "external_ids": item.external_ids,
            }
            for item in paged_people
        ]

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

