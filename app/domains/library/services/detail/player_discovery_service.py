import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.domains.users.models import UserOverride
from app.domains.metadata.models import MetadataMatch, MetadataLocalization
from app.shared_kernel.enums import MediaType, ItemStatus
from app.domains.library.models import MediaItem
from app.shared_kernel.language import LanguageService

logger = logging.getLogger(__name__)

class PlayerDiscoveryService:
    @staticmethod
    def to_discovery_item(db: Session, target_match: MetadataMatch, current_uid: int, settings_adapter: Any) -> Optional[Dict[str, Any]]:
        if not target_match:
            return None

        # If the match we received isn't active, find the active match for this media item
        active_match = target_match
        if target_match.media_item_id and not target_match.is_active:
            real_active = db.query(MetadataMatch).filter(
                MetadataMatch.media_item_id == target_match.media_item_id,
                MetadataMatch.is_active == True
            ).first()
            if real_active:
                active_match = real_active

        # Resolve Localization — explicit query, never rely on lazy loading
        ui_lang = settings_adapter.get_setting("metadata_language", user_id=current_uid) or "en"
        all_locs = db.query(MetadataLocalization).filter(MetadataLocalization.match_id == active_match.id).all()
        target_loc = LanguageService.get_best_localization(all_locs, ui_lang) if all_locs else None
        title_val = target_loc.title if target_loc else (active_match.original_title or "Alternative Title")

        # Resolve image path — return raw DB path, frontend resolveMediaImageUrl handles the rest
        p_path = None
        is_episode = active_match.media_type and active_match.media_type.value == "episode"
        is_scene = active_match.media_type and active_match.media_type.value == "scene"

        # 1. Highest Priority: User Override
        if active_match.media_item_id:
            user_ov = db.query(UserOverride).filter(
                UserOverride.user_id == current_uid,
                UserOverride.media_item_id == active_match.media_item_id
            ).first()
            if user_ov and user_ov.custom_poster:
                p_path = user_ov.custom_poster

        # 2. 16:9 checks for Episode / Scene
        if not p_path:
            if is_episode:
                p_path = active_match.local_still_path or active_match.still_path
            elif is_scene:
                p_path = active_match.local_backdrop_path or active_match.backdrop_path

        # 3. Fallback to localization poster paths
        if not p_path and target_loc:
            p_path = target_loc.local_poster_path or target_loc.poster_path

        overview = target_loc.overview if target_loc else None

        return {
            "id": active_match.media_item_id or f"external_{active_match.provider.value}_{active_match.external_id}",
            "title": title_val,
            "poster_path": p_path,
            "media_type": active_match.media_type.value if active_match.media_type else "movie",
            "overview": overview
        }

    @classmethod
    def get_playback_discovery_info(
        cls,
        db: Session,
        item: MediaItem,
        current_uid: int,
        is_adult: bool,
        media_type: Optional[str],
        match: Optional[MetadataMatch],
        settings_adapter: Any
    ) -> Dict[str, Any]:
        collection_next_info = None
        performer_unwatched_info = None
        studio_unwatched_info = None
        surprise_me_info = None
        next_episode_info = None

        # Filter items we have watched already
        unwatched_item_ids_subq = db.query(UserOverride.media_item_id).filter(
            UserOverride.user_id == current_uid,
            UserOverride.is_watched == True,
            UserOverride.media_item_id.isnot(None)
        ).subquery()

        # TV Show Next Episode check
        if match and match.media_type and match.media_type.value == "episode" and match.parent_id:
            current_season = match.season_number
            current_ep = match.episode_number
            if isinstance(current_ep, list) and current_ep:
                current_ep_num = current_ep[-1]
            elif isinstance(current_ep, (int, float)):
                current_ep_num = int(current_ep)
            else:
                current_ep_num = 0

            season_match = db.query(MetadataMatch).filter(MetadataMatch.id == match.parent_id).first()
            if season_match and season_match.parent_id:
                show_id = season_match.parent_id
                next_ep_match = db.query(MetadataMatch).join(MediaItem).filter(
                    MetadataMatch.parent_id.in_(
                        db.query(MetadataMatch.id).filter(MetadataMatch.parent_id == show_id)
                    ),
                    MetadataMatch.media_type == MediaType.EPISODE,
                    MetadataMatch.is_active == True,
                    MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
                ).filter(
                    (MetadataMatch.season_number > current_season) |
                    ((MetadataMatch.season_number == current_season) & (MetadataMatch.episode_number > current_ep_num))
                ).order_by(
                    MetadataMatch.season_number.asc(),
                    MetadataMatch.episode_number.asc()
                ).first()

                if next_ep_match:
                    next_loc = db.query(MetadataLocalization).filter(MetadataLocalization.match_id == next_ep_match.id).first()
                    next_title = next_loc.title if next_loc else (next_ep_match.original_title or f"Episode {next_ep_match.episode_number}")
                    next_episode_info = {
                        "id": next_ep_match.media_item_id,
                        "title": f"S{str(next_ep_match.season_number).zfill(2)}E{str(next_ep_match.episode_number or 0).zfill(2)} - {next_title}"
                    }

        # Movie & Scene Discovery
        if match:
            # Collection Next (for movies in a Collection)
            if media_type == "movie" and match.collection_id:
                next_in_col = db.query(MetadataMatch).filter(
                    MetadataMatch.collection_id == match.collection_id,
                    MetadataMatch.media_type == MediaType.MOVIE,
                    MetadataMatch.id != match.id,
                    MetadataMatch.is_active == True,
                    MetadataMatch.media_item_id.isnot(None),
                    ~MetadataMatch.media_item_id.in_(unwatched_item_ids_subq)
                ).first()
                if next_in_col:
                    collection_next_info = cls.to_discovery_item(db, next_in_col, current_uid, settings_adapter)

            # Performer Unwatched (for Scene performers)
            if media_type == "scene":
                from app.domains.people.models import MediaPersonLink
                first_perf_link = db.query(MediaPersonLink).filter(
                    MediaPersonLink.match_id == match.id
                ).first()
                if first_perf_link:
                    perf_id = first_perf_link.person_id
                    next_perf_scene = db.query(MetadataMatch).join(MediaPersonLink, MediaPersonLink.match_id == MetadataMatch.id).filter(
                        MediaPersonLink.person_id == perf_id,
                        MetadataMatch.media_type == MediaType.SCENE,
                        MetadataMatch.id != match.id,
                        MetadataMatch.is_active == True,
                        MetadataMatch.media_item_id.isnot(None),
                        ~MetadataMatch.media_item_id.in_(unwatched_item_ids_subq)
                    ).first()
                    if next_perf_scene:
                        performer_unwatched_info = cls.to_discovery_item(db, next_perf_scene, current_uid, settings_adapter)

            # Studio Unwatched (for Movie/Scene studios)
            from app.domains.metadata.models import metadata_match_studios
            studio_link = db.query(metadata_match_studios).filter(
                metadata_match_studios.c.metadata_match_id == match.id
            ).first()
            if studio_link:
                stud_id = studio_link.studio_id
                next_stud_match = db.query(MetadataMatch).join(metadata_match_studios).filter(
                    metadata_match_studios.c.studio_id == stud_id,
                    MetadataMatch.media_type == match.media_type,
                    MetadataMatch.id != match.id,
                    MetadataMatch.is_active == True,
                    MetadataMatch.media_item_id.isnot(None),
                    ~MetadataMatch.media_item_id.in_(unwatched_item_ids_subq)
                ).first()
                if next_stud_match:
                    studio_unwatched_info = cls.to_discovery_item(db, next_stud_match, current_uid, settings_adapter)

            # Surprise Me (Random unwatched same type, excluding already recommended items)
            from sqlalchemy.sql.expression import func
            excluded_item_ids = {match.media_item_id}
            if collection_next_info and collection_next_info.get("id"):
                excluded_item_ids.add(collection_next_info["id"])
            if performer_unwatched_info and performer_unwatched_info.get("id"):
                excluded_item_ids.add(performer_unwatched_info["id"])
            if studio_unwatched_info and studio_unwatched_info.get("id"):
                excluded_item_ids.add(studio_unwatched_info["id"])

            is_adult_filter = MetadataMatch.is_adult == True if is_adult else (MetadataMatch.is_adult == False) | (MetadataMatch.is_adult.is_(None))

            rand_match = db.query(MetadataMatch).filter(
                MetadataMatch.media_type == match.media_type,
                MetadataMatch.id != match.id,
                MetadataMatch.is_active == True,
                MetadataMatch.media_item_id.isnot(None),
                is_adult_filter,
                ~MetadataMatch.media_item_id.in_(unwatched_item_ids_subq),
                ~MetadataMatch.media_item_id.in_(list(excluded_item_ids))
            ).order_by(func.random()).first()
            if rand_match:
                surprise_me_info = cls.to_discovery_item(db, rand_match, current_uid, settings_adapter)

        # 3. Fetch Peaks count (if adult scene)
        peaks_count = 0
        if is_adult and media_type == "scene":
            from app.domains.history.models import PlaybackPeakLog
            peaks_count = db.query(PlaybackPeakLog).filter(
                PlaybackPeakLog.user_id == current_uid,
                PlaybackPeakLog.media_item_id == item.id
            ).count()

        return {
            "next_episode": next_episode_info,
            "peaks_count": peaks_count,
            "collection_next": collection_next_info,
            "performer_unwatched": performer_unwatched_info,
            "studio_unwatched": studio_unwatched_info,
            "surprise_me": surprise_me_info,
        }
