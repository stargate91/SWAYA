import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import desc, case, String, func, or_
from sqlalchemy.orm import Session, aliased, selectinload

from app.core.enums import MediaType, ItemStatus
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.people.models import Person, MediaPersonLink
from app.modules.users.models import UserOverride
from app.core.language import LanguageService
from app.core.user_context import get_current_user_id

logger = logging.getLogger(__name__)


class LibraryContentService:
    def __init__(self, db: Session, settings):
        self.db = db
        self.settings = settings

    def _preferred_metadata_language(self) -> str:
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE

    def get_recently_added_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        include_adult: Optional[bool] = None,
        media_type: Optional[str] = None,
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        pref_lang = language or self._preferred_metadata_language()
        if include_adult is None:
            include_adult_val = self.settings.get_setting("include_adult")
            include_adult = str(include_adult_val).lower() == "true"
            
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
            MetadataMatch.is_adult == include_adult
        ]
        
        if media_type == "movie":
            filter_conds.append(MetadataMatch.media_type == MediaType.MOVIE)
        elif media_type == "tv":
            filter_conds.append(MetadataMatch.media_type == MediaType.EPISODE)
        elif media_type == "scene":
            filter_conds.append(MetadataMatch.media_type == MediaType.SCENE)
        elif media_type == "video":
            filter_conds.append(MetadataMatch.media_type == MediaType.VIDEO)
        else:
            types = [MediaType.MOVIE, MediaType.EPISODE]
            if include_adult:
                types.extend([x for x in MediaType if x.is_adult])
            filter_conds.append(MetadataMatch.media_type.in_(types))
            
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
                is_watched = bool(o_media and o_media.is_watched)
            elif match.media_type == MediaType.TV or (match.media_type == MediaType.EPISODE and show_match != match):
                # Count total episodes and check how many are watched
                total_episodes_query = self.db.query(MetadataMatch.id).outerjoin(
                    season_alias, MetadataMatch.parent_id == season_alias.id
                ).filter(
                    MetadataMatch.media_type == MediaType.EPISODE,
                    or_(
                        MetadataMatch.parent_id == show_match.id,
                        season_alias.parent_id == show_match.id
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
                "tmdb_id": int(show_match.external_id) if (show_match.external_id and show_match.external_id.isdigit() and match.media_type.value in ["movie", "tv", "episode"]) else None,
                "title": title,
                "name": title,
                "media_type": "tv" if match.media_type == MediaType.EPISODE else match.media_type.value,
                "in_library": True,
                "media_item_id": item.id,
                "library_item_id": item.id,
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
            
        offset = (page - 1) * limit
        
        query = self.db.query(Person).filter(Person.is_active)
        if not include_adult:
            query = query.filter(
                Person.is_adult == False
            )
        else:
            query = query.filter(Person.is_adult == True)
        
        effective_gender = gender
        if effective_gender is None and include_adult:
            effective_gender = self.settings.get_setting("adult_gender_preference")
            
        if effective_gender == "female":
            query = query.filter(Person.gender == 1)
        elif effective_gender == "male":
            query = query.filter(Person.gender == 2)
            
        recent_people = query.order_by(desc(Person.id)).offset(offset).limit(limit).all()
        
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
