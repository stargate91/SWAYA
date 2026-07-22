import logging
from typing import Optional, Any
from itertools import combinations
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.core.enums import ItemStatus, MediaType
from app.modules.library.schemas import LibraryStatsResponse



logger = logging.getLogger(__name__)

class LibraryStatsService:
    def __init__(self, db_session: Session, settings: Optional[Any] = None):
        self.db = db_session
        self.settings = settings

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes >= 1024 ** 4:
            return f"{size_bytes / (1024 ** 4):.1f} TB"
        if size_bytes >= 1024 ** 3:
            return f"{size_bytes / (1024 ** 3):.1f} GB"
        return f"{size_bytes / (1024 ** 2):.0f} MB"

    def get_stats(self, include_adult: bool = False) -> LibraryStatsResponse:
        """
        Calculates and returns statistics of library media assets, including storage,
        movies, tv, and episode counts.
        """
        library_statuses = [ItemStatus.ORGANIZED, ItemStatus.RENAMED]

        # 1. Total storage size (sum of file size on organized library items)
        storage_bytes = self.db.query(func.sum(MediaItem.size)).filter(
            MediaItem.status.in_(library_statuses)
        ).scalar() or 0
        storage_str = self._format_size(storage_bytes)

        # 2. Total movies
        movies_query = self.db.query(func.count(MediaItem.id)).select_from(MediaItem).join(
            MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id)
        ).filter(
            MediaItem.status.in_(library_statuses),
            MetadataMatch.media_type == MediaType.MOVIE,
            MetadataMatch.is_active
        )
        if not include_adult:
            movies_query = movies_query.filter(~MetadataMatch.is_adult)
        total_movies = movies_query.scalar() or 0

        # 3. Total TV shows (unique tv show matches)
        tv_shows_query = self.db.query(func.count(MetadataMatch.id)).filter(
            MetadataMatch.media_type == MediaType.TV,
            MetadataMatch.is_active
        )
        if not include_adult:
            tv_shows_query = tv_shows_query.filter(~MetadataMatch.is_adult)
        total_tv = tv_shows_query.scalar() or 0

        # 4. Total episodes
        episodes_query = self.db.query(func.count(MediaItem.id)).select_from(MediaItem).join(
            MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id)
        ).filter(
            MediaItem.status.in_(library_statuses),
            MetadataMatch.media_type == MediaType.EPISODE,
            MetadataMatch.is_active
        )
        if not include_adult:
            episodes_query = episodes_query.filter(~MetadataMatch.is_adult)
        total_episodes = episodes_query.scalar() or 0


        def get_count(m_type, adult_val):
            return self.db.query(func.count(MediaItem.id)).select_from(MediaItem).join(
                MetadataMatch, (MetadataMatch.media_item_id == MediaItem.id)
            ).filter(
                MediaItem.status.in_(library_statuses),
                MetadataMatch.media_type == m_type,
                MetadataMatch.is_active,
                MetadataMatch.is_adult == adult_val
            ).scalar() or 0

        total_scenes = get_count(MediaType.SCENE, include_adult)
        total_videos = get_count(MediaType.VIDEO, include_adult)

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
                elif m.media_type.is_adult:
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
            if str(item_scan_mode).strip().lower() == "scenes":
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
            elif m.media_type.is_adult:
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

        def is_single_genre_label(label: str) -> bool:
            normalized = str(label or "").strip().lower()
            if not normalized:
                return False
            if "&" in normalized or "/" in normalized or "," in normalized:
                return False
            import re
            if re.search(r"\b(and|és)\b", normalized):
                return False
            return True

        for genre_id, count in genre_dist_ids.items():
            label = genre_labels.get(genre_id, genre_id)
            genre_dist[label] = count

        filtered_genre_dist_ids = {gid: cnt for gid, cnt in genre_dist_ids.items() if is_single_genre_label(genre_labels.get(gid, gid))}
        top_genre_ids = sorted(filtered_genre_dist_ids.items(), key=lambda x: x[1], reverse=True)[:12]

        is_mocked = False
        has_enough_data = False

        if len(top_genre_ids) < 3:
            is_mocked = True
            if include_adult:
                mock_labels = ["Anal", "Blowjob", "All Sex", "POV", "Hardcore", "Solo"]
            else:
                mock_labels = ["Action", "Comedy", "Drama", "Thriller", "Sci-Fi", "Adventure"]

            top_genre_ids = [(label.lower(), 10 - idx) for idx, label in enumerate(mock_labels)]
            genre_labels.update({label.lower(): label for label in mock_labels})

            constellation_nodes = [
                {
                    "id": genre_id,
                    "label": genre_labels.get(genre_id, genre_id),
                    "count": count,
                }
                for genre_id, count in top_genre_ids
            ]

            constellation_links = []
            for a_idx, b_idx in [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (0, 2), (1, 3)]:
                constellation_links.append({
                    "source": mock_labels[a_idx].lower(),
                    "target": mock_labels[b_idx].lower(),
                    "count": 5
                })
        else:
            is_mocked = False
            insight_title_count = sum(1 for m in unique_matches if m.release_date and m.release_date.year >= 1900)
            has_enough_data = (insight_title_count >= 4) and (len(top_genre_ids) >= 3)

            constellation_nodes = [
                {
                    "id": genre_id,
                    "label": genre_labels.get(genre_id, genre_id),
                    "count": count,
                }
                for genre_id, count in top_genre_ids
            ]
            top_genre_id_set = {genre_id for genre_id, _ in top_genre_ids}
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

        # Calculate decade timeline sufficiency and mock it if needed
        insight_title_count = sum(1 for m in unique_matches if m.release_date and m.release_date.year >= 1900)
        timeline_is_mocked = len(decade_dist) < 2
        timeline_has_enough_data = (not timeline_is_mocked) and (insight_title_count >= 5)

        if timeline_is_mocked:
            decade_dist = {
                "1980s": 3,
                "1990s": 6,
                "2000s": 12,
                "2010s": 8,
                "2020s": 5
            }

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
            genre_constellation={
                "nodes": constellation_nodes,
                "links": constellation_links,
                "is_mocked": is_mocked,
                "has_enough_data": has_enough_data
            },
            decade_distribution=decade_dist,
            timeline_is_mocked=timeline_is_mocked,
            timeline_has_enough_data=timeline_has_enough_data
        )
