from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.modules.history.models import PlaybackLog
from app.modules.metadata.models import MetadataLocalization

class TvPlaybackResolver:
    def resolve_playback_and_progress(
        self,
        db: Session,
        tv_tmdb_id_int: int,
        local_item_ids: List[int],
        episode_match_ids: List[int],
        episode_matches: List[Any],
        item_episodes_map: Dict[int, List[tuple]],
        overrides: List[Any]
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Resolves playback logs and in-progress episodes for all episodes under a TV show."""
        playback_logs_db = db.query(PlaybackLog).filter(
            PlaybackLog.media_item_id.in_(local_item_ids)
        ).order_by(PlaybackLog.watched_at.desc()).all() if local_item_ids else []

        localizations = db.query(MetadataLocalization).filter(
            MetadataLocalization.match_id.in_(episode_match_ids)
        ).all() if episode_match_ids else []
        loc_map = {x.match_id: x.title for x in localizations if x.title}

        playback_logs = []
        seen_logs = set()
        for log in playback_logs_db:
            eps = item_episodes_map.get(log.media_item_id, [])
            for s_num, ep_num in eps:
                match = next((m for m in episode_matches if m.season_number == s_num and m.episode_number == ep_num), None)
                ep_title = loc_map.get(match.id) if match else None
                if not ep_title:
                    ep_title = f"Episode {ep_num}"
                
                watched_at_str = log.watched_at.isoformat()
                log_key = (s_num, ep_num, watched_at_str)
                if log_key in seen_logs:
                    continue
                seen_logs.add(log_key)
                
                playback_logs.append({
                    "id": f"{log.id}_{s_num}_{ep_num}",
                    "watched_at": watched_at_str,
                    "seasonNumber": s_num,
                    "episodeNumber": ep_num,
                    "episodeTitle": ep_title,
                    "episodeId": f"tmdb_{tv_tmdb_id_int}_{s_num}_{ep_num}" if not match else str(match.media_item_id or f"tmdb_{tv_tmdb_id_int}_{s_num}_{ep_num}")
                })

        in_progress_episodes = []
        for o in overrides:
            if o.resume_position > 0 and not o.is_watched:
                s_num = None
                ep_num = None
                ep_title = None
                if o.metadata_match_id:
                    match = next((m for m in episode_matches if m.id == o.metadata_match_id), None)
                    if match:
                        s_num = match.season_number
                        ep_num = match.episode_number
                        ep_title = loc_map.get(match.id)
                elif o.media_item_id:
                    eps = item_episodes_map.get(o.media_item_id, [])
                    if eps:
                        s_num, ep_num = eps[0]
                        match = next((m for m in episode_matches if m.season_number == s_num and m.episode_number == ep_num), None)
                        if match:
                            ep_title = loc_map.get(match.id)
                
                if s_num is not None and ep_num is not None:
                    if not ep_title:
                        ep_title = f"Episode {ep_num}"
                    in_progress_episodes.append({
                        "id": f"tmdb_{tv_tmdb_id_int}_{s_num}_{ep_num}",
                        "episode_number": ep_num,
                        "title": ep_title,
                        "resume_position": o.resume_position,
                        "season_number": s_num
                    })

        return playback_logs, in_progress_episodes
