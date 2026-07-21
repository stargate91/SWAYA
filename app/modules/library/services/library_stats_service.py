import logging
from typing import Optional
from itertools import combinations
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.core.enums import ItemStatus, MediaType
from app.modules.library.schemas import LibraryStatsResponse



logger = logging.getLogger(__name__)

class LibraryStatsService:
    def __init__(self, db_session: Session, settings_port: Optional[SettingsPort] = None):
        self.db = db_session
        self.settings = settings_port

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes >= 1024 ** 4:
            return f"{size_bytes / (1024 ** 4):.1f} TB"
        if size_bytes >= 1024 ** 3:
            return f"{size_bytes / (1024 ** 3):.1f} GB"
        return f"{size_bytes / (1024 ** 2):.0f} MB"

    def get_stats(self, include_adult: bool = False) -> LibraryStatsResponse:
        """
        Calculates and returns statistics of library media assets, including storage,
        genres, and manual review counts.
        """
        # Standard status values for matched library files
        library_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]

        movie_query = self.db.query(func.count(MediaItem.id)).select_from(MediaItem).join(
            MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id)
        ).filter(
            MediaItem.status.in_(library_statuses),
            MetadataMatch.media_type == MediaType.MOVIE,
            MetadataMatch.is_active
        )
        if include_adult:
            movie_query = movie_query.filter(MetadataMatch.is_adult)
        else:
            movie_query = movie_query.filter(~MetadataMatch.is_adult)
        total_movies = movie_query.scalar() or 0

        # Resolve TV Shows count by climbing the parent hierarchy from active episodes
        episode_match_query = self.db.query(MetadataMatch.parent_id).join(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).filter(
            MediaItem.status.in_(library_statuses),
            MetadataMatch.media_type == MediaType.EPISODE,
            MetadataMatch.parent_id.isnot(None),
            MetadataMatch.is_active
        )
        if include_adult:
            episode_match_query = episode_match_query.filter(MetadataMatch.is_adult)
        else:
            episode_match_query = episode_match_query.filter(~MetadataMatch.is_adult)

        parent_ids = set()
        current_parents = {r[0] for r in episode_match_query.all()}
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents),
                    MetadataMatch.parent_id.isnot(None)
                ).all()
            }

        tv_count_query = self.db.query(func.count(MetadataMatch.id)).filter(
            MetadataMatch.id.in_(parent_ids),
            MetadataMatch.media_type == MediaType.TV,
            MetadataMatch.is_active
        )
        if include_adult:
            tv_count_query = tv_count_query.filter(MetadataMatch.is_adult)
        else:
            tv_count_query = tv_count_query.filter(~MetadataMatch.is_adult)
        total_tv = tv_count_query.scalar() or 0

        episodes_query = self.db.query(func.count(MediaItem.id)).select_from(MediaItem).join(
            MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id)
        ).filter(
            MediaItem.status.in_(library_statuses),
            MetadataMatch.media_type == MediaType.EPISODE,
            MetadataMatch.is_active
        )
        if include_adult:
            episodes_query = episodes_query.filter(MetadataMatch.is_adult)
        else:
            episodes_query = episodes_query.filter(~MetadataMatch.is_adult)
        total_episodes = episodes_query.scalar() or 0

        settings_adapter = self.settings
        # Mock user context if needed, or fallback to system settings
        try:
            import app.core.user_context
            current_user_id = app.core.user_context.get_current_user_id()
        except Exception:
            current_user_id = 1
            
        include_adult_setting_val = settings_adapter.get_setting("include_adult", user_id=current_user_id)
        include_adult_setting = str(include_adult_setting_val).lower() == "true"

        scenes_query = self.db.query(func.count(MediaItem.id)).select_from(MediaItem).join(
            MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id)
        ).filter(
            MediaItem.status.in_(library_statuses),
            MetadataMatch.media_type == MediaType.SCENE,
            MetadataMatch.is_active
        )
        if include_adult:
            scenes_query = scenes_query.filter(MetadataMatch.is_adult)
            total_scenes = scenes_query.filter(MetadataMatch.is_home_video == False).scalar() or 0
            total_videos = scenes_query.filter(MetadataMatch.is_home_video == True).scalar() or 0
        else:
            scenes_query = scenes_query.filter(~MetadataMatch.is_adult)
            total_scenes = scenes_query.scalar() or 0
            total_videos = 0

        # Calculate storage sizes
        items = self.db.query(MediaItem).select_from(MediaItem).join(MetadataMatch).filter(
            MediaItem.status.in_(library_statuses)
        ).options(joinedload(MediaItem.matches)).all()
        
        movie_bytes = 0
        tv_bytes = 0
        adult_bytes = 0
        drives = set()

        for item in items:
            size = item.size or 0
            path = item.current_path
            if path:
                if ":" in path:
                    drives.add(path.split(":")[0].upper() + ":")
                elif path.startswith("/"):
                    drives.add("/")

            is_tv = False
            is_scene = False
            is_adult_item = False
            for m in item.matches:
                if m.is_adult:
                    is_adult_item = True
                if m.media_type in (MediaType.TV, MediaType.EPISODE):
                    is_tv = True
                elif m.media_type == MediaType.SCENE:
                    is_scene = True

            if include_adult:
                if not is_adult_item:
                    continue
            else:
                if is_adult_item:
                    continue

            if is_tv:
                tv_bytes += size
            elif is_scene:
                adult_bytes += size
            else:
                movie_bytes += size

        total_bytes = movie_bytes + tv_bytes + adult_bytes
        storage_str = self._format_size(total_bytes)

        # Unmatched / manual reviews
        unmatched_items = self.db.query(MediaItem).filter(
            MediaItem.status.in_([ItemStatus.NEW, ItemStatus.ERROR, ItemStatus.NO_MATCH, ItemStatus.UNCERTAIN, ItemStatus.MULTIPLE])
        ).options(joinedload(MediaItem.matches)).all()

        unmatched = 0
        unmatched_new = 0
        unmatched_error = 0
        unmatched_uncertain = 0
        unmatched_no_match = 0
        unmatched_multiple = 0

        for item in unmatched_items:
            # Check if item is adult
            item_scan_mode = (item.parsed_info or {}).get("scan_mode") or ""
            if str(item_scan_mode).strip().lower() in {"scenes", "porndb_movie"}:
                is_adult = True
            else:
                active_match = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
                is_adult = active_match.is_adult if active_match else False

            if include_adult:
                if not is_adult:
                    continue
            else:
                if is_adult:
                    continue

            unmatched += 1
            if item.status == ItemStatus.NEW:
                unmatched_new += 1
            elif item.status == ItemStatus.ERROR:
                unmatched_error += 1
            elif item.status == ItemStatus.UNCERTAIN:
                unmatched_uncertain += 1
            elif item.status == ItemStatus.NO_MATCH:
                unmatched_no_match += 1
            elif item.status == ItemStatus.MULTIPLE:
                unmatched_multiple += 1

        # Dynamic genre and decade calculations
        matches = self.db.query(MetadataMatch).join(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).filter(
            MediaItem.status.in_(library_statuses)
        ).options(
            joinedload(MetadataMatch.localizations),
            joinedload(MetadataMatch.parent).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.localizations)
        ).all()

        seen_tv = set()
        unique_matches = []
        for m in matches:
            if include_adult:
                if not m.is_adult:
                    continue
            else:
                if m.is_adult:
                    continue

            if m.media_type == MediaType.MOVIE:
                unique_matches.append(m)
            elif m.media_type == MediaType.SCENE:
                unique_matches.append(m)
            elif m.media_type == MediaType.EPISODE:
                tv_match = None
                if m.parent and m.parent.parent:
                    tv_match = m.parent.parent
                elif m.parent:
                    tv_match = m.parent
                
                if tv_match:
                    if tv_match.id not in seen_tv:
                        seen_tv.add(tv_match.id)
                        unique_matches.append(tv_match)
                else:
                    unique_matches.append(m)

        genre_dist = {}
        genre_dist_ids = {}
        genre_labels = {}
        decade_dist = {}
        genre_pair_dist = {}

        from app.core.genre_utils import split_genres as _split_genres

        for m in unique_matches:
            # Decade
            year = None
            if m.release_date:
                year = m.release_date.year
            if year and year >= 1900:
                decade = (year // 10) * 10
                decade_str = f"{decade}s"
                decade_dist[decade_str] = decade_dist.get(decade_str, 0) + 1

            # Genres
            split_names = []
            if include_adult and m.is_adult and m.suggested_tags:
                for t in m.suggested_tags:
                    if t:
                        truncated = t if len(t) <= 20 else t[:17] + "..."
                        split_names.append(truncated)
            else:
                loc = m.localizations[0] if m.localizations else None
                if loc and loc.genres:
                    split_names = _split_genres(loc.genres)

            if split_names:
                unique_genre_keys = []
                for name in split_names:
                    genre_key = name
                    genre_dist_ids[genre_key] = genre_dist_ids.get(genre_key, 0) + 1
                    if genre_key not in genre_labels:
                        genre_labels[genre_key] = name
                    if genre_key not in unique_genre_keys:
                        unique_genre_keys.append(genre_key)
                
                for source_id, target_id in combinations(sorted(unique_genre_keys), 2):
                    pair_key = f"{source_id}|{target_id}"
                    genre_pair_dist[pair_key] = genre_pair_dist.get(pair_key, 0) + 1

        for genre_id, count in genre_dist_ids.items():
            label = genre_labels.get(genre_id, genre_id)
            genre_dist[label] = count

        top_genre_ids = sorted(genre_dist_ids.items(), key=lambda x: x[1], reverse=True)[:12]
        top_genre_id_set = {genre_id for genre_id, _ in top_genre_ids}
        constellation_nodes = [
            {
                "id": genre_id,
                "label": genre_labels.get(genre_id, genre_id),
                "count": count,
            }
            for genre_id, count in top_genre_ids
        ]
        constellation_links = []
        for pair_key, count in sorted(genre_pair_dist.items(), key=lambda x: x[1], reverse=True):
            source_id, target_id = pair_key.split("|", 1)
            if source_id not in top_genre_id_set or target_id not in top_genre_id_set:
                continue
            constellation_links.append({
                "source": source_id,
                "target": target_id,
                "count": count,
            })
            if len(constellation_links) >= 24:
                break

        return LibraryStatsResponse(
            total_movies=total_movies,
            total_tv=total_tv,
            total_episodes=total_episodes,
            total_scenes=total_scenes,
            total_videos=total_videos,
            storage=storage_str,
            drive_count=len(drives) or 1,
            unmatched=unmatched,
            storage_breakdown={
                "movies": self._format_size(movie_bytes),
                "tv": self._format_size(tv_bytes),
                "scenes": self._format_size(adult_bytes),
                "extras": "0 MB"
            },
            manual_review_total=unmatched,
            manual_review_breakdown={
                "new": unmatched_new,
                "error": unmatched_error,
                "uncertain": unmatched_uncertain,
                "no_match": unmatched_no_match,
                "multiple": unmatched_multiple
            },
            genre_distribution=genre_dist,
            genre_distribution_ids=genre_dist_ids,
            genre_labels=genre_labels,
            genre_constellation={"nodes": constellation_nodes, "links": constellation_links},
            decade_distribution=decade_dist
        )
