from typing import Any, Dict, List, Set, Tuple
from sqlalchemy.orm import Session, joinedload
from app.core.enums import MediaType, ItemStatus, Provider
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride

class TvLocalResolver:
    def resolve_local_data(
        self,
        db: Session,
        tv_tmdb_id_int: int,
        current_uid: int
    ) -> Tuple[List[MediaItem], List[Dict[str, Any]], Dict[Tuple[int, int], MediaItem], Dict[int, List[Tuple[int, int]]], Set[Tuple[int, int]], List[int], List[int]]:
        """Loads and maps local episodes, extras, item/episode associations, and watched episodes set."""
        local_items = db.query(MediaItem).options(
            joinedload(MediaItem.extras),
            joinedload(MediaItem.matches)
        ).join(MediaItem.matches).filter(
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.media_type == MediaType.EPISODE,
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
        ).all()

        # Deduplicate local_items by item.id
        unique_items = []
        seen_item_ids = set()
        for item in local_items:
            if item.id not in seen_item_ids:
                seen_item_ids.add(item.id)
                unique_items.append(item)
        local_items = unique_items

        extras_list = []
        for item in local_items:
            if item.extras:
                match = next((m for m in item.matches if m.season_number is not None and m.episode_number is not None), None)
                if match:
                    parent_label = f"S{match.season_number:02d}E{match.episode_number:02d}"
                else:
                    parent_label = "Extras"

                for ex in item.extras:
                    extras_list.append({
                        "id": ex.id,
                        "name": ex.filename,
                        "path": ex.current_path,
                        "category": ex.category.value if hasattr(ex.category, "value") else str(ex.category),
                        "subtype": ex.subtype.value if (ex.subtype and hasattr(ex.subtype, "value")) else (str(ex.subtype) if ex.subtype else None),
                        "language": ex.language,
                        "parent_label": parent_label,
                    })

        local_episodes_map = {}
        for item in local_items:
            for match in item.matches:
                if match.season_number is not None and match.episode_number is not None:
                    ep_num = match.episode_number
                    if isinstance(ep_num, list):
                        for num in ep_num:
                            local_episodes_map[(match.season_number, num)] = item
                    else:
                        local_episodes_map[(match.season_number, int(ep_num))] = item

        episode_matches = db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.media_type == MediaType.EPISODE,
            MetadataMatch.external_id == str(tv_tmdb_id_int)
        ).all()
        episode_matches = [m for m in episode_matches if m.provider == Provider.TMDB]
        episode_match_ids = [m.id for m in episode_matches]
        local_item_ids = [item.id for item in local_items]

        overrides = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            (UserOverride.metadata_match_id.in_(episode_match_ids)) | (UserOverride.media_item_id.in_(local_item_ids))
        ).all() if (episode_match_ids or local_item_ids) else []

        item_episodes_map = {}
        for item in local_items:
            eps = []
            seen_eps = set()
            for match in item.matches:
                if match.season_number is not None and match.episode_number is not None:
                    ep_num = match.episode_number
                    if isinstance(ep_num, list):
                        for num in ep_num:
                            pair = (match.season_number, num)
                            if pair not in seen_eps:
                                seen_eps.add(pair)
                                eps.append(pair)
                    else:
                        pair = (match.season_number, int(ep_num))
                        if pair not in seen_eps:
                            seen_eps.add(pair)
                            eps.append(pair)
            item_episodes_map[item.id] = eps

        watched_episodes_set = set()
        for o in overrides:
            if o.is_watched:
                if o.metadata_match_id:
                    match = next((m for m in episode_matches if m.id == o.metadata_match_id), None)
                    if match:
                        if isinstance(match.episode_number, list):
                            for ep_num in match.episode_number:
                                watched_episodes_set.add((match.season_number, ep_num))
                        else:
                            watched_episodes_set.add((match.season_number, match.episode_number))
                elif o.media_item_id:
                    eps = item_episodes_map.get(o.media_item_id, [])
                    for s_num, ep_num in eps:
                        watched_episodes_set.add((s_num, ep_num))

        return local_items, extras_list, local_episodes_map, item_episodes_map, watched_episodes_set, episode_match_ids, local_item_ids, episode_matches, overrides
