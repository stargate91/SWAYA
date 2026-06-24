import logging
from typing import Any, List
from sqlalchemy.orm import Session
from app.domains.metadata.models import MetadataMatch, MetadataLocalization
from app.domains.users.models import Tag
from app.domains.library.schemas import FilterOptionsResponse, TagGroupItem

logger = logging.getLogger(__name__)

class LibraryFilterService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_library_filter_options(self, tab: str, filter_ownership: str = "owned", filter_status: str = "active") -> FilterOptionsResponse:
        """
        Retrieves filter options available for the specified library tab.
        """
        is_adult = "adult" in tab.lower() or tab.lower() == "scenes"
        
        query_years = self.db.query(MetadataMatch.release_date).filter(
            MetadataMatch.release_date != None,
            MetadataMatch.is_adult == is_adult
        ).distinct().all()
        
        years = sorted(list(set(r.release_date.year for r in query_years)), reverse=True)

        query_genres = self.db.query(MetadataLocalization.genres).join(
            MetadataMatch, MetadataLocalization.match_id == MetadataMatch.id
        ).filter(
            MetadataLocalization.genres != None,
            MetadataMatch.is_adult == is_adult
        ).all()
        
        genres_set = set()
        for row in query_genres:
            if row.genres and isinstance(row.genres, list):
                for genre in row.genres:
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
