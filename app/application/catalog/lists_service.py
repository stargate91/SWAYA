import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.domains.users.models import CustomListItem
from app.domains.users.services.lists_service import ListsService as DomainListsService
from app.application.users.schemas import (
    CustomListItemResponse,
    CustomListResponse,
    CustomListDetailResponse,
    ListMembershipResponse,
    CatalogItemResponse,
    CatalogPageResponse,
    CatalogResponse,
    BulkUpdateResponse,
)

logger = logging.getLogger(__name__)


class ListsService:
    def __init__(self, db: Session):
        self.db = db
        self.domain_service = DomainListsService(db)

    def _serialize_item(self, item: CustomListItem) -> CustomListItemResponse:
        res = {
            "id": item.id,
            "media_item_id": item.media_item_id,
            "match_id": item.match_id,
            "person_id": item.person_id,
            "studio_id": item.studio_id,
            "collection_id": item.collection_id,
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "title": None,
            "tmdb_id": None,
            "media_type": None,
            "poster_path": None,
        }
        
        # Populate basic info based on what is linked
        if item.media_item:
            res["title"] = item.media_item.filename
            match = next((m for m in item.media_item.matches), None)
            if match:
                res["tmdb_id"] = int(match.external_id) if match.external_id.isdigit() else None
                res["media_type"] = match.media_type.value
                loc = next((l for l in match.localizations), None)
                if loc:
                    res["poster_path"] = loc.poster_path
        elif item.match:
            res["tmdb_id"] = int(item.match.external_id) if item.match.external_id.isdigit() else None
            res["media_type"] = item.match.media_type.value
            loc = next((l for l in item.match.localizations), None)
            res["title"] = loc.title if loc else item.match.original_title or f"Match #{item.match.id}"
            if loc:
                res["poster_path"] = loc.poster_path
        elif item.person:
            res["title"] = item.person.name
            res["media_type"] = "person"
            res["poster_path"] = item.person.profile_path
            
        return CustomListItemResponse(**res)

    def get_all_lists(self) -> List[CustomListResponse]:
        lists = self.domain_service.get_all_lists()
        result = []
        for l in lists:
            item_count = len(l.items)
            posters = [self._serialize_item(item).poster_path for item in l.items[:4]]
            posters = [p for p in posters if p]
            
            result.append(CustomListResponse(
                id=l.id,
                name=l.name,
                is_watchlist=l.name == "Watchlist",
                description=l.description,
                color=l.color or "#3b82f6",
                icon=l.icon or "ListVideo",
                created_at=l.created_at.isoformat() if l.created_at else None,
                item_count=item_count,
                sample_posters=posters
            ))
        return result

    def get_list_details(self, list_id: int) -> CustomListDetailResponse:
        l = self.domain_service.get_list_details(list_id)
        return CustomListDetailResponse(
            id=l.id,
            name=l.name,
            is_watchlist=l.name == "Watchlist",
            description=l.description,
            color=l.color,
            icon=l.icon,
            created_at=l.created_at.isoformat() if l.created_at else None,
            items=[self._serialize_item(item) for item in l.items]
        )

    def create_list(self, payload: Dict[str, Any]) -> CustomListResponse:
        name = payload.get("name", "")
        description = payload.get("description", "")
        color = payload.get("color", "")
        icon = payload.get("icon", "")
        new_list = self.domain_service.create_list(name=name, description=description, color=color, icon=icon)
        return CustomListResponse(
            id=new_list.id,
            name=new_list.name,
            is_watchlist=False,
            description=new_list.description,
            color=new_list.color,
            icon=new_list.icon,
            created_at=new_list.created_at.isoformat() if new_list.created_at else None,
            item_count=0,
            sample_posters=[]
        )

    def update_list(self, list_id: int, payload: Dict[str, Any]) -> CustomListDetailResponse:
        l = self.domain_service.update_list(
            list_id,
            name=payload.get("name"),
            description=payload.get("description"),
            color=payload.get("color"),
            icon=payload.get("icon")
        )
        return self.get_list_details(list_id)

    def delete_list(self, list_id: int) -> Dict[str, Any]:
        self.domain_service.delete_list(list_id)
        return {"status": "success"}

    def add_item_to_list(self, list_id: int, payload: Dict[str, Any]) -> CustomListItemResponse:
        media_item_id = payload.get("media_item_id")
        tmdb_id = payload.get("tmdb_id")
        media_type = payload.get("media_type", "movie")
        item = self.domain_service.add_item_to_list(list_id, media_item_id=media_item_id, tmdb_id=tmdb_id, media_type=media_type)
        return self._serialize_item(item)

    def remove_item_from_list(self, list_id: int, item_id: int) -> Dict[str, Any]:
        self.domain_service.remove_item_from_list(list_id, item_id)
        return {"status": "success"}

    def get_item_membership(self, item_id: str) -> ListMembershipResponse:
        tmdb_id = None
        media_item_id = None

        if item_id.startswith("tmdb_"):
            tmdb_id = item_id.split("_")[1]
        else:
            media_item_id = int(item_id)

        list_ids = self.domain_service.get_item_membership(media_item_id=media_item_id, tmdb_id=tmdb_id)
        return ListMembershipResponse(list_ids=list_ids)

    def get_user_catalog(
        self,
        tab: Optional[str] = None,
        offset: int = 0,
        limit: int = 40,
        search: str = "",
        favorite_only: bool = False,
    ) -> CatalogResponse:
        items_list, total, counts = self.domain_service.get_user_catalog(
            tab=tab, offset=offset, limit=limit, search=search, favorite_only=favorite_only
        )
        catalog_items = [CatalogItemResponse(**item) for item in items_list]
        return CatalogResponse(
            movies=catalog_items if tab == "movies" else [],
            tv=catalog_items if tab == "tv" else [],
            people=catalog_items if tab == "people" else [],
            counts=counts,
            page=CatalogPageResponse(
                tab=tab,
                offset=offset,
                limit=limit,
                returned=len(catalog_items),
                has_more=offset + len(catalog_items) < total,
            )
        )

    def bulk_update_catalog_status(self, payload: Dict[str, Any]) -> BulkUpdateResponse:
        tab = payload.get("tab", "movies")
        updates = payload.get("updates", {})
        ids = payload.get("ids", [])
        updated_ids = self.domain_service.bulk_update_catalog_status(tab=tab, ids=ids, updates=updates)
        return BulkUpdateResponse(status="success", tab=tab, updated_ids=updated_ids)
