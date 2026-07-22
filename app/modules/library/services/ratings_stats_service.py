import logging
from typing import Dict, Any, List, Optional
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.enums import ItemStatus, MediaType
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.people.models import Person
from app.modules.users.models import UserOverride

logger = logging.getLogger(__name__)

class RatingsStatsService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_ratings_stats(
        self,
        current_uid: int = 1,
        include_adult: bool = False,
        adult_gender_preference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes rated/unrated counts, averages, and distribution for all media types.
        """
        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]

        # 1. Movies
        movie_query = self.db.query(
            UserOverride.user_rating,
            UserOverride.is_favorite
        ).select_from(MediaItem).join(
            MetadataMatch, and_(MetadataMatch.media_item_id == MediaItem.id, MetadataMatch.is_active == True)
        ).outerjoin(
            UserOverride, and_(UserOverride.media_item_id == MediaItem.id, UserOverride.user_id == current_uid)
        ).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.MOVIE,
            MetadataMatch.is_adult == include_adult
        )
        movies_data = movie_query.all()

        # 2. TV (Series)
        # Find active parent TV show IDs in library matching adult status
        parent_ids = set()
        current_parents = {
            r[0] for r in self.db.query(MetadataMatch.parent_id).join(
                MediaItem, MetadataMatch.media_item_id == MediaItem.id
            ).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.parent_id.isnot(None),
                MetadataMatch.is_active == True,
                MetadataMatch.is_adult == include_adult
            ).all()
        }
        while current_parents:
            parent_ids.update(current_parents)
            current_parents = {
                r[0] for r in self.db.query(MetadataMatch.parent_id).filter(
                    MetadataMatch.id.in_(current_parents),
                    MetadataMatch.parent_id.isnot(None)
                ).all()
            }

        tv_data = []
        if parent_ids:
            tv_query = self.db.query(
                UserOverride.user_rating,
                UserOverride.is_favorite
            ).select_from(MetadataMatch).outerjoin(
                UserOverride, and_(UserOverride.metadata_match_id == MetadataMatch.id, UserOverride.user_id == current_uid)
            ).filter(
                MetadataMatch.id.in_(parent_ids),
                MetadataMatch.media_type == MediaType.TV,
                MetadataMatch.is_active == True,
                MetadataMatch.is_adult == include_adult
            )
            tv_data = tv_query.all()

        # 3. Scenes (NSFW scenes)
        scenes_data = []
        if include_adult:
            scene_query = self.db.query(
                UserOverride.user_rating,
                UserOverride.is_favorite
            ).select_from(MediaItem).join(
                MetadataMatch, and_(MetadataMatch.media_item_id == MediaItem.id, MetadataMatch.is_active == True)
            ).outerjoin(
                UserOverride, and_(UserOverride.media_item_id == MediaItem.id, UserOverride.user_id == current_uid)
            ).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.media_type == MediaType.SCENE,
                MetadataMatch.is_adult == True
            )
            scenes_data = scene_query.all()

        # 4. Videos
        video_query = self.db.query(
            UserOverride.user_rating,
            UserOverride.is_favorite
        ).select_from(MediaItem).join(
            MetadataMatch, and_(MetadataMatch.media_item_id == MediaItem.id, MetadataMatch.is_active == True)
        ).outerjoin(
            UserOverride, and_(UserOverride.media_item_id == MediaItem.id, UserOverride.user_id == current_uid)
        ).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.media_type == MediaType.VIDEO,
            MetadataMatch.is_adult == include_adult
        )
        movies_data_videos = video_query.all()

        # 5. People
        people_query = self.db.query(
            UserOverride.user_rating,
            UserOverride.is_favorite
        ).select_from(Person).outerjoin(
            UserOverride, and_(UserOverride.person_id == Person.id, UserOverride.user_id == current_uid)
        ).filter(
            Person.is_active == True,
            Person.is_adult == include_adult
        )
        if include_adult and adult_gender_preference:
            if adult_gender_preference == "female":
                people_query = people_query.filter(Person.gender == 1)
            elif adult_gender_preference == "male":
                people_query = people_query.filter(Person.gender == 2)
        people_data = people_query.all()

        # Helper function to compile stats from queried rows of (user_rating, is_favorite)
        def compile_stats(rows: List[Any], is_people: bool = False) -> Dict[str, Any]:
            rated_ratings = [r[0] for r in rows if r[0] is not None]
            total_rated = len(rated_ratings)
            total_unrated = len(rows) - total_rated
            
            # Average calculation
            average = "0.0"
            if total_rated > 0:
                average = f"{sum(rated_ratings) / total_rated:.1f}"

            # Favorites count (only relevant for people in frontend logic, but calculated generally here)
            favorites_count = sum(1 for r in rows if r[1] is True) if is_people else 0

            # 20 bins distribution from 0.5 to 10.0 (step 0.5)
            # idx = round(val * 2) - 1
            distribution = [0] * 20
            for val in rated_ratings:
                if 0.5 <= val <= 10.0:
                    idx = round(val * 2) - 1
                    if 0 <= idx < 20:
                        distribution[idx] += 1

            max_count = max(distribution) if any(distribution) else 1
            distribution_rows = []
            for index, count in enumerate(distribution):
                percentage = (count / max_count) * 100.0
                rating_label = str((index + 1) / 2)
                if rating_label.endswith(".0"):
                    rating_label = rating_label[:-2]
                distribution_rows.append({
                    "count": count,
                    "percentage": percentage,
                    "ratingLabel": rating_label
                })

            return {
                "average": average,
                "totalRated": total_rated,
                "totalUnrated": total_unrated,
                "favoritesCount": favorites_count,
                "distribution": distribution,
                "distributionRows": distribution_rows
            }

        return {
            "movies": compile_stats(movies_data),
            "tv": compile_stats(tv_data),
            "scenes": compile_stats(scenes_data),
            "videos": compile_stats(movies_data_videos),
            "people": compile_stats(people_data, is_people=True)
        }
