from datetime import datetime
from typing import Tuple, Any, List
from sqlalchemy import func, or_, and_, desc
from sqlalchemy.orm import Session, joinedload, aliased

from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch, MetadataLocalization
from app.modules.users.models import UserOverride, Tag, user_override_tags
from app.modules.people.models import MediaPersonLink
from app.core.enums import ItemStatus, MediaType, Provider
from app.core.user_context import get_current_user_id
from app.core.language import LanguageService
from app.modules.library.services.listing.filter_params import ListingFilterParams

class BaseQueryBuilder:
    def __init__(self, db: Session):
        self.db = db
        self.current_user_id = get_current_user_id()
        self.lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]
        
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(self.db)
        self.ui_lang = get_user_ui_language(settings)
        self.loc_alias = aliased(MetadataLocalization, name="search_loc")

    def _apply_common_filters(
        self,
        query: Any,
        params: ListingFilterParams,
        joined_localization: bool,
        joined_override: bool
    ) -> Tuple[Any, bool, bool]:
        # NSFW filter
        query = query.filter(MetadataMatch.is_adult == params.include_adult)

        # Search filter
        if params.search:
            if not joined_localization:
                from sqlalchemy import case
                target_locale = case(
                    (MetadataMatch.provider == Provider.TMDB, self.ui_lang),
                    else_="en"
                )
                query = query.outerjoin(self.loc_alias, and_(
                    self.loc_alias.match_id == MetadataMatch.id,
                    self.loc_alias.locale == target_locale
                ))
                joined_localization = True
            if params.filter_ownership == "tracked":
                query = query.filter(
                    or_(
                        self.loc_alias.title.ilike(f"%{params.search}%"),
                        MetadataMatch.original_title.ilike(f"%{params.search}%")
                    )
                )
            else:
                query = query.filter(
                    or_(
                        self.loc_alias.title.ilike(f"%{params.search}%"),
                        MetadataMatch.original_title.ilike(f"%{params.search}%"),
                        MediaItem.filename.ilike(f"%{params.search}%")
                    )
                )

        # Favorite and Watched filters
        if params.filter_favorite in ("favorite", "not_favorite") or params.filter_watched in ("watched", "unwatched") or params.filter_rating in ("rated", "unrated"):
            override_match = aliased(UserOverride, name="filter_override_match")
            override_item = aliased(UserOverride, name="filter_override_item")
            
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            joined_override = True

            if params.filter_favorite == "favorite":
                query = query.filter(or_(override_match.is_favorite, override_item.is_favorite))
            elif params.filter_favorite == "not_favorite":
                query = query.filter(
                    or_(~override_match.is_favorite, override_match.is_favorite.is_(None)),
                    or_(~override_item.is_favorite, override_item.is_favorite.is_(None))
                )

            if params.filter_watched == "watched":
                query = query.filter(or_(override_match.is_watched, override_item.is_watched))
            elif params.filter_watched == "unwatched":
                query = query.filter(
                    or_(~override_match.is_watched, override_match.is_watched.is_(None)),
                    or_(~override_item.is_watched, override_item.is_watched.is_(None))
                )

            if params.filter_rating == "rated":
                query = query.filter(or_(
                    override_match.user_rating.isnot(None),
                    override_item.user_rating.isnot(None),
                    and_(override_match.user_comment.isnot(None), override_match.user_comment != ""),
                    and_(override_item.user_comment.isnot(None), override_item.user_comment != ""),
                    override_match.is_favorite == True,
                    override_item.is_favorite == True
                ))
            elif params.filter_rating == "unrated":
                query = query.filter(
                    or_(override_match.user_rating.is_(None), override_match.user_rating == None),
                    or_(override_item.user_rating.is_(None), override_item.user_rating == None),
                    or_(override_match.user_comment.is_(None), override_match.user_comment == ""),
                    or_(override_item.user_comment.is_(None), override_item.user_comment == ""),
                    or_(~override_match.is_favorite, override_match.is_favorite.is_(None)),
                    or_(~override_item.is_favorite, override_item.is_favorite.is_(None))
                )

        # Genre filter
        if params.selected_genre:
            if not joined_localization:
                from sqlalchemy import case
                target_locale = case(
                    (MetadataMatch.provider == Provider.TMDB, self.ui_lang),
                    else_="en"
                )
                query = query.outerjoin(self.loc_alias, and_(
                    self.loc_alias.match_id == MetadataMatch.id,
                    self.loc_alias.locale == target_locale
                ))
                joined_localization = True
            query = query.filter(self.loc_alias.genres.like(f'%"{params.selected_genre}"%'))

        # Decade filter
        if params.selected_decade and params.selected_decade.endswith("s") and params.selected_decade[:-1].isdigit():
            start_year = int(params.selected_decade[:-1])
            end_year = start_year + 9
            query = query.filter(
                MetadataMatch.release_date >= datetime(start_year, 1, 1),
                MetadataMatch.release_date <= datetime(end_year, 12, 31)
            )

        # Year filter
        if params.selected_year:
            query = query.filter(
                MetadataMatch.release_date >= datetime(params.selected_year, 1, 1),
                MetadataMatch.release_date <= datetime(params.selected_year, 12, 31)
            )

        # Tags filter
        if params.selected_tags:
            query = query.filter(
                or_(
                    MetadataMatch.id.in_(
                        self.db.query(UserOverride.metadata_match_id)
                        .join(user_override_tags, user_override_tags.c.user_override_id == UserOverride.id)
                        .join(Tag, Tag.id == user_override_tags.c.tag_id)
                        .filter(Tag.name.in_(params.selected_tags), UserOverride.user_id == self.current_user_id)
                    ),
                    MetadataMatch.media_item_id.in_(
                        self.db.query(UserOverride.media_item_id)
                        .join(user_override_tags, user_override_tags.c.user_override_id == UserOverride.id)
                        .join(Tag, Tag.id == user_override_tags.c.tag_id)
                        .filter(Tag.name.in_(params.selected_tags), UserOverride.metadata_match_id.is_(None), UserOverride.user_id == self.current_user_id)
                    )
                )
            )

        return query, joined_localization, joined_override

    def _apply_sorting(
        self,
        query: Any,
        params: ListingFilterParams,
        joined_localization: bool,
        joined_override: bool
    ) -> Any:
        if params.sort_by in ("title_asc", "title_desc", "default"):
            if not joined_localization:
                from sqlalchemy import case
                target_locale = case(
                    (MetadataMatch.provider == Provider.TMDB, self.ui_lang),
                    else_="en"
                )
                query = query.outerjoin(self.loc_alias, and_(
                    self.loc_alias.match_id == MetadataMatch.id,
                    self.loc_alias.locale == target_locale
                ))
                joined_localization = True
            
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            
            val_col = func.coalesce(override_match.custom_title, override_item.custom_title, self.loc_alias.title, MediaItem.filename)
            if params.sort_by == "title_desc":
                query = query.order_by(desc(val_col))
            else:
                query = query.order_by(val_col.asc())
        elif params.sort_by in ("date_desc", "release_date_desc", "year_desc"):
            query = query.order_by(desc(MetadataMatch.release_date))
        elif params.sort_by in ("date_asc", "release_date_asc", "year_asc"):
            query = query.order_by(MetadataMatch.release_date.asc())
        elif params.sort_by in ("comment_desc", "user_comment_desc"):
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            query = query.order_by(desc(func.coalesce(
                override_match.user_comment,
                override_item.user_comment,
                ""
            )))
        elif params.sort_by in ("comment_asc", "user_comment_asc"):
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            query = query.order_by(func.coalesce(
                override_match.user_comment,
                override_item.user_comment,
                ""
            ).asc())
        elif params.sort_by in ("rating_desc", "user_rating_desc"):
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            query = query.order_by(desc(func.coalesce(
                override_match.user_rating,
                override_item.user_rating,
                MetadataMatch.rating_porndb,
                MetadataMatch.rating_tmdb,
            )))
        elif params.sort_by == "user_rating_asc":
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            query = query.order_by(func.coalesce(
                override_match.user_rating,
                override_item.user_rating,
                MetadataMatch.rating_porndb,
                MetadataMatch.rating_tmdb,
            ).asc())
        elif params.sort_by == "rating_imdb_desc":
            query = query.order_by(desc(MetadataMatch.rating_imdb))
        elif params.sort_by == "rating_imdb_asc":
            query = query.order_by(MetadataMatch.rating_imdb.asc())
        elif params.sort_by == "duration_desc":
            query = query.order_by(desc(func.coalesce(MediaItem.duration, MetadataMatch.runtime * 60)))
        elif params.sort_by == "duration_asc":
            query = query.order_by(func.coalesce(MediaItem.duration, MetadataMatch.runtime * 60).asc())
        elif params.sort_by in ("file_size_desc", "size_desc"):
            query = query.order_by(desc(MediaItem.size))
        elif params.sort_by in ("file_size_asc", "size_asc"):
            query = query.order_by(MediaItem.size.asc())
        elif params.sort_by == "last_watched_desc":
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            query = query.order_by(desc(func.coalesce(override_match.last_watched_at, override_item.last_watched_at)))
        elif params.sort_by == "last_watched_asc":
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            query = query.order_by(func.coalesce(override_match.last_watched_at, override_item.last_watched_at).asc())
        elif params.sort_by in ("watch_count_desc", "watch_count_asc"):
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            val_col = func.coalesce(override_match.watch_count, override_item.watch_count, 0)
            if params.sort_by == "watch_count_desc":
                query = query.order_by(desc(val_col))
            else:
                query = query.order_by(val_col.asc())
        elif params.sort_by in ("tag_count_desc", "tag_count_asc"):
            override_match = aliased(UserOverride, name="override_match")
            override_item = aliased(UserOverride, name="override_item")
            query = query.outerjoin(override_match, and_(
                override_match.metadata_match_id == MetadataMatch.id,
                override_match.user_id == self.current_user_id
            )).outerjoin(override_item, and_(
                override_item.media_item_id == MetadataMatch.media_item_id,
                override_item.metadata_match_id.is_(None),
                override_item.user_id == self.current_user_id
            ))
            tag_sub_match = self.db.query(
                UserOverride.id.label("override_id"),
                func.count(user_override_tags.c.tag_id).label("tag_count")
            ).join(
                user_override_tags, UserOverride.id == user_override_tags.c.user_override_id
            ).group_by(UserOverride.id).subquery()
            tag_sub_item = self.db.query(
                UserOverride.id.label("override_id"),
                func.count(user_override_tags.c.tag_id).label("tag_count")
            ).join(
                user_override_tags, UserOverride.id == user_override_tags.c.user_override_id
            ).group_by(UserOverride.id).subquery()
            query = query.outerjoin(tag_sub_match, override_match.id == tag_sub_match.c.override_id)
            query = query.outerjoin(tag_sub_item, override_item.id == tag_sub_item.c.override_id)
            val_col = func.coalesce(tag_sub_match.c.tag_count, 0) + func.coalesce(tag_sub_item.c.tag_count, 0)
            if params.sort_by == "tag_count_desc":
                query = query.order_by(desc(val_col))
            else:
                query = query.order_by(val_col.asc())
        elif params.sort_by in ("finish_count_desc", "finish_count_asc"):
            from app.modules.history.models import PlaybackPeakLog
            peak_subquery = self.db.query(
                PlaybackPeakLog.media_item_id,
                func.count(PlaybackPeakLog.id).label("finish_count")
            ).group_by(PlaybackPeakLog.media_item_id).subquery()
            query = query.outerjoin(peak_subquery, MetadataMatch.media_item_id == peak_subquery.c.media_item_id)
            if params.sort_by == "finish_count_desc":
                query = query.order_by(desc(func.coalesce(peak_subquery.c.finish_count, 0)))
            else:
                query = query.order_by(func.coalesce(peak_subquery.c.finish_count, 0).asc())
        elif params.sort_by in ("last_finish_desc", "last_finish_asc"):
            from app.modules.history.models import PlaybackPeakLog
            peak_subquery = self.db.query(
                PlaybackPeakLog.media_item_id,
                func.max(PlaybackPeakLog.created_at).label("last_finish_at")
            ).group_by(PlaybackPeakLog.media_item_id).subquery()
            query = query.outerjoin(peak_subquery, MetadataMatch.media_item_id == peak_subquery.c.media_item_id)
            if params.sort_by == "last_finish_desc":
                query = query.order_by(desc(peak_subquery.c.last_finish_at))
            else:
                query = query.order_by(peak_subquery.c.last_finish_at.asc())
        elif params.sort_by in ("random", "random_desc", "random_asc"):
            query = query.order_by(func.random())

        return query

    def format_results(self, items: List[MetadataMatch]) -> List[dict]:
        def calculate_card_subtitle(match, people_list) -> str:
            parts = []
            m_type = match.media_type
            
            if m_type in (MediaType.SCENE, MediaType.VIDEO):
                perf_names = [p["name"] for p in people_list if p.get("name")][:3]
                if perf_names:
                    parts.append(", ".join(perf_names))
                date_part = ""
                if match.release_date:
                    date_part = match.release_date.strftime("%Y-%m-%d")
                if date_part:
                    parts.append(date_part)
            elif m_type == MediaType.TV:
                first_year = None
                if hasattr(match, "first_air_date") and match.first_air_date:
                    first_year = match.first_air_date.year
                elif match.release_date:
                    first_year = match.release_date.year
                last_year = match.last_air_date.year if (hasattr(match, "last_air_date") and match.last_air_date) else None
                status_lower = str(getattr(match, "release_status", "") or "").lower()
                is_ended = status_lower in ("ended", "canceled", "cancelled")
                tv_year = ""
                if first_year:
                    if is_ended and last_year:
                        tv_year = str(first_year) if first_year == last_year else f"{first_year} - {last_year}"
                    else:
                        tv_year = f"{first_year} - "
                if tv_year:
                    parts.append(tv_year)
                info = getattr(match, "info", None)
                if info:
                    parts.append(str(info))
            else:
                year_part = ""
                if match.release_date:
                    year_part = str(match.release_date.year)
                if year_part:
                    parts.append(year_part)
                info = getattr(match, "info", None)
                if info:
                    parts.append(str(info))
            return " • ".join(parts)

        match_ids = [m.id for m in items]
        media_item_ids = [m.media_item_id for m in items if m.media_item_id is not None]
        metadata_overrides = {}
        physical_overrides = {}
        people_links_dict = {}
        if match_ids:
            ov_filters = [UserOverride.metadata_match_id.in_(match_ids)]
            if media_item_ids:
                ov_filters.append(UserOverride.media_item_id.in_(media_item_ids))
            
            ovs = self.db.query(UserOverride).filter(
                UserOverride.user_id == self.current_user_id,
                or_(*ov_filters)
            ).all()
            for ov in ovs:
                if ov.metadata_match_id:
                    metadata_overrides[ov.metadata_match_id] = ov
                if ov.media_item_id and not ov.metadata_match_id:
                    physical_overrides[ov.media_item_id] = ov
                
            links = self.db.query(MediaPersonLink).options(
                joinedload(MediaPersonLink.person)
            ).filter(MediaPersonLink.match_id.in_(match_ids)).all()
            for link in links:
                people_links_dict.setdefault(link.match_id, []).append(link)

        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(self.db)
        ui_lang = get_user_ui_language(settings)
        gender_pref = settings.get_setting("adult_gender_preference") or "all"

        formatted_items = []
        for match in items:
            loc = LanguageService.get_best_localization(match.localizations, ui_lang) if match.localizations else None
            item = match.media_item
            
            in_library = item is not None
            if match.media_type == MediaType.TV:
                has_local_eps = self.db.query(MetadataMatch).filter(
                    MetadataMatch.media_item_id is not None,
                    MetadataMatch.parent_id.in_(
                        self.db.query(MetadataMatch.id).filter(MetadataMatch.parent_id == match.id)
                    )
                ).first() is not None
                in_library = has_local_eps
            
            o = metadata_overrides.get(match.id)
            p = physical_overrides.get(item.id) if item else None

            title = (o.custom_title if (o and o.custom_title) else (p.custom_title if (p and p.custom_title) else None)) or (loc.title if loc else (match.original_title if match.original_title else (item.filename if item else "Unknown")))
            poster_path = (o.custom_poster if (o and o.custom_poster) else (p.custom_poster if (p and p.custom_poster) else None)) or (loc.local_poster_path if (loc and loc.local_poster_path) else (loc.poster_path if loc else None))
            backdrop_path = (o.custom_backdrop if (o and o.custom_backdrop) else (p.custom_backdrop if (p and p.custom_backdrop) else None)) or (match.local_backdrop_path or match.backdrop_path or None)
            rating = (o.user_rating if (o and o.user_rating is not None) else (p.user_rating if (p and p.user_rating is not None) else None))
            if rating is None:
                rating = match.rating_porndb or match.rating_tmdb or 0.0

            from app.modules.media_assets.services.images import image_processing_service
            resolved_poster = image_processing_service.resolve_image_url(poster_path, "posters")
            resolved_backdrop = image_processing_service.resolve_image_url(backdrop_path, "backdrops")

            from app.modules.scrapers.support.registry import MediaTypeRegistry
            cfg = MediaTypeRegistry.get_config(match.media_type)
            card_aspect = cfg.card_aspect_ratio if cfg else "poster"
            
            if card_aspect == "landscape":
                ideal_path = backdrop_path or poster_path
                card_image_folder = "backdrops"
            else:
                ideal_path = poster_path or backdrop_path
                card_image_folder = "posters"
            card_image_url = image_processing_service.resolve_image_url(ideal_path, card_image_folder) if ideal_path else ""

            people_list = []
            match_people = people_links_dict.get(match.id, [])
            if match_people:
                is_adult_item = bool(match.is_adult) or (match.media_type == MediaType.SCENE)
                for link in sorted(match_people, key=lambda x: x.order):
                    person = link.person
                    if person:
                        if is_adult_item and gender_pref != "all":
                            if gender_pref == "female" and person.gender != 1:
                                continue
                            if gender_pref == "male" and person.gender != 2:
                                continue
                        people_list.append({
                            "id": person.id,
                            "name": person.name,
                            "gender": person.gender,
                            "role": link.role.value if hasattr(link.role, "value") else str(link.role),
                        })

            is_watched = False
            if o and o.is_watched:
                is_watched = True
            elif p and p.is_watched:
                is_watched = True
            elif match.media_type == MediaType.TV:
                # Check if all episodes in metadata are watched.
                # Find all MetadataMatch entries of type EPISODE belonging to this TV show
                # and count how many are marked as watched.
                parent_season = aliased(MetadataMatch)
                
                # 1. Get all episode matches for this TV show
                total_episodes_query = self.db.query(MetadataMatch.id).outerjoin(
                    parent_season, MetadataMatch.parent_id == parent_season.id
                ).filter(
                    MetadataMatch.media_type == MediaType.EPISODE,
                    or_(
                        MetadataMatch.parent_id == match.id,
                        parent_season.parent_id == match.id
                    )
                )
                total_episode_ids = [r[0] for r in total_episodes_query.all()]
                
                if total_episode_ids:
                    # 2. Get watched overrides matching either these episode match IDs or their associated local media items
                    # First map match IDs to their local media item IDs (if any)
                    mapping_query = self.db.query(MetadataMatch.id, MetadataMatch.media_item_id).filter(
                        MetadataMatch.id.in_(total_episode_ids)
                    ).all()
                    
                    match_to_media = {m_id: mi_id for m_id, mi_id in mapping_query}
                    media_ids = [mi_id for mi_id in match_to_media.values() if mi_id is not None]
                    
                    # Fetch overrides for these match IDs or media item IDs
                    overrides_query = self.db.query(UserOverride).filter(
                        UserOverride.user_id == self.current_user_id,
                        or_(
                            UserOverride.metadata_match_id.in_(total_episode_ids),
                            UserOverride.media_item_id.in_(media_ids)
                        )
                    ).all()
                    
                    watched_matches = set()
                    watched_media = set()
                    for ov in overrides_query:
                        if ov.is_watched:
                            if ov.metadata_match_id:
                                watched_matches.add(ov.metadata_match_id)
                            if ov.media_item_id:
                                watched_media.add(ov.media_item_id)
                    
                    # An episode is watched if its match ID or its media item ID is in the watched sets
                    watched_count = 0
                    for ep_id in total_episode_ids:
                        media_id = match_to_media.get(ep_id)
                        if ep_id in watched_matches or (media_id is not None and media_id in watched_media):
                            watched_count += 1
                            
                    is_watched = watched_count >= len(total_episode_ids)

            is_favorite = False
            if o and o.is_favorite:
                is_favorite = True
            elif p and p.is_favorite:
                is_favorite = True

            resume_position = 0
            if p and p.resume_position:
                resume_position = p.resume_position
            elif o and o.resume_position:
                resume_position = o.resume_position

            watch_count = 0
            if o and o.watch_count:
                watch_count = o.watch_count
            if p and p.watch_count and p.watch_count > watch_count:
                watch_count = p.watch_count

            last_watched_at = None
            o_lw = o.last_watched_at if o else None
            p_lw = p.last_watched_at if p else None
            if o_lw and p_lw:
                last_watched_at = max(o_lw, p_lw).isoformat()
            elif o_lw:
                last_watched_at = o_lw.isoformat()
            elif p_lw:
                last_watched_at = p_lw.isoformat()

            from app.modules.scrapers.support.registry import ProviderRegistry
            from app.modules.scrapers.support.registry import MediaTypeRegistry
            cfg = MediaTypeRegistry.get_config(match.media_type)
            card_aspect = cfg.card_aspect_ratio if cfg else "poster"
            image_sub = cfg.image_subfolder if cfg else "posters"

            card_subtitle = calculate_card_subtitle(match, people_list)

            from app.core.episode_utils import format_episode_code
            disp_code = format_episode_code(match.season_number, match.episode_number) if (match.media_type == MediaType.EPISODE) else None

            formatted_items.append({
                "id": item.id if item else f"{ProviderRegistry.get_config(match.provider).prefix if ProviderRegistry.get_config(match.provider) else match.provider.value.lower()}_{match.external_id}",
                "title": title,
                "year": match.release_date.year if match.release_date else None,
                "poster_path": resolved_poster,
                "backdrop_path": resolved_backdrop,
                "original_poster_path": loc.poster_path if loc else None,
                "original_backdrop_path": match.backdrop_path,
                "rating": rating,
                "rating_porndb": match.rating_porndb,
                "rating_imdb": match.rating_imdb,
                "type": match.media_type.value if hasattr(match.media_type, "value") else match.media_type,
                "card_aspect_ratio": card_aspect,
                "image_subfolder": image_sub,
                "card_image_url": card_image_url,
                "card_subtitle": card_subtitle,
                "tmdb_id": int(match.external_id) if (match.provider == Provider.TMDB and match.external_id and match.external_id.isdigit()) else None,
                "tv_tmdb_id": int(match.external_id) if (match.media_type == MediaType.TV and match.provider == Provider.TMDB and match.external_id and match.external_id.isdigit()) else None,
                "path": item.current_path if item else None,
                "duration": (item.duration or 0.0) if item else 0.0,
                "size": (item.size or 0) if item else 0,
                "in_library": in_library,
                "release_date": match.release_date.isoformat() if match.release_date else None,
                "user_rating": o.user_rating if o else (p.user_rating if p else None),
                "user_comment": o.user_comment if (o and o.user_comment) else (p.user_comment if (p and p.user_comment) else None),
                "is_watched": is_watched,
                "is_favorite": is_favorite,
                "resume_position": resume_position,
                "watch_count": watch_count,
                "last_watched_at": last_watched_at,
                "people": people_list,
                "is_adult": bool(match.is_adult) or ProviderRegistry.is_adult_provider(match.provider),
                "should_blur_sfw": bool(match.is_adult) or ProviderRegistry.is_adult_provider(match.provider) or match.media_type == MediaType.SCENE,
                "last_air_date": match.last_air_date.isoformat() if (hasattr(match, "last_air_date") and match.last_air_date) else None,
                "release_status": match.release_status if hasattr(match, "release_status") else None,
                "display_episode_code": disp_code,
            })
        return formatted_items
