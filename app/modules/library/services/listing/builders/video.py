from typing import Tuple, Any, List
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.core.enums import MediaType
from app.modules.library.services.listing.filter_params import ListingFilterParams
from app.modules.library.services.listing.builders.base import BaseQueryBuilder

class VideoQueryBuilder(BaseQueryBuilder):
    def build_query(self, params: ListingFilterParams) -> Tuple[Any, int, List[MetadataMatch]]:
        query = self.db.query(MetadataMatch).outerjoin(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).options(
            selectinload(MetadataMatch.localizations),
            selectinload(MetadataMatch.media_item),
            selectinload(MetadataMatch.overrides)
        )

        joined_localization = False
        joined_override = False

        # Only owned (in library) files are queried for videos
        query = query.filter(
            MetadataMatch.media_item_id.isnot(None),
            MediaItem.status.in_(self.lib_statuses),
            MetadataMatch.is_active,
            MetadataMatch.media_type == MediaType.VIDEO
        )

        if params.selected_performer_id:
            from app.modules.people.models import MediaPersonLink
            query = query.join(MetadataMatch.people_links).filter(MediaPersonLink.person_id == params.selected_performer_id)

        if params.selected_studio_id:
            from app.modules.metadata.models import Studio
            query = query.join(MetadataMatch.studios).filter(
                or_(
                    Studio.id == params.selected_studio_id,
                    Studio.parent_studio_id == params.selected_studio_id
                )
            )

        query, joined_localization, joined_override = self._apply_common_filters(
            query, params, joined_localization, joined_override
        )

        from sqlalchemy import select

        canonical_match_ids = self.db.query(
            func.min(MetadataMatch.id).label('min_id')
        ).filter(
            MetadataMatch.media_item_id.isnot(None),
            MetadataMatch.is_active,
            MetadataMatch.is_adult == params.include_adult,
            MetadataMatch.media_type == MediaType.VIDEO
        ).group_by(MetadataMatch.media_item_id).subquery()
        query = query.filter(MetadataMatch.id.in_(select(canonical_match_ids.c.min_id)))

        query = self._apply_sorting(query, params, joined_localization, joined_override)
        total_items = query.count()
        items = query.offset((params.page - 1) * params.page_size).limit(params.page_size).all()
        return query, total_items, items
