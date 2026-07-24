import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core.enums import Provider, MediaType
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

class TvEpisodeFormatter:
    def format_episodes(
        self,
        db: Session,
        tv_tmdb_id_int: int,
        season_number: int,
        all_episodes: List[Dict[str, Any]],
        local_episodes_map: Dict[tuple, Any],
        ep_limit: int,
        current_uid: int,
        resolve_img_fn: Any
    ) -> List[Dict[str, Any]]:
        # Batch query all MetadataMatch records for this show and season
        episode_matches_db = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.media_type == MediaType.EPISODE,
            MetadataMatch.season_number == season_number,
            MetadataMatch.external_id == str(tv_tmdb_id_int)
        ).all()
        episode_match_map = {m.episode_number: m for m in episode_matches_db if m.episode_number is not None}

        # Collect match IDs of all local items in this season
        query_match_ids = {m.id for m in episode_matches_db}
        for item in local_episodes_map.values():
            if item:
                query_match_ids.update(m.id for m in item.matches)
        query_match_ids_list = list(query_match_ids)
        local_item_ids = [item.id for item in local_episodes_map.values() if item]

        # Batch query all UserOverrides for the match IDs and local item IDs
        overrides_db = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            (UserOverride.metadata_match_id.in_(query_match_ids_list) if query_match_ids_list else False) |
            (UserOverride.media_item_id.in_(local_item_ids) if local_item_ids else False)
        ).all() if (query_match_ids_list or local_item_ids) else []

        meta_override_map = {o.metadata_match_id: o for o in overrides_db if o.metadata_match_id}
        phys_override_map = {o.media_item_id: o for o in overrides_db if o.media_item_id}

        episodes = []
        for ep in all_episodes[:ep_limit]:
            ep_num = ep.get("episode_number")
            local_item = local_episodes_map.get((season_number, ep_num))
            
            episode_match = episode_match_map.get(ep_num)
            metadata_override = meta_override_map.get(episode_match.id) if episode_match else None
            physical_override = phys_override_map.get(local_item.id) if local_item else None
            
            from app.modules.library.services.detail.detail_mixins import OverrideResolver
            is_watched, watch_count, resume_position, last_watched_at_dt = OverrideResolver.merge_watch_state(
                metadata_override=metadata_override,
                physical_override=physical_override
            )
            last_watched_at = last_watched_at_dt.isoformat() if last_watched_at_dt else None

            is_multi_episode = False
            if local_item:
                siblings = [k for k, v in local_episodes_map.items() if v.id == local_item.id]
                if len(siblings) > 1:
                    is_multi_episode = True
                    sibling_match_ids = {m.id for m in local_item.matches}
                    sibling_overrides = [
                        o for o in overrides_db
                        if o.media_item_id == local_item.id or o.metadata_match_id in sibling_match_ids
                    ]
                    for sov in sibling_overrides:
                        if sov.is_watched:
                            is_watched = True
                        if sov.watch_count and sov.watch_count > watch_count:
                            watch_count = sov.watch_count
                        if sov.resume_position and sov.resume_position > resume_position:
                            resume_position = sov.resume_position
                        if sov.last_watched_at:
                            if not last_watched_at or sov.last_watched_at.isoformat() > last_watched_at:
                                last_watched_at = sov.last_watched_at.isoformat()
            playback_logs = []
            technical = None
            if local_item:
                playback_logs = local_item.formatted_playback_logs
                technical = local_item.technical_info
             
            still = None
            if episode_match:
                still = episode_match.local_still_path or episode_match.still_path
            if not still:
                still = ep.get("still_path")

            if still and not still.startswith("/media/"):
                try:
                    from app.modules.tasks.image_download_service import ImageDownloadService
                    from app.modules.media_assets.services.images import queue_img_download
                    adapter = ImageDownloadService()
                    queue_img_download(adapter, still, "stills", f"tmdb_tv_{tv_tmdb_id_int}_s{season_number}_e{ep_num}")
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)

            from app.core.episode_utils import format_episode_code
            disp_code = format_episode_code(season_number, ep_num)

            episodes.append({
                "id": f"tmdb_{tv_tmdb_id_int}_{season_number}_{ep_num}",
                "episode_number": ep_num,
                "title": ep.get("name") or f"Episode {ep_num}",
                "overview": ep.get("overview"),
                "still_path": resolve_img_fn(still, "stills"),
                "runtime": ep.get("runtime"),
                "rating_tmdb": ep.get("vote_average"),
                "vote_count_tmdb": ep.get("vote_count"),
                "air_date": ep.get("air_date"),
                "path": local_item.current_path if local_item else None,
                "filename": local_item.filename if local_item else None,
                "media_item_id": local_item.id if local_item else None,
                "watch_count": watch_count,
                "is_watched": is_watched,
                "resume_position": resume_position,
                "last_watched_at": last_watched_at,
                "in_library": local_item is not None,
                "is_missing": local_item is None,
                "is_multi_episode": is_multi_episode,
                "playback_logs": playback_logs,
                "technical": technical,
                "display_episode_code": disp_code,
            })
        return episodes