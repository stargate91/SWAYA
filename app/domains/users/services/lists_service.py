import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func

from app.domains.users.models import CustomList, CustomListItem, UserOverride
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.domains.people.models import Person
from app.shared_kernel.enums import Provider, MediaType, ItemStatus, CustomListType
from app.shared_kernel.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)


class ListsService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_lists(self) -> List[CustomList]:
        # Ensure Watchlist exists
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            from app.domains.users.services.lists_domain_service import ListsDomainService
            watchlist = ListsDomainService.create_default_watchlist()
            self.db.add(watchlist)
            self.db.commit()

        return self.db.query(CustomList).all()

    def get_list_details(self, list_id: int) -> CustomList:
        l = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not l:
            raise NotFoundException("Not found")
        return l

    def create_list(self, name: str, description: Optional[str] = None, color: str = "#3b82f6", icon: str = "ListVideo") -> CustomList:
        name = name.strip()
        if not name:
            raise BadRequestException("List name is required")

        existing = self.db.query(CustomList).filter(CustomList.name == name).first()
        if existing:
            raise BadRequestException("A list with this name already exists")

        from app.domains.users.services.lists_domain_service import ListsDomainService
        new_list = ListsDomainService.create_custom_list(name=name, description=description, color=color, icon=icon)
        self.db.add(new_list)
        self.db.commit()
        return new_list

    def update_list(self, list_id: int, name: Optional[str] = None, description: Optional[str] = None, color: Optional[str] = None, icon: Optional[str] = None) -> CustomList:
        l = self.get_list_details(list_id)
        if name is not None:
            l.name = name.strip()
        if description is not None:
            l.description = description
        if color is not None:
            l.color = color.strip()
        if icon is not None:
            l.icon = icon.strip()
        self.db.commit()
        return l

    def delete_list(self, list_id: int):
        l = self.get_list_details(list_id)
        if l.name == "Watchlist":
            raise BadRequestException("Watchlist cannot be deleted")

        self.db.delete(l)
        self.db.commit()

    def add_item_to_list(self, list_id: int, media_item_id: Optional[int] = None, tmdb_id: Optional[int] = None, media_type: str = "movie") -> CustomListItem:
        l = self.get_list_details(list_id)

        match_id = None
        if tmdb_id:
            match = self.db.query(MetadataMatch).filter(
                MetadataMatch.provider == Provider.TMDB,
                MetadataMatch.external_id == str(tmdb_id)
            ).first()
            if not match:
                match = MetadataMatch(
                    provider=Provider.TMDB,
                    external_id=str(tmdb_id),
                    media_type=MediaType.MOVIE if media_type == "movie" else MediaType.TV
                )
                self.db.add(match)
                self.db.commit()
            match_id = match.id

        # Check if already exists
        exists_query = self.db.query(CustomListItem).filter(CustomListItem.list_id == list_id)
        if media_item_id:
            exists_query = exists_query.filter(CustomListItem.media_item_id == media_item_id)
        elif match_id:
            exists_query = exists_query.filter(CustomListItem.match_id == match_id)
        else:
            raise BadRequestException("Missing item identifier")

        exists = exists_query.first()
        if exists:
            return exists

        from app.domains.users.services.lists_domain_service import ListsDomainService
        item = ListsDomainService.create_list_item(list_id=list_id, media_item_id=media_item_id, match_id=match_id)
        self.db.add(item)
        self.db.commit()
        return item

    def remove_item_from_list(self, list_id: int, item_id: int):
        item = self.db.query(CustomListItem).filter(CustomListItem.list_id == list_id, CustomListItem.id == item_id).first()
        if not item:
            raise NotFoundException("Not found")
        self.db.delete(item)
        self.db.commit()

    def get_item_membership(self, media_item_id: Optional[int] = None, tmdb_id: Optional[str] = None) -> List[int]:
        query = self.db.query(CustomListItem)
        if media_item_id:
            query = query.filter(CustomListItem.media_item_id == media_item_id)
        elif tmdb_id:
            match = self.db.query(MetadataMatch).filter(MetadataMatch.provider == Provider.TMDB, MetadataMatch.external_id == tmdb_id).first()
            if match:
                query = query.filter(CustomListItem.match_id == match.id)
            else:
                return []

        items = query.all()
        return list(set(item.list_id for item in items))

    def get_user_catalog(
        self,
        tab: Optional[str] = None,
        offset: int = 0,
        limit: int = 40,
        search: str = "",
        favorite_only: bool = False,
    ) -> Tuple[List[Dict[str, Any]], int, Dict[str, int]]:
        items_list = []
        if tab == "people":
            query = self.db.query(Person)
            if search:
                query = query.filter(Person.name.ilike(f"%{search}%"))
            total = query.count()
            people = query.offset(offset).limit(limit).all()
            for p in people:
                override = self.db.query(UserOverride).filter(UserOverride.person_id == p.id).first()
                if favorite_only and (not override or not override.is_favorite):
                    continue
                items_list.append({
                    "id": p.id,
                    "title": p.name,
                    "media_type": "person",
                    "poster_path": p.profile_path,
                    "user_rating": override.user_rating if override else 0,
                    "is_favorite": override.is_favorite if override else False,
                })
        else:
            # tab == "movies" or "tv"
            query = self.db.query(MediaItem).options(joinedload(MediaItem.matches))
            if search:
                query = query.filter(MediaItem.filename.ilike(f"%{search}%"))
            total = query.count()
            items = query.offset(offset).limit(limit).all()
            for item in items:
                override = self.db.query(UserOverride).filter(UserOverride.media_item_id == item.id).first()
                if favorite_only and (not override or not override.is_favorite):
                    continue
                match = next((m for m in item.matches), None)
                items_list.append({
                    "id": item.id,
                    "title": item.filename,
                    "media_type": match.media_type.value if match else "movie",
                    "user_rating": override.user_rating if override else 0,
                    "is_favorite": override.is_favorite if override else False,
                })

        counts = {"movies": total if tab == "movies" else 0, "tv": total if tab == "tv" else 0, "people": total if tab == "people" else 0}
        return items_list, total, counts

    def bulk_update_catalog_status(self, tab: str, ids: List[Any], updates: Dict[str, Any]) -> List[Any]:
        if not ids:
            return []

        user_rating = updates.get("user_rating")
        is_favorite = updates.get("is_favorite")

        updated_ids = []
        for raw_id in ids:
            if str(raw_id).startswith("tmdb_"):
                tmdb_id = str(raw_id).split("_")[1]
                match = self.db.query(MetadataMatch).filter(MetadataMatch.provider == Provider.TMDB, MetadataMatch.external_id == tmdb_id).first()
                if match:
                    override = self.db.query(UserOverride).filter(UserOverride.metadata_match_id == match.id).first()
                    if not override:
                        override = UserOverride(metadata_match_id=match.id)
                        self.db.add(override)
                    if user_rating is not None: override.user_rating = user_rating
                    if is_favorite is not None: override.is_favorite = is_favorite
                    updated_ids.append(raw_id)
            else:
                item_id = int(raw_id)
                if tab == "people":
                    override = self.db.query(UserOverride).filter(UserOverride.person_id == item_id).first()
                    if not override:
                        override = UserOverride(person_id=item_id)
                        self.db.add(override)
                    if user_rating is not None: override.user_rating = user_rating
                    if is_favorite is not None: override.is_favorite = is_favorite
                    updated_ids.append(raw_id)
                else:
                    override = self.db.query(UserOverride).filter(UserOverride.media_item_id == item_id).first()
                    if not override:
                        override = UserOverride(media_item_id=item_id)
                        self.db.add(override)
                    if user_rating is not None: override.user_rating = user_rating
                    if is_favorite is not None: override.is_favorite = is_favorite
                    updated_ids.append(raw_id)

        self.db.commit()
        return updated_ids
