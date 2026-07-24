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
        watchlists = self.db.query(CustomList).filter(CustomList.name.in_(["Watchlist", "NSFW Watchlist", "NSFW Movie/TV Watchlist"])).all()
        ids = []
        for wl in watchlists:
            for item in wl.items:
                if item.match:
                    if item.match.provider == Provider.TMDB and item.match.external_id.isdigit():
                        ids.append(int(item.match.external_id))
                    else:
                        prov_val = item.match.provider.value if hasattr(item.match.provider, 'value') else item.match.provider
                        ids.append(f"{prov_val}_{item.match.external_id}")
                elif item.media_item_id:
                    ids.append(item.media_item_id)
        return list(set(ids))

    def add_to_watchlist(self, tmdb_id: Optional[Union[int, str]], media_type: str, media_item_id: Optional[Union[int, str]] = None) -> ActionResponse:
        is_adult = False
        if media_type and str(media_type).lower() == "scene":
            is_adult = True
        elif tmdb_id and isinstance(tmdb_id, str):
            from app.core.identifier_utils import parse_identifier
            parsed = parse_identifier(tmdb_id)
            if parsed:
                from app.modules.scrapers.support.registry import ProviderRegistry
                prov = ProviderRegistry.resolve_prefix(parsed.provider)
                if prov and ProviderRegistry.is_adult_provider(prov):
                    is_adult = True

        if media_item_id:
            from app.modules.library.models import MediaItem
            item = self.db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
            if item:
                from app.core.enums import MediaType
                is_adult = any(MediaType.is_adult_type(m.media_type) for m in item.matches)

        if is_adult:
            if media_type and str(media_type).lower() in ("movie", "tv"):
                target_watchlist_name = "NSFW Movie/TV Watchlist"
            else:
                target_watchlist_name = "NSFW Watchlist"
        else:
            target_watchlist_name = "Watchlist"

        lists = self.lists_service.get_all_lists(include_adult=True)
        watchlist = next((lst for lst in lists if lst.name == target_watchlist_name), None)
        if not watchlist:
            return ActionResponse(status="error", message=f"{target_watchlist_name} not found")
        
        payload = {"media_type": media_type}
        if media_item_id:
            payload["media_item_id"] = media_item_id
        else:
            payload["tmdb_id"] = tmdb_id

        item = self.lists_service.add_item_to_list(watchlist.id, payload)
        return ActionResponse(status="success", id=item.id)

    def remove_from_watchlist(self, tmdb_id: Union[int, str]) -> ActionResponse:
        watchlists = self.db.query(CustomList).filter(CustomList.name.in_(["Watchlist", "NSFW Watchlist", "NSFW Movie/TV Watchlist"])).all()
        if not watchlists:
            return ActionResponse(status="error", message="Watchlists not found")
        
        provider = Provider.TMDB
        external_id = str(tmdb_id)
        if isinstance(tmdb_id, str) and "_" in tmdb_id:
            prefix, val = tmdb_id.split("_", 1)
            from app.modules.scrapers.support.registry import ProviderRegistry
            resolved = ProviderRegistry.resolve_prefix(prefix)
            if resolved:
                provider = resolved
                external_id = val

        for wl in watchlists:
            list_item_id = None
            for item in wl.items:
                if item.match and item.match.provider == provider and item.match.external_id == external_id:
                    list_item_id = item.id
                    break
                if item.media_item_id and str(item.media_item_id) == str(tmdb_id):
                    list_item_id = item.id
                    break
            
            if list_item_id is not None:
                self.lists_service.remove_item_from_list(wl.id, list_item_id)
                return ActionResponse(status="success")
            
        return ActionResponse(status="error", message="Item not found in watchlist")
