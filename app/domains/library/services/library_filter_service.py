import logging
from typing import Any, List
from sqlalchemy.orm import Session
from app.domains.metadata.models import MetadataMatch, MetadataLocalization
from app.domains.users.models import Tag
from app.application.library.schemas import FilterOptionsResponse, TagGroupItem

logger = logging.getLogger(__name__)

class LibraryFilterService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_library_filter_options(self, tab: str, filter_ownership: str = "owned", filter_status: str = "active") -> FilterOptionsResponse:
        """
        Retrieves filter options available for the specified library tab.
        """
        is_adult = "adult" in tab.lower() or tab.lower() == "scenes"
        
        from app.domains.library.models import MediaItem
        from app.shared_kernel.enums import ItemStatus, MediaType
        from sqlalchemy import select
        
        lib_statuses = [ItemStatus.ORGANIZED, ItemStatus.RENAMED]
        
        # Determine the set of active, owned MetadataMatch IDs for the current tab
        if tab == "movies":
            match_ids_subquery = select(MetadataMatch.id).join(MediaItem).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.media_type == MediaType.MOVIE,
                MetadataMatch.is_active == True,
                MetadataMatch.is_adult == is_adult
            ).scalar_subquery()
        elif tab in ("scenes", "adult_scenes"):
            match_ids_subquery = select(MetadataMatch.id).join(MediaItem).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.media_type == MediaType.SCENE,
                MetadataMatch.is_active == True,
                MetadataMatch.is_adult == is_adult
            ).scalar_subquery()
        elif tab in ("tv", "series", "tv_shows", "adult_tv", "adult_series"):
            season_parent_ids = select(MetadataMatch.parent_id).join(MediaItem).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.media_type == MediaType.EPISODE,
                MetadataMatch.is_active == True,
                MetadataMatch.is_adult == is_adult
            ).scalar_subquery()
            
            tv_ids = select(MetadataMatch.parent_id).filter(
                MetadataMatch.id.in_(season_parent_ids),
                MetadataMatch.parent_id != None
            ).scalar_subquery()
            
            match_ids_subquery = select(MetadataMatch.id).filter(
                MetadataMatch.id.in_(tv_ids),
                MetadataMatch.media_type == MediaType.TV,
                MetadataMatch.is_adult == is_adult
            ).scalar_subquery()
        else:
            match_ids_subquery = select(MetadataMatch.id).filter(
                MetadataMatch.is_adult == is_adult
            ).scalar_subquery()
            
        # 1. Fetch years
        query_years = self.db.query(MetadataMatch.release_date).filter(
            MetadataMatch.id.in_(match_ids_subquery),
            MetadataMatch.release_date != None
        ).distinct().all()
        
        years = sorted(list(set(r.release_date.year for r in query_years)), reverse=True)

        # 2. Fetch genres
        from app.shared_kernel.genre_utils import split_genres as _split_genres
        query_genres = self.db.query(MetadataLocalization.genres).filter(
            MetadataLocalization.match_id.in_(match_ids_subquery),
            MetadataLocalization.genres != None
        ).all()
        
        genres_set = set()
        for row in query_genres:
            if row.genres and isinstance(row.genres, list):
                for genre in _split_genres(row.genres):
                    if genre:
                        genres_set.add(genre.strip())
        genres = sorted(list(genres_set))

        tags_query = self.db.query(Tag).filter(Tag.is_adult == is_adult).all()
        tags = [
            {
                "id": t.id,
                "name": t.name,
                "color": t.color,
                "is_adult": t.is_adult
            }
            for t in tags_query
        ]

        return FilterOptionsResponse(
            genres=genres,
            years=years,
            tags=tags
        )

    def get_tag_groups(self, is_adult: bool = False) -> List[TagGroupItem]:
        """
        Retrieves available tag groups.
        """
        tags_query = self.db.query(Tag).filter(Tag.is_adult == is_adult).all()
        if not tags_query:
            return []
        tags = [
            {
                "id": t.id,
                "name": t.name,
                "color": t.color,
                "is_adult": t.is_adult
            }
            for t in tags_query
        ]
        return [
            TagGroupItem(
                id=1,
                name="General" if not is_adult else "Adult",
                tags=tags
            )
        ]
