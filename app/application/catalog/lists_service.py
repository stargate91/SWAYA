import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload

from app.domains.users.models import CustomList, CustomListItem, UserOverride
from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch
from app.domains.people.models import Person
from app.shared_kernel.enums import Provider, MediaType, CustomListType
from app.shared_kernel.exceptions import NotFoundException, BadRequestException
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

    def _resolve_tv_show_tmdb_id(self, match) -> Optional[int]:
        if not match:
            return None
        from app.domains.metadata.models import MetadataMatch
        from app.shared_kernel.enums import MediaType
        
        parent = match
        visited = set()
        while parent and parent.media_type in (MediaType.EPISODE, MediaType.SEASON):
            if parent.id in visited:
                break
            visited.add(parent.id)
            if parent.parent_id:
                parent = self.db.query(MetadataMatch).filter(MetadataMatch.id == parent.parent_id).first()
            else:
                break
                
        if parent and parent.media_type == MediaType.TV:
            return int(parent.external_id) if parent.external_id.isdigit() else None
        return int(match.external_id) if match.external_id.isdigit() else None

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
            "year": None,
            "rating": None,
            "is_adult": False,
            "external_id": None,
            "provider": None,
            "release_date": None,
            "people": None,
        }
        
        # Populate basic info based on what is linked
        match = None
        if item.media_item:
            res["title"] = item.media_item.filename
            match = next((m for m in item.media_item.matches), None)
            if match:
                res["tmdb_id"] = self._resolve_tv_show_tmdb_id(match)
                res["media_type"] = match.media_type.value
                res["rating"] = match.rating_imdb or match.rating_tmdb
                res["is_adult"] = bool(match.is_adult) or match.provider in (Provider.PORNDB, Provider.STASHDB, Provider.FANSDB)
                res["external_id"] = match.external_id
                res["provider"] = match.provider.value if hasattr(match.provider, "value") else str(match.provider)
                if match.release_date:
                    res["year"] = match.release_date.year
                loc = next((x for x in match.localizations), None)
                if match.media_type.value in ("scene", "still"):
                    res["poster_path"] = match.backdrop_path or match.still_path
                    scene_title = loc.title if loc else match.original_title
                    if scene_title:
                        res["title"] = scene_title
                elif loc:
                    res["poster_path"] = loc.poster_path
                    res["title"] = loc.title
                if not res["title"]:
                    res["title"] = loc.title if loc else match.original_title
        elif item.match:
            match = item.match
            res["tmdb_id"] = self._resolve_tv_show_tmdb_id(item.match)
            res["media_type"] = item.match.media_type.value
            res["rating"] = item.match.rating_imdb or item.match.rating_tmdb
            res["is_adult"] = bool(item.match.is_adult) or item.match.provider in (Provider.PORNDB, Provider.STASHDB, Provider.FANSDB)
            res["external_id"] = item.match.external_id
            res["provider"] = item.match.provider.value if hasattr(item.match.provider, "value") else str(item.match.provider)
            if item.match.release_date:
                res["year"] = item.match.release_date.year
            loc = next((x for x in item.match.localizations), None)
            res["title"] = loc.title if loc else item.match.original_title or f"Match #{item.match.id}"
            if item.match.media_type.value in ("scene", "still"):
                res["poster_path"] = item.match.backdrop_path or item.match.still_path
            elif loc:
                res["poster_path"] = loc.poster_path
        elif item.person:
            res["title"] = item.person.name
            res["media_type"] = "person"
            res["poster_path"] = item.person.profile_path
            res["is_adult"] = bool(item.person.is_adult)
            res["gender"] = item.person.gender
            res["known_for_department"] = item.person.known_for_department

        if match:
            res["release_date"] = match.release_date.isoformat() if match.release_date else None
            p_list = []
            for pl in match.people_links:
                p_list.append({
                    "id": pl.person.id,
                    "name": pl.person.name,
                    "gender": pl.person.gender
                })
            res["people"] = p_list

        from app.domains.users.models import UserOverride
        user_rating = None
        is_watched = False
        if item.media_item:
            override = self.db.query(UserOverride).filter(UserOverride.media_item_id == item.media_item_id).first()
            if not override and match:
                override = self.db.query(UserOverride).filter(UserOverride.metadata_match_id == match.id).first()
            if override:
                user_rating = override.user_rating
                is_watched = bool(override.is_watched)
        elif item.match_id:
            override = self.db.query(UserOverride).filter(UserOverride.metadata_match_id == item.match_id).first()
            if override:
                user_rating = override.user_rating
                is_watched = bool(override.is_watched)
        elif item.person_id:
            override = self.db.query(UserOverride).filter(UserOverride.person_id == item.person_id).first()
            if override:
                user_rating = override.user_rating
                is_watched = bool(override.is_watched)
                
        res["user_rating"] = user_rating
        res["is_watched"] = is_watched

        # Get genres
        genres_list = []
        resolved_loc = None
        if item.media_item and match:
            resolved_loc = next((x for x in match.localizations), None)
        elif item.match:
            resolved_loc = next((x for x in item.match.localizations), None)
            
        if resolved_loc and resolved_loc.genres:
            from app.shared_kernel.genre_utils import split_genres as _split_genres
            genres_list = _split_genres(resolved_loc.genres)
            
        res["genres"] = genres_list
            
        return CustomListItemResponse(**res)

    def _adult_access_enabled(self) -> bool:
        from app.domains.settings.models import SystemSetting, UserSetting
        
        # Check user setting
        us = self.db.query(UserSetting).filter(
            UserSetting.user_id == 1,  # Default user ID
            UserSetting.key == "include_adult"
        ).first()
        if us:
            return us.value.lower() in ("true", "1", "yes") if isinstance(us.value, str) else bool(us.value)
            
        # Fallback to system setting
        ss = self.db.query(SystemSetting).filter(
            SystemSetting.key == "include_adult"
        ).first()
        if ss:
            return ss.value.lower() in ("true", "1", "yes") if isinstance(ss.value, str) else bool(ss.value)
            
        return False

    def _is_item_adult(self, item: CustomListItem) -> bool:
        if item.media_item:
            match = next((m for m in item.media_item.matches), None)
            if match and (match.is_adult or match.provider in (Provider.PORNDB, Provider.STASHDB, Provider.FANSDB)):
                return True
        elif item.match:
            if item.match.is_adult or item.match.provider in (Provider.PORNDB, Provider.STASHDB, Provider.FANSDB):
                return True
        elif item.person and item.person.is_adult:
            return True
        return False

    def _is_list_adult(self, custom_list: CustomList) -> bool:
        return any(self._is_item_adult(item) for item in custom_list.items)

    def get_all_lists(self) -> List[CustomListResponse]:
        # Ensure Watchlist exists
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            from app.domains.users.services.lists_domain_service import ListsDomainService
            watchlist = ListsDomainService.create_default_watchlist()
            self.db.add(watchlist)
            self.db.commit()

        adult_enabled = self._adult_access_enabled()

        lists = self.db.query(CustomList).all()
        result = []
        for custom_list in lists:
            # Hide the entire list if adult is disabled and it has ONLY adult items (Watchlist is never hidden)
            if not adult_enabled and custom_list.name != "Watchlist":
                if custom_list.items and all(self._is_item_adult(item) for item in custom_list.items):
                    continue

            if not adult_enabled:
                filtered_items = [item for item in custom_list.items if not self._is_item_adult(item)]
            else:
                filtered_items = custom_list.items

            item_count = len(filtered_items)
            posters = [self._serialize_item(item).poster_path for item in filtered_items[:4]]
            posters = [p for p in posters if p]
            
            resolved_image = None
            if custom_list.custom_image_path:
                from app.domains.media_assets.services.images import image_processing_service
                resolved_image = image_processing_service.resolve_image_url(custom_list.custom_image_path, "covers")

            result.append(CustomListResponse(
                id=custom_list.id,
                name=custom_list.name,
                is_watchlist=custom_list.name == "Watchlist",
                description=custom_list.description,
                color=custom_list.color or "#3b82f6",
                list_type=custom_list.list_type,
                created_at=custom_list.created_at.isoformat() if custom_list.created_at else None,
                item_count=item_count,
                sample_posters=posters,
                custom_image_path=resolved_image
            ))
        return result

    def get_list_details(self, list_id: int) -> CustomListDetailResponse:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")
            
        adult_enabled = self._adult_access_enabled()
        if not adult_enabled and custom_list.name != "Watchlist":
            if custom_list.items and all(self._is_item_adult(item) for item in custom_list.items):
                raise NotFoundException("Not found")
                
        serialized_items = []
        for item in custom_list.items:
            if not adult_enabled and self._is_item_adult(item):
                continue
            serialized_items.append(self._serialize_item(item))

        resolved_image = None
        if custom_list.custom_image_path:
            from app.domains.media_assets.services.images import image_processing_service
            resolved_image = image_processing_service.resolve_image_url(custom_list.custom_image_path, "covers")

        return CustomListDetailResponse(
            id=custom_list.id,
            name=custom_list.name,
            is_watchlist=custom_list.name == "Watchlist",
            description=custom_list.description,
            color=custom_list.color,
            list_type=custom_list.list_type,
            created_at=custom_list.created_at.isoformat() if custom_list.created_at else None,
            items=serialized_items,
            custom_image_path=resolved_image
        )

    def create_list(self, payload: Dict[str, Any]) -> CustomListResponse:
        name = payload.get("name", "").strip()
        description = payload.get("description", "")
        color = payload.get("color", "")
        list_type_str = payload.get("list_type", "media")
        try:
            list_type = CustomListType(list_type_str.lower())
        except ValueError:
            list_type = CustomListType.MEDIA

        if not name:
            raise BadRequestException("List name is required")

        existing = self.db.query(CustomList).filter(CustomList.name == name).first()
        if existing:
            raise BadRequestException("A list with this name already exists")

        from app.domains.users.services.lists_domain_service import ListsDomainService
        new_list = ListsDomainService.create_custom_list(
            name=name, description=description, color=color, list_type=list_type
        )
        self.db.add(new_list)
        self.db.commit()

        return CustomListResponse(
            id=new_list.id,
            name=new_list.name,
            is_watchlist=False,
            description=new_list.description,
            color=new_list.color,
            list_type=new_list.list_type,
            created_at=new_list.created_at.isoformat() if new_list.created_at else None,
            item_count=0,
            sample_posters=[],
            custom_image_path=None
        )

    def update_list(self, list_id: int, payload: Dict[str, Any]) -> CustomListDetailResponse:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")

        name = payload.get("name")
        description = payload.get("description")
        color = payload.get("color")

        if name is not None:
            custom_list.name = name.strip()
        if description is not None:
            custom_list.description = description
        if color is not None:
            custom_list.color = color.strip()
        self.db.commit()
        return self.get_list_details(list_id)

    def delete_list(self, list_id: int) -> Dict[str, Any]:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")
        if custom_list.name == "Watchlist":
            raise BadRequestException("Watchlist cannot be deleted")

        self.db.delete(custom_list)
        self.db.commit()
        return {"status": "success"}

    def add_item_to_list(self, list_id: int, payload: Dict[str, Any]) -> CustomListItemResponse:
        media_item_id = payload.get("media_item_id")
        tmdb_id = payload.get("tmdb_id")
        media_type = payload.get("media_type", "movie")
        provider_name = payload.get("provider")

        # Parse unified string IDs (e.g. "tmdb_46459" or "porndb_123")
        if isinstance(media_item_id, str):
            if "_" in media_item_id:
                prefix, val = media_item_id.split("_", 1)
                if prefix == "tmdb":
                    tmdb_id = int(val) if val.isdigit() else val
                    media_item_id = None
                elif val.isdigit():
                    media_item_id = int(val)
            elif media_item_id.isdigit():
                media_item_id = int(media_item_id)

        # Determine provider and clean external ID
        provider = Provider.TMDB
        external_id = str(tmdb_id) if tmdb_id else None
        
        if tmdb_id and isinstance(tmdb_id, str):
            if "_" in tmdb_id:
                prefix, val = tmdb_id.split("_", 1)
                if prefix in ("tmdb", "porndb", "stash", "stashdb", "fansdb"):
                    if prefix == "tmdb":
                        provider = Provider.TMDB
                    elif prefix in ("porndb", "theporndb"):
                        provider = Provider.PORNDB
                    elif prefix in ("stash", "stashdb"):
                        provider = Provider.STASHDB
                    elif prefix == "fansdb":
                        provider = Provider.FANSDB
                    external_id = val
                else:
                    external_id = tmdb_id
            else:
                external_id = tmdb_id

        if provider_name:
            p_clean = provider_name.lower()
            if p_clean == "tmdb":
                provider = Provider.TMDB
            elif p_clean in ("porndb", "theporndb"):
                provider = Provider.PORNDB
            elif p_clean in ("stash", "stashdb"):
                provider = Provider.STASHDB
            elif p_clean == "fansdb":
                provider = Provider.FANSDB

        # If we have a matching provider/external_id, check if it already exists as a local MediaItem
        if external_id and not media_item_id:
            from app.domains.library.models import MediaItem
            from app.domains.metadata.models import MetadataMatch
            local_item = self.db.query(MediaItem).join(MediaItem.matches).filter(
                MetadataMatch.provider == provider,
                MetadataMatch.external_id == str(external_id)
            ).first()
            if local_item:
                media_item_id = local_item.id

        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")

        match_id = None
        if external_id:
            from app.domains.metadata.models import MetadataMatch
            from datetime import datetime
            match = self.db.query(MetadataMatch).filter(
                MetadataMatch.provider == provider,
                MetadataMatch.external_id == str(external_id)
            ).first()
            if not match:
                try:
                    m_type = MediaType(media_type.lower())
                except ValueError:
                    m_type = MediaType.MOVIE if media_type == "movie" else MediaType.TV
                
                year_val = payload.get("year")
                rel_date = None
                if year_val:
                    try:
                        rel_date = datetime(int(year_val), 1, 1)
                    except Exception:
                        pass

                is_adult_item = (provider in (Provider.PORNDB, Provider.STASHDB, Provider.FANSDB)) or (m_type.value == "scene")
                match = MetadataMatch(
                    provider=provider,
                    external_id=str(external_id),
                    media_type=m_type,
                    original_title=payload.get("title"),
                    release_date=rel_date,
                    backdrop_path=payload.get("poster_path") if m_type.value == "scene" else None,
                    is_adult=is_adult_item
                )
                self.db.add(match)
                self.db.commit()

                # Create basic metadata localization
                title = payload.get("title")
                poster_path = payload.get("poster_path")
                if title or poster_path:
                    from app.domains.metadata.models import MetadataLocalization
                    loc = MetadataLocalization(
                        match_id=match.id,
                        locale="en",
                        title=title or "",
                        poster_path=poster_path if m_type.value != "scene" else ""
                    )
                    self.db.add(loc)
                    self.db.commit()

            match_id = match.id

        person_id = payload.get("person_id")

        if person_id:
            from app.domains.people.models import Person, ExternalSourceLink
            resolved_person = None
            
            def find_by_direct_id(pid_val):
                try:
                    p_id_int = int(pid_val)
                    return self.db.query(Person).filter(Person.id == p_id_int).first()
                except (ValueError, TypeError):
                    return self.db.query(Person).filter(Person.id == pid_val).first()
                    
            if resolved_person is None:
                resolved_person = find_by_direct_id(person_id)
                
            if resolved_person is None and isinstance(person_id, str):
                prefix = None
                val = None
                if ":" in person_id:
                    prefix, val = person_id.split(":", 1)
                elif "_" in person_id:
                    prefix, val = person_id.split("_", 1)
                    
                if prefix and val:
                    p_enum = None
                    if prefix == "tmdb":
                        p_enum = Provider.TMDB
                    elif prefix in ("porndb", "theporndb"):
                        p_enum = Provider.PORNDB
                    elif prefix in ("stash", "stashdb"):
                        p_enum = Provider.STASHDB
                    elif prefix == "fansdb":
                        p_enum = Provider.FANSDB
                        
                    if p_enum:
                        link = self.db.query(ExternalSourceLink).filter(
                            ExternalSourceLink.provider == p_enum,
                            ExternalSourceLink.external_id == val
                        ).first()
                        if link:
                            resolved_person = link.person
                            
                        if resolved_person is None and p_enum == Provider.TMDB:
                            resolved_person = find_by_direct_id(val)
                            
            if resolved_person:
                person_id = resolved_person.id
            else:
                from app.infrastructure.scrapers.support.gateway import scraper_gateway
                from app.infrastructure.media.db_media_resolver import DbMediaResolver
                from app.domains.media_assets.services.images import image_processing_service
                from app.domains.people.services.people_search_service import PeopleSearchService
                
                search_service = PeopleSearchService(
                    db=self.db,
                    scrapers=scraper_gateway,
                    library_port=DbMediaResolver(self.db),
                    image_service=image_processing_service
                )
                try:
                    import_id = str(person_id)
                    if isinstance(person_id, str) and "_" in person_id and ":" not in person_id:
                        prefix, val = person_id.split("_", 1)
                        if prefix in ("tmdb", "porndb", "stash", "fansdb"):
                            import_id = f"{prefix}:{val}"
                            
                    res = search_service.add_person_tmdb(import_id, is_active=True)
                    if res and res.get("status") == "success":
                        person_id = res["id"]
                except Exception as e:
                    logger.error(f"Failed to dynamically import person {person_id} for custom list: {e}")
                    raise BadRequestException(f"Failed to import performer: {str(e)}")

        # Check if already exists
        exists_query = self.db.query(CustomListItem).filter(CustomListItem.list_id == list_id)
        if media_item_id:
            exists_query = exists_query.filter(CustomListItem.media_item_id == media_item_id)
        elif match_id:
            exists_query = exists_query.filter(CustomListItem.match_id == match_id)
        elif person_id:
            exists_query = exists_query.filter(CustomListItem.person_id == person_id)
        else:
            raise BadRequestException("Missing item identifier")

        exists = exists_query.first()
        if exists:
            return self._serialize_item(exists)

        from app.domains.users.services.lists_domain_service import ListsDomainService
        item = ListsDomainService.create_list_item(
            list_id=list_id,
            media_item_id=media_item_id,
            match_id=match_id,
            person_id=person_id
        )
        self.db.add(item)
        self.db.commit()

        # Track the item immediately so it gets enriched and fully imported into the database
        try:
            from app.domains.users.services.overrides_service import OverridesService
            from app.infrastructure.media.db_media_resolver import DbMediaResolver
            from app.infrastructure.scrapers.support.gateway import scraper_gateway
            from app.infrastructure.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
            
            resolver = DbMediaResolver(self.db)
            scrapers = scraper_gateway
            mainstream = MainstreamEnricher
            
            overrides = OverridesService(
                db=self.db,
                resolver=resolver,
                scrapers=scrapers,
                mainstream_enricher=mainstream
            )
            
            track_id = None
            if media_item_id:
                track_id = str(media_item_id)
            elif external_id:
                prefix = "stash" if provider == Provider.STASHDB else provider.value.lower()
                track_id = f"{prefix}_{external_id}"
                
            if track_id:
                overrides.track_item(track_id, True)
        except Exception as ex:
            logger.error(f"Failed to auto-track list item {media_item_id or tmdb_id}: {ex}")

        try:
            self.db.refresh(item)
            if item.match:
                self.db.refresh(item.match)
        except Exception:
            pass

        return self._serialize_item(item)

    def remove_item_from_list(self, list_id: int, item_id: int) -> Dict[str, Any]:
        item = self.db.query(CustomListItem).filter(CustomListItem.list_id == list_id, CustomListItem.id == item_id).first()
        if not item:
            raise NotFoundException("Not found")
        self.db.delete(item)
        self.db.commit()
        return {"status": "success"}

    def get_item_membership(self, item_id: str) -> ListMembershipResponse:
        tmdb_id = None
        media_item_id = None

        if item_id.startswith("tmdb_"):
            tmdb_id = item_id.split("_")[1]
        else:
            media_item_id = int(item_id)

        query = self.db.query(CustomListItem)
        if media_item_id:
            query = query.filter(CustomListItem.media_item_id == media_item_id)
        elif tmdb_id:
            match = self.db.query(MetadataMatch).filter(MetadataMatch.provider == Provider.TMDB, MetadataMatch.external_id == tmdb_id).first()
            if match:
                query = query.filter(CustomListItem.match_id == match.id)
            else:
                return ListMembershipResponse(list_ids=[])

        items = query.all()
        list_ids = list(set(item.list_id for item in items))
        from app.domains.users.schemas import ListMembershipItem
        memberships = [ListMembershipItem(list_id=i.list_id, list_item_id=i.id) for i in items]
        return ListMembershipResponse(list_ids=list_ids, memberships=memberships)

    def get_user_catalog(
        self,
        tab: Optional[str] = None,
        offset: int = 0,
        limit: int = 40,
        search: str = "",
        favorite_only: bool = False,
    ) -> CatalogResponse:
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

        catalog_items = [CatalogItemResponse(**item) for item in items_list]
        counts = {"movies": total if tab == "movies" else 0, "tv": total if tab == "tv" else 0, "people": total if tab == "people" else 0}
        
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

        if not ids:
            return BulkUpdateResponse(status="success", tab=tab, updated_ids=[])

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
                    if user_rating is not None:
                        override.user_rating = user_rating
                    if is_favorite is not None:
                        override.is_favorite = is_favorite
                    updated_ids.append(raw_id)
            else:
                item_id = int(raw_id)
                if tab == "people":
                    override = self.db.query(UserOverride).filter(UserOverride.person_id == item_id).first()
                    if not override:
                        override = UserOverride(person_id=item_id)
                        self.db.add(override)
                    if user_rating is not None:
                        override.user_rating = user_rating
                    if is_favorite is not None:
                        override.is_favorite = is_favorite
                    updated_ids.append(raw_id)
                else:
                    override = self.db.query(UserOverride).filter(UserOverride.media_item_id == item_id).first()
                    if not override:
                        override = UserOverride(media_item_id=item_id)
                        self.db.add(override)
                    if user_rating is not None:
                        override.user_rating = user_rating
                    if is_favorite is not None:
                        override.is_favorite = is_favorite
                    updated_ids.append(raw_id)

        self.db.commit()
        return BulkUpdateResponse(status="success", tab=tab, updated_ids=updated_ids)

    def set_list_image(self, list_id: int, image_path: Optional[str]) -> CustomListDetailResponse:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("List not found")

        custom_list.custom_image_path = image_path if image_path else None
        self.db.commit()
        return self.get_list_details(list_id)

    def upload_list_image(self, list_id: int, filename: str, file_stream) -> CustomListDetailResponse:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("List not found")

        import uuid
        import os
        from app.domains.media_assets.services.images import image_processing_service
        
        img_service = image_processing_service
        img_service.ensure_folders()

        ext = os.path.splitext(filename)[1] or ".jpg"
        new_filename = f"list_{list_id}_{uuid.uuid4().hex}{ext}"
        original_path = img_service.get_original_path("covers", new_filename)
        thumbnail_path = img_service.get_thumbnail_path("covers", new_filename)

        os.makedirs(os.path.dirname(original_path), exist_ok=True)
        os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)

        saved_path = img_service.write_upload(original_path, file_stream)
        if not saved_path:
            raise BadRequestException("Failed to save uploaded image")

        img_service.generate_thumbnail(original_path, thumbnail_path, "covers")

        custom_list.custom_image_path = new_filename
        self.db.commit()

        return self.get_list_details(list_id)

