import logging
from typing import List, Optional, Union
from sqlalchemy.orm import Session

from app.core.enums import Provider
from app.modules.users.models import CustomList
from app.modules.recommendations.schemas import ActionResponse
from app.modules.users.services.lists_service import ListsService

logger = logging.getLogger(__name__)


class RecommendationWatchlistService:
    def __init__(self, db: Session):
        self.db = db
        self.lists_service = ListsService(db)

    def fetch_watchlist_ids(self) -> List[Union[int, str]]:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            return []
        ids = []
        for item in watchlist.items:
            if item.match:
                if item.match.provider == Provider.TMDB and item.match.external_id.isdigit():
                    ids.append(int(item.match.external_id))
                else:
                    ids.append(f"{item.match.provider.value}_{item.match.external_id}")
            elif item.media_item_id:
                ids.append(item.media_item_id)
        return ids

    def add_to_watchlist(self, tmdb_id: Optional[Union[int, str]], media_type: str, media_item_id: Optional[Union[int, str]] = None) -> ActionResponse:
        # Get watchlist ID
        lists = self.lists_service.get_all_lists()
        watchlist = next((lst for lst in lists if lst.name == "Watchlist"), None)
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")
        
        payload = {"media_type": media_type}
        if media_item_id:
            payload["media_item_id"] = media_item_id
        else:
            payload["tmdb_id"] = tmdb_id

        item = self.lists_service.add_item_to_list(watchlist.id, payload)
        return ActionResponse(status="success", id=item.id)

    def remove_from_watchlist(self, tmdb_id: Union[int, str]) -> ActionResponse:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            return ActionResponse(status="error", message="Watchlist not found")
        
        provider = Provider.TMDB
        external_id = str(tmdb_id)
        if isinstance(tmdb_id, str) and "_" in tmdb_id:
            prefix, val = tmdb_id.split("_", 1)
            from app.modules.scrapers.support.registry import ProviderRegistry
            resolved = ProviderRegistry.resolve_prefix(prefix)
            if resolved:
                provider = resolved
                external_id = val

        list_item_id = None
        for item in watchlist.items:
            if item.match and item.match.provider == provider and item.match.external_id == external_id:
                list_item_id = item.id
                break
            if item.media_item_id and str(item.media_item_id) == str(tmdb_id):
                list_item_id = item.id
                break
        
        if list_item_id is not None:
            self.lists_service.remove_item_from_list(watchlist.id, list_item_id)
            return ActionResponse(status="success")
            
        return ActionResponse(status="error", message="Item not found in watchlist")
