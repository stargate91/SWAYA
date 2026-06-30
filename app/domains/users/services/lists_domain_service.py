from typing import Dict, Any, Optional
from datetime import datetime

from app.domains.users.models import CustomList, CustomListItem
from app.shared_kernel.enums import CustomListType

class ListsDomainService:
    @staticmethod
    def create_default_watchlist() -> CustomList:
        return CustomList(
            name="Watchlist",
            description="Default system watchlist.",
            list_type=CustomListType.MEDIA,
            color="#3b82f6",
            icon="Bookmark"
        )

    @staticmethod
    def create_custom_list(name: str, description: Optional[str], color: str, icon: str) -> CustomList:
        return CustomList(
            name=name,
            description=description,
            color=color,
            icon=icon
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
