from typing import Optional
from datetime import datetime

from app.modules.users.models import CustomList, CustomListItem
from app.core.enums import CustomListType

class ListsDomainService:
    @staticmethod
    def create_default_watchlist() -> CustomList:
        return CustomList(
            name="Watchlist",
            description="Your go-to space for everything you want to watch later.",
            list_type=CustomListType.MEDIA,
            color="#3b82f6"
        )

    @staticmethod
    def create_custom_list(name: str, description: Optional[str], color: str, list_type: CustomListType = CustomListType.MEDIA) -> CustomList:
        return CustomList(
            name=name,
            description=description,
            color=color,
            list_type=list_type
        )

    @staticmethod
    def create_list_item(
        list_id: int,
        media_item_id: Optional[int] = None,
        match_id: Optional[int] = None,
        person_id: Optional[int] = None,
        studio_id: Optional[int] = None,
        collection_id: Optional[int] = None
    ) -> CustomListItem:
        return CustomListItem(
            list_id=list_id,
            media_item_id=media_item_id,
            match_id=match_id,
            person_id=person_id,
            studio_id=studio_id,
            collection_id=collection_id,
            added_at=datetime.utcnow()
        )
