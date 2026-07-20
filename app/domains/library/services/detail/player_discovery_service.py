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
        first_episode_info = None

        # Filter items we have watched already
        watched_item_ids_q = db.query(UserOverride.media_item_id).filter(
            UserOverride.user_id == current_uid,
            UserOverride.is_watched == True,
            UserOverride.media_item_id.isnot(None)
        )

        # TV Show Next Episode check
        if match and match.media_type and match.media_type.value == "episode":
            current_season = match.season_number
            current_ep = match.episode_number
            current_ep_num = 0
            if isinstance(current_ep, list) and current_ep:
                try:
                    current_ep_num = int(current_ep[-1])
                except (ValueError, TypeError):
                    current_ep_num = 0
            elif isinstance(current_ep, (int, float)):
                current_ep_num = int(current_ep)
            elif isinstance(current_ep, str):
                try:
                    import json
                    parsed = json.loads(current_ep)
                    if isinstance(parsed, list) and parsed:
                        current_ep_num = int(parsed[-1])
                    else:
                        current_ep_num = int(parsed)
                except Exception:
                    try:
                        current_ep_num = int(current_ep)
                    except (ValueError, TypeError):
                        current_ep_num = 0

            # Get all active episodes for the show by navigating the parent hierarchy (Episode -> Season -> TV Show)
            season_match = db.query(MetadataMatch).filter(MetadataMatch.id == match.parent_id).first()
            show_match = None
            if season_match:
                show_match = db.query(MetadataMatch).filter(MetadataMatch.id == season_match.parent_id).first()

            episodes = []
            if show_match:
                seasons = db.query(MetadataMatch).filter(
                    MetadataMatch.parent_id == show_match.id,
                    MetadataMatch.media_type == MediaType.SEASON
                ).all()
                season_ids = [s.id for s in seasons]
                if season_ids:
                    episodes = db.query(MetadataMatch).join(MediaItem).filter(
                        MetadataMatch.parent_id.in_(season_ids),
                        MetadataMatch.media_type == MediaType.EPISODE,
                        MetadataMatch.is_active == True,
                        MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
                        ~MetadataMatch.media_item_id.in_(watched_item_ids_q)
                    ).all()

            candidate = None
            for ep in episodes:
                ep_season = ep.season_number
                ep_num_raw = ep.episode_number
                
                # Parse episode number
                ep_num = 0
                if isinstance(ep_num_raw, list) and ep_num_raw:
                    try:
                        ep_num = int(ep_num_raw[-1])
                    except (ValueError, TypeError):
                        ep_num = 0
                elif isinstance(ep_num_raw, (int, float)):
                    ep_num = int(ep_num_raw)
                elif isinstance(ep_num_raw, str):
                    try:
                        import json
                        parsed = json.loads(ep_num_raw)
                        if isinstance(parsed, list) and parsed:
                            ep_num = int(parsed[-1])
                        else:
                            ep_num = int(parsed)
                    except Exception:
                        try:
                            ep_num = int(ep_num_raw)
                        except (ValueError, TypeError):
                            ep_num = 0

                # Check if this episode comes after the current one
                if (ep_season > current_season) or (ep_season == current_season and ep_num > current_ep_num):
                    if candidate is None:
                        candidate = (ep, ep_season, ep_num)
                    else:
                        cand_ep, cand_season, cand_num = candidate
                        if (ep_season < cand_season) or (ep_season == cand_season and ep_num < cand_num):
                            candidate = (ep, ep_season, ep_num)

            first_episode_info = None
            if show_match and season_ids:
                all_episodes = db.query(MetadataMatch).join(MediaItem).filter(
                    MetadataMatch.parent_id.in_(season_ids),
                    MetadataMatch.media_type == MediaType.EPISODE,
                    MetadataMatch.is_active == True,
                    MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
                ).all()
                if all_episodes:
                    def get_ep_num(e):
                        val = e.episode_number
                        if isinstance(val, list) and val:
                            return int(val[0])
                        try:
                            import json
                            parsed = json.loads(val)
                            if isinstance(parsed, list) and parsed:
                                return int(parsed[0])
                            return int(parsed)
                        except Exception:
                            try:
                                return int(val)
                            except Exception:
                                return 0
                    all_episodes.sort(key=lambda e: (e.season_number or 0, get_ep_num(e)))
                    first_ep = all_episodes[0]
                    first_loc = db.query(MetadataLocalization).filter(MetadataLocalization.match_id == first_ep.id).first()
                    first_title = first_loc.title if first_loc else (first_ep.original_title or f"Episode {first_ep.episode_number}")
                    first_still = first_ep.local_still_path or first_ep.still_path
                    first_episode_info = {
                        "id": first_ep.media_item_id,
                        "title": f"S{str(first_ep.season_number).zfill(2)}E{str(first_ep.episode_number or 0).zfill(2)} - {first_title}",
                        "still_path": first_still
                    }

            if candidate:
                next_ep_match = candidate[0]
                next_loc = db.query(MetadataLocalization).filter(MetadataLocalization.match_id == next_ep_match.id).first()
                next_title = next_loc.title if next_loc else (next_ep_match.original_title or f"Episode {next_ep_match.episode_number}")
                next_still = next_ep_match.local_still_path or next_ep_match.still_path
                next_episode_info = {
                    "id": next_ep_match.media_item_id,
                    "title": f"S{str(next_ep_match.season_number).zfill(2)}E{str(next_ep_match.episode_number or 0).zfill(2)} - {next_title}",
                    "still_path": next_still
                }

        # Movie & Scene Discovery
        if match:
            excluded_discovery_ids = {match.media_item_id}
            
            # Collection Next (for movies in a Collection)
            if media_type == "movie" and match.collection_id:
                next_in_col = db.query(MetadataMatch).filter(
                    MetadataMatch.collection_id == match.collection_id,
                    MetadataMatch.media_type == MediaType.MOVIE,
                    MetadataMatch.id != match.id,
                    MetadataMatch.is_active == True,
                    MetadataMatch.media_item_id.isnot(None),
                    ~MetadataMatch.media_item_id.in_(watched_item_ids_q)
                ).first()
                if next_in_col:
                    collection_next_info = cls.to_discovery_item(db, next_in_col, current_uid, settings_adapter)
                    if collection_next_info and collection_next_info.get("id"):
                        excluded_discovery_ids.add(collection_next_info["id"])

            # Performer Unwatched (for Scene performers)
            if media_type == "scene":
                from app.domains.people.models import MediaPersonLink, Person
                
                gender_pref = settings_adapter.get_setting("adult_gender_preference", user_id=current_uid) or "all"
                
                perf_links = db.query(MediaPersonLink, Person.gender).join(Person, Person.id == MediaPersonLink.person_id).filter(
                    MediaPersonLink.match_id == match.id
                ).all()
                
                selected_link = None
                if gender_pref == "female":
                    selected_link = next((pl for pl, gender in perf_links if gender == 1), None)
                elif gender_pref == "male":
                    selected_link = next((pl for pl, gender in perf_links if gender == 2), None)
                
                if not selected_link and perf_links:
                    selected_link = perf_links[0][0]
                
                if selected_link:
                    perf_id = selected_link.person_id
                    next_perf_scene = db.query(MetadataMatch).join(MediaPersonLink, MediaPersonLink.match_id == MetadataMatch.id).filter(
                        MediaPersonLink.person_id == perf_id,
                        MetadataMatch.media_type == MediaType.SCENE,
                        MetadataMatch.id != match.id,
                        MetadataMatch.is_active == True,
                        MetadataMatch.media_item_id.isnot(None),
                        ~MetadataMatch.media_item_id.in_(watched_item_ids_q),
                        ~MetadataMatch.media_item_id.in_(list(excluded_discovery_ids))
                    ).first()
                    if next_perf_scene:
                        performer_unwatched_info = cls.to_discovery_item(db, next_perf_scene, current_uid, settings_adapter)
                        if performer_unwatched_info:
                            perf = db.query(Person).filter(Person.id == perf_id).first()
                            performer_unwatched_info["performer_name"] = perf.name if perf else "Unknown Performer"
                            if performer_unwatched_info.get("id"):
                                excluded_discovery_ids.add(performer_unwatched_info["id"])

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
                    ~MetadataMatch.media_item_id.in_(watched_item_ids_q),
                    ~MetadataMatch.media_item_id.in_(list(excluded_discovery_ids))
                ).first()
                if next_stud_match:
                    studio_unwatched_info = cls.to_discovery_item(db, next_stud_match, current_uid, settings_adapter)
                    if studio_unwatched_info:
                        from app.domains.metadata.models import Studio
                        studio_row = db.query(Studio).filter(Studio.id == stud_id).first()
                        studio_unwatched_info["studio_name"] = studio_row.name if studio_row else "Unknown Studio"
                        if studio_unwatched_info.get("id"):
                            excluded_discovery_ids.add(studio_unwatched_info["id"])

            # Surprise Me (Random unwatched same type, excluding already recommended items)
            from sqlalchemy.sql.expression import func
            is_adult_filter = MetadataMatch.is_adult == True if is_adult else (MetadataMatch.is_adult == False) | (MetadataMatch.is_adult.is_(None))

            rand_match = db.query(MetadataMatch).filter(
                MetadataMatch.media_type == match.media_type,
                MetadataMatch.id != match.id,
                MetadataMatch.is_active == True,
                MetadataMatch.media_item_id.isnot(None),
                is_adult_filter,
                ~MetadataMatch.media_item_id.in_(watched_item_ids_q),
                ~MetadataMatch.media_item_id.in_(list(excluded_discovery_ids))
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
            "first_episode": first_episode_info,
            "peaks_count": peaks_count,
            "collection_next": collection_next_info,
            "performer_unwatched": performer_unwatched_info,
            "studio_unwatched": studio_unwatched_info,
            "surprise_me": surprise_me_info,
        }
