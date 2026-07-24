import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload

from app.modules.users.models import CustomList, CustomListItem, UserOverride
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.people.models import Person
from app.core.enums import Provider, MediaType, CustomListType
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.identifier_utils import parse_identifier

from app.modules.users.schemas import (
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
        from app.modules.metadata.models import MetadataMatch
        from app.core.enums import MediaType
        
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

    def _serialize_item(self, item: CustomListItem, overrides_lookup: Optional[Dict[str, Any]] = None) -> CustomListItemResponse:
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
            if match and match.media_type == MediaType.EPISODE:
                parent_show = None
                if match.parent and match.parent.parent:
                    parent_show = match.parent.parent
                elif match.parent and match.parent.media_type == MediaType.TV:
                    parent_show = match.parent
                if parent_show:
                    match = parent_show
            if match:
                res["tmdb_id"] = self._resolve_tv_show_tmdb_id(match)
                res["media_type"] = match.media_type.value if hasattr(match.media_type, "value") else match.media_type
                res["rating"] = match.rating_imdb or match.rating_tmdb
                from app.modules.scrapers.support.registry import ProviderRegistry
                res["is_adult"] = bool(match.is_adult) or ProviderRegistry.is_adult_provider(match.provider)
                res["external_id"] = match.external_id
                res["provider"] = match.provider.value if hasattr(match.provider, "value") else str(match.provider)
                if match.release_date:
                    res["year"] = match.release_date.year
                loc = next((x for x in match.localizations), None)
                if MediaType.is_adult_type(match.media_type):
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
            if match and match.media_type == MediaType.EPISODE:
                parent_show = None
                if match.parent and match.parent.parent:
                    parent_show = match.parent.parent
                elif match.parent and match.parent.media_type == MediaType.TV:
                    parent_show = match.parent
                if parent_show:
                    match = parent_show
            res["tmdb_id"] = self._resolve_tv_show_tmdb_id(match)
            res["media_type"] = match.media_type.value if hasattr(match.media_type, "value") else match.media_type
            res["rating"] = match.rating_imdb or match.rating_tmdb
            from app.modules.scrapers.support.registry import ProviderRegistry
            res["is_adult"] = bool(match.is_adult) or ProviderRegistry.is_adult_provider(match.provider)
            res["external_id"] = match.external_id
            res["provider"] = match.provider.value if hasattr(match.provider, "value") else str(match.provider)
            if match.release_date:
                res["year"] = match.release_date.year
            loc = next((x for x in match.localizations), None)
            res["title"] = loc.title if loc else match.original_title or f"Match #{match.id}"
            if MediaType.is_adult_type(match.media_type):
                res["poster_path"] = match.backdrop_path or match.still_path
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
            res["last_air_date"] = match.last_air_date.isoformat() if (hasattr(match, "last_air_date") and match.last_air_date) else None
            res["release_status"] = match.release_status if hasattr(match, "release_status") else None
            p_list = []
            for pl in match.people_links:
                p_list.append({
                    "id": pl.person.id,
                    "name": pl.person.name,
                    "gender": pl.person.gender
                })
            res["people"] = p_list

        from app.modules.users.models import UserOverride
        user_rating = None
        is_watched = False
        override = None
        if overrides_lookup:
            if item.media_item_id:
                override = overrides_lookup["media_item"].get(item.media_item_id)
            if not override and match:
                override = overrides_lookup["match"].get(match.id)
            if not override and item.match_id:
                override = overrides_lookup["match"].get(item.match_id)
            if not override and item.person_id:
                override = overrides_lookup["person"].get(item.person_id)
        else:
            if item.media_item:
                override = self.db.query(UserOverride).filter(UserOverride.media_item_id == item.media_item_id).first()
                if not override and match:
                    override = self.db.query(UserOverride).filter(UserOverride.metadata_match_id == match.id).first()
            elif item.match_id:
                override = self.db.query(UserOverride).filter(UserOverride.metadata_match_id == item.match_id).first()
            elif item.person_id:
                override = self.db.query(UserOverride).filter(UserOverride.person_id == item.person_id).first()
            
        if override:
            user_rating = override.user_rating
            is_watched = bool(override.is_watched)
            if override.custom_poster:
                res["poster_path"] = override.custom_poster
            if override.custom_title:
                res["title"] = override.custom_title
                
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
            from app.core.genre_utils import split_genres as _split_genres
            genres_list = _split_genres(resolved_loc.genres)
            
        res["genres"] = genres_list
            
        if res["poster_path"]:
            from app.modules.media_assets.services.images import image_processing_service
            subfolder = "posters"
            if res["media_type"] == "person":
                subfolder = "people"
            elif MediaType.is_adult_type(res["media_type"]):
                subfolder = "backdrops"
            res["poster_path"] = image_processing_service.resolve_image_url(res["poster_path"], subfolder)

        # Calculate target_path
        from app.modules.scrapers.support.registry import ProviderRegistry
        m_type = res["media_type"]
        if m_type == "person":
            ext_id = item.person_id or res["id"]
        elif m_type == "scene":
            ext_id = res["external_id"] or item.match_id
        elif m_type == "video":
            ext_id = res["external_id"] or item.media_item_id or item.match_id
        else:
            ext_id = res["external_id"] or res["tmdb_id"] or item.match_id or item.media_item_id

        res["target_path"] = ProviderRegistry.build_target_path(
            media_type=m_type,
            provider=res.get("provider"),
            external_id=ext_id
        )

        return CustomListItemResponse(**res)

    def _adult_access_enabled(self) -> bool:
        from app.modules.settings.services.settings_service import SettingsService
        val = SettingsService(self.db).get_setting("include_adult", user_id=1)
        return str(val).lower() in ("true", "1", "yes")

    def _is_item_adult(self, item: CustomListItem) -> bool:
        if item.media_item:
            match = next((m for m in item.media_item.matches), None)
            from app.modules.scrapers.support.registry import ProviderRegistry
            if match and (match.is_adult or ProviderRegistry.is_adult_provider(match.provider)):
                return True
        elif item.match:
            from app.modules.scrapers.support.registry import ProviderRegistry
            if item.match.is_adult or ProviderRegistry.is_adult_provider(item.match.provider):
                return True
        elif item.person and item.person.is_adult:
            return True
        return False

    def _is_list_adult(self, custom_list: CustomList) -> bool:
        return any(self._is_item_adult(item) for item in custom_list.items)

    def get_all_lists(self, include_adult: bool = False) -> List[CustomListResponse]:
        watchlist = self.db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            watchlist = CustomList(
                name="Watchlist",
                description="Your go-to space for everything you want to watch later.",
                list_type=CustomListType.MOVIE_TV,
                color="#3b82f6"
            )
            self.db.add(watchlist)
            self.db.commit()

        nsfw_watchlist = self.db.query(CustomList).filter(CustomList.name == "NSFW Watchlist").first()
        if not nsfw_watchlist:
            nsfw_watchlist = CustomList(
                name="NSFW Watchlist",
                description="Your go-to space for adult items you want to watch later.",
                list_type=CustomListType.VIDEO_SCENE,
                color="#ec4899",
                is_adult=True
            )
            self.db.add(nsfw_watchlist)
            self.db.commit()

        nsfw_movie_watchlist = self.db.query(CustomList).filter(CustomList.name == "NSFW Movie/TV Watchlist").first()
        if not nsfw_movie_watchlist:
            nsfw_movie_watchlist = CustomList(
                name="NSFW Movie/TV Watchlist",
                description="Your go-to space for adult movies and TV shows you want to watch later.",
                list_type=CustomListType.MOVIE_TV,
                color="#ec4899",
                is_adult=True
            )
            self.db.add(nsfw_movie_watchlist)
            self.db.commit()

        adult_enabled = self._adult_access_enabled() and include_adult

        lists = self.db.query(CustomList).all()
        result = []
        for custom_list in lists:
            # Hide the entire list if adult is disabled and it has ONLY adult items or is marked as adult
            if not adult_enabled and custom_list.name != "Watchlist":
                if custom_list.is_adult or (custom_list.items and all(self._is_item_adult(item) for item in custom_list.items)):
                    continue

            global_adult_enabled = self._adult_access_enabled()
            if not global_adult_enabled:
                filtered_items = [item for item in custom_list.items if not self._is_item_adult(item)]
            else:
                filtered_items = custom_list.items

            item_count = len(filtered_items)
            posters = []
            for item in filtered_items[:4]:
                serialized = self._serialize_item(item)
                path = serialized.poster_path
                if path and serialized.is_adult:
                    path = f"{path}#adult"
                posters.append(path)
            posters = [p for p in posters if p]
            
            resolved_image = None
            if custom_list.custom_image_path:
                from app.modules.media_assets.services.images import image_processing_service
                resolved_image = image_processing_service.resolve_image_url(custom_list.custom_image_path, "covers")
                if self._is_list_adult(custom_list):
                    resolved_image = f"{resolved_image}#adult"

            result.append(CustomListResponse(
                id=custom_list.id,
                name=custom_list.name,
                is_watchlist=custom_list.name in ("Watchlist", "NSFW Watchlist", "NSFW Movie/TV Watchlist"),
                description=custom_list.description,
                color=custom_list.color or "#3b82f6",
                list_type=custom_list.list_type,
                is_adult=custom_list.is_adult,
                created_at=custom_list.created_at.isoformat() if custom_list.created_at else None,
                item_count=item_count,
                sample_posters=posters,
                custom_image_path=resolved_image
            ))
        return result

    def get_list_details(
        self,
        list_id: int,
        watched_filter: str = "all",
        media_type_filter: str = "all",
        genre_filter: str = "all",
        gender_filter: str = "all",
        job_filter: str = "all",
        search: str = "",
        sort_by: str = "added_at",
        sort_direction: str = "desc"
    ) -> CustomListDetailResponse:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")
            
        adult_enabled = self._adult_access_enabled()
        if not adult_enabled and custom_list.name != "Watchlist":
            if custom_list.items and all(self._is_item_adult(item) for item in custom_list.items):
                raise NotFoundException("Not found")
                
        # Batch load UserOverrides to prevent N+1 queries
        media_item_ids = [item.media_item_id for item in custom_list.items if item.media_item_id]
        match_ids = [item.match_id for item in custom_list.items if item.match_id]
        for item in custom_list.items:
            if item.media_item:
                for m in item.media_item.matches:
                    match_ids.append(m.id)
        person_ids = [item.person_id for item in custom_list.items if item.person_id]

        from sqlalchemy import or_
        overrides = self.db.query(UserOverride).filter(
            or_(
                UserOverride.media_item_id.in_(media_item_ids) if media_item_ids else False,
                UserOverride.metadata_match_id.in_(match_ids) if match_ids else False,
                UserOverride.person_id.in_(person_ids) if person_ids else False
            )
        ).all()

        overrides_lookup = {
            "media_item": {o.media_item_id: o for o in overrides if o.media_item_id},
            "match": {o.metadata_match_id: o for o in overrides if o.metadata_match_id},
            "person": {o.person_id: o for o in overrides if o.person_id}
        }

        serialized_items = []
        all_genres = set()
        for item in custom_list.items:
            if not adult_enabled and self._is_item_adult(item):
                continue
            serialized = self._serialize_item(item, overrides_lookup)
            serialized_items.append(serialized)
            if serialized.genres:
                for g in serialized.genres:
                    all_genres.add(g.strip())

        # 1. Filter by watched
        if watched_filter != "all":
            want_watched = watched_filter == "watched"
            serialized_items = [x for x in serialized_items if bool(x.is_watched) == want_watched]

        # 2. Filter by media type
        if custom_list.list_type != CustomListType.PERSON.value and media_type_filter != "all":
            def match_type(item_type):
                if media_type_filter == "movie":
                    return item_type == "movie"
                elif media_type_filter == "show":
                    return item_type in ("show", "tv", "episode", "season")
                elif media_type_filter == "scene":
                    return item_type == "scene"
                elif media_type_filter == "videos":
                    return item_type == "video"
                return True
            serialized_items = [x for x in serialized_items if match_type(x.media_type)]

        # 3. Filter by genre
        if custom_list.list_type != CustomListType.PERSON.value and genre_filter != "all":
            g_lower = genre_filter.lower().strip()
            serialized_items = [
                x for x in serialized_items 
                if x.genres and any(g.lower().strip() == g_lower for g in x.genres)
            ]

        # 4. Filter by person gender
        if custom_list.list_type == CustomListType.PERSON.value and gender_filter != "all":
            g_val = 1 if gender_filter == "female" else (2 if gender_filter == "male" else None)
            if g_val is not None:
                serialized_items = [x for x in serialized_items if x.gender == g_val]

        # 5. Filter by person job
        if custom_list.list_type == CustomListType.PERSON.value and job_filter != "all":
            def match_job(dept):
                dept_str = str(dept or "")
                if job_filter == "actor":
                    return dept_str == "Acting"
                elif job_filter == "director":
                    return dept_str in ("Directing", "Creator")
                elif job_filter == "writer":
                    return dept_str == "Writing"
                elif job_filter == "sound":
                    return dept_str == "Sound"
                return True
            serialized_items = [x for x in serialized_items if match_job(x.known_for_department)]

        # 6. Text Search Query
        search_query = search.strip().lower()
        if search_query:
            def matches_search(x):
                t_match = search_query in (x.title or "").lower()
                p_match = False
                if x.people:
                    p_match = any(search_query in (p.get("name") or "").lower() for p in x.people)
                return t_match or p_match
            serialized_items = [x for x in serialized_items if matches_search(x)]

        # 7. Sorting
        def get_sort_val(x):
            if sort_by == "release_date":
                return x.release_date or ""
            elif sort_by == "user_rating":
                return x.user_rating or 0.0
            elif sort_by == "title":
                return (x.title or "").lower()
            else:
                # Default added_at
                return x.added_at or ""

        reverse_sort = sort_direction == "desc"
        if sort_by == "title" and sort_direction == "desc":
            reverse_sort = True
        elif sort_by == "title":
            reverse_sort = False

        serialized_items.sort(key=get_sort_val, reverse=reverse_sort)

        resolved_image = None
        if custom_list.custom_image_path:
            from app.modules.media_assets.services.images import image_processing_service
            resolved_image = image_processing_service.resolve_image_url(custom_list.custom_image_path, "covers")

        return CustomListDetailResponse(
            id=custom_list.id,
            name=custom_list.name,
            is_watchlist=custom_list.name in ("Watchlist", "NSFW Watchlist", "NSFW Movie/TV Watchlist"),
            description=custom_list.description,
            color=custom_list.color,
            list_type=custom_list.list_type,
            is_adult=custom_list.is_adult,
            created_at=custom_list.created_at.isoformat() if custom_list.created_at else None,
            items=serialized_items,
            custom_image_path=resolved_image,
            genres=sorted(list(all_genres))
        )

    def create_list(self, payload: Dict[str, Any]) -> CustomListResponse:
        name = payload.get("name", "").strip()
        description = payload.get("description", "")
        color = payload.get("color", "")
        list_type_str = payload.get("list_type", "movie_tv")
        try:
            list_type = CustomListType(list_type_str.lower())
        except ValueError:
            list_type = CustomListType.MOVIE_TV

        if not name:
            raise BadRequestException("List name is required")

        existing = self.db.query(CustomList).filter(CustomList.name == name).first()
        if existing:
            raise BadRequestException("A list with this name already exists")

        new_list = CustomList(
            name=name,
            description=description,
            color=color,
            list_type=list_type,
            is_adult=bool(payload.get("is_adult", False))
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
            is_adult=new_list.is_adult,
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
        is_adult = payload.get("is_adult")

        if name is not None:
            custom_list.name = name.strip()
        if description is not None:
            custom_list.description = description
        if color is not None:
            custom_list.color = color.strip()
        if is_adult is not None:
            custom_list.is_adult = bool(is_adult)
        self.db.commit()
        return self.get_list_details(list_id)

    def delete_list(self, list_id: int) -> Dict[str, Any]:
        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")
        if custom_list.name in ("Watchlist", "NSFW Watchlist", "NSFW Movie/TV Watchlist"):
            raise BadRequestException("Watchlist cannot be deleted")

        self.db.delete(custom_list)
        self.db.commit()
        return {"status": "success"}

    def add_item_to_list(self, list_id: int, payload: Dict[str, Any]) -> CustomListItemResponse:
        from app.modules.library.models import MediaItem
        from app.modules.metadata.models import MetadataMatch

        media_item_id = payload.get("media_item_id")
        tmdb_id = payload.get("tmdb_id")
        media_type = payload.get("media_type", "movie")
        provider_name = payload.get("provider")
        person_id = payload.get("person_id")
        match_id = payload.get("match_id")

        # Parse unified string IDs (e.g. "tmdb_46459" or "porndb_123")
        from app.modules.scrapers.support.registry import ProviderRegistry
        adult_providers = ProviderRegistry.get_adult_providers()
        default_adult = adult_providers[0] if adult_providers else Provider.PORNDB
        provider = default_adult if media_type == "scene" else Provider.TMDB
        external_id = str(tmdb_id) if tmdb_id else None

        if isinstance(media_item_id, str):
            if "_" in media_item_id:
                try:
                    provider, external_id = ProviderRegistry.clean_id(media_item_id)
                    media_item_id = None
                except ValueError:
                    from app.modules.library.services.media_item_service import MediaItemService
                    resolved_item_id, resolved_match_id = MediaItemService(self.db).resolve_ids(media_item_id, media_type)
                    if resolved_item_id:
                        media_item_id = resolved_item_id
                    if resolved_match_id and not match_id:
                        match_id = resolved_match_id
                    
                    if not resolved_item_id and isinstance(media_item_id, str) and media_item_id.isdigit():
                        media_item_id = int(media_item_id)
            elif media_item_id.isdigit():
                media_item_id = int(media_item_id)

        if tmdb_id and isinstance(tmdb_id, str):
            if "_" in tmdb_id:
                try:
                    provider, external_id = ProviderRegistry.clean_id(tmdb_id)
                except ValueError:
                    external_id = tmdb_id
            else:
                external_id = tmdb_id

        if provider_name:
            p_enum = ProviderRegistry.get_provider_by_prefix(provider_name)
            if p_enum:
                provider = p_enum

        # If we have a matching provider/external_id, check if it already exists as a local MediaItem
        if external_id and not media_item_id:
            local_item = self.db.query(MediaItem).join(MediaItem.matches).filter(
                MetadataMatch.provider == provider,
                MetadataMatch.external_id == str(external_id)
            ).first()
            if local_item:
                media_item_id = local_item.id

        custom_list = self.db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            raise NotFoundException("Not found")

        # Check list type constraints
        if custom_list.list_type == CustomListType.PERSON or custom_list.list_type == CustomListType.PERSON.value:
            if not person_id:
                raise BadRequestException("This list only accepts people/performers.")
        elif custom_list.list_type == CustomListType.MOVIE_TV or custom_list.list_type == CustomListType.MOVIE_TV.value:
            if person_id:
                raise BadRequestException("Cannot add a person to a media list.")
            from app.core.enums import MediaType
            resolved_type = None
            if match_id:
                m_obj = self.db.query(MetadataMatch).filter(MetadataMatch.id == match_id).first()
                if m_obj:
                    resolved_type = m_obj.media_type
            elif media_item_id:
                med_item = self.db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
                if med_item and med_item.matches:
                    resolved_type = med_item.matches[0].media_type
            
            if not resolved_type and media_type:
                try:
                    resolved_type = MediaType(media_type.lower())
                except ValueError:
                    pass
            
            if resolved_type and resolved_type not in (MediaType.MOVIE, MediaType.TV, MediaType.EPISODE, MediaType.SEASON, MediaType.VIDEO):
                raise BadRequestException("This list only accepts movies, TV shows, and videos.")
                
        elif custom_list.list_type == CustomListType.VIDEO_SCENE or custom_list.list_type == CustomListType.VIDEO_SCENE.value:
            if person_id:
                raise BadRequestException("Cannot add a person to a media list.")
            from app.core.enums import MediaType
            resolved_type = None
            if match_id:
                m_obj = self.db.query(MetadataMatch).filter(MetadataMatch.id == match_id).first()
                if m_obj:
                    resolved_type = m_obj.media_type
            elif media_item_id:
                med_item = self.db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
                if med_item and med_item.matches:
                    resolved_type = med_item.matches[0].media_type
            
            if not resolved_type and media_type:
                try:
                    resolved_type = MediaType(media_type.lower())
                except ValueError:
                    pass
            
            if resolved_type and resolved_type not in (MediaType.SCENE, MediaType.VIDEO):
                raise BadRequestException("This list only accepts videos and scenes.")

        if not match_id and external_id:
            from datetime import datetime
            # Use robust deduplicated lookup for adult scenes
            from app.modules.scrapers.support.registry import ProviderRegistry
            if MediaType.is_adult_type(media_type) or ProviderRegistry.is_adult_provider(provider):
                clean_id = str(external_id)
                if clean_id.startswith("scene_"):
                    clean_id = clean_id.split("_", 1)[1]
                candidates = [clean_id, f"scene_{clean_id}"]
                match = self.db.query(MetadataMatch).filter(
                    MetadataMatch.provider.in_(ProviderRegistry.get_adult_providers()),
                    MetadataMatch.external_id.in_(candidates),
                    MetadataMatch.media_type == MediaType.SCENE
                ).first()
            else:
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
                    except Exception as e:
                        try:
                            logger.debug(f"Swallowed exception: {e}", exc_info=True)
                        except Exception:
                            pass
                        pass

                from app.modules.scrapers.support.registry import ProviderRegistry
                is_adult_item = ProviderRegistry.is_adult_provider(provider) or m_type.is_adult
                match = MetadataMatch(
                    provider=provider,
                    external_id=str(external_id),
                    media_type=m_type,
                    original_title=payload.get("title"),
                    release_date=rel_date,
                    backdrop_path=payload.get("poster_path") if m_type.is_adult else None,
                    is_adult=is_adult_item
                )
                self.db.add(match)
                self.db.commit()

                # Create basic metadata localization
                title = payload.get("title")
                poster_path = payload.get("poster_path")
                if title or poster_path:
                    from app.modules.metadata.models import MetadataLocalization
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
            from app.modules.people.models import Person, ExternalSourceLink
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
                    from app.modules.scrapers.support.registry import ProviderRegistry
                    p_enum = ProviderRegistry.get_provider_by_prefix(prefix)
                        
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
                from app.modules.scrapers.support.gateway import scraper_gateway
                from app.modules.library.services.media_item_service import MediaItemService
                from app.modules.media_assets.services.images import image_processing_service
                from app.modules.people.services.people_search_service import PeopleSearchService
                
                search_service = PeopleSearchService(
                    db=self.db,
                    scrapers=scraper_gateway,
                    resolver=MediaItemService(self.db),
                    image_service=image_processing_service
                )
                try:
                    import_id = str(person_id)
                    if isinstance(person_id, str) and "_" in person_id and ":" not in person_id:
                        prefix, val = person_id.split("_", 1)
                        from app.modules.scrapers.support.registry import ProviderRegistry
                        if ProviderRegistry.is_valid_prefix(prefix):
                            import_id = f"{prefix}:{val}"
                            
                    res = search_service.add_person_tmdb(import_id, is_active=True)
                    if res and res.get("status") == "success":
                        person_id = res["id"]
                except Exception as e:
                    logger.error(f"Failed to dynamically import person {person_id} for custom list: {e}")
                    raise BadRequestException(f"Failed to import performer: {str(e)}")

        # Ensure item adult status matches list adult status
        is_item_adult = False
        if person_id:
            from app.modules.people.models import Person
            p_obj = self.db.query(Person).filter(Person.id == person_id).first()
            is_item_adult = bool(p_obj and p_obj.is_adult)
        elif match_id:
            from app.modules.metadata.models import MetadataMatch
            from app.modules.scrapers.support.registry import ProviderRegistry
            m_obj = self.db.query(MetadataMatch).filter(MetadataMatch.id == match_id).first()
            if m_obj:
                is_item_adult = bool(m_obj.is_adult or ProviderRegistry.is_adult_provider(m_obj.provider))
        elif media_item_id:
            from app.modules.library.models import MediaItem
            from app.modules.scrapers.support.registry import ProviderRegistry
            med_item = self.db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
            if med_item and med_item.matches:
                is_item_adult = bool(med_item.matches[0].is_adult or ProviderRegistry.is_adult_provider(med_item.matches[0].provider))
        
        if custom_list.is_adult != is_item_adult:
            raise BadRequestException("Cannot mix SFW and NSFW items in a custom list.")

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
            result = self._serialize_item(exists)
            result.already_exists = True
            return result

        from datetime import datetime, timezone
        item = CustomListItem(
            list_id=list_id,
            media_item_id=media_item_id,
            match_id=match_id,
            person_id=person_id,
            added_at=datetime.now(timezone.utc)
        )
        self.db.add(item)
        self.db.commit()

        # Serialize the item first while it is fresh in the session and definitely exists
        serialized_fallback = self._serialize_item(item)

        # Track the item immediately so it gets enriched and fully imported into the database
        try:
            from app.modules.users.services.overrides_service import OverridesService
            from app.modules.library.services.media_item_service import MediaItemService
            from app.modules.scrapers.support.gateway import scraper_gateway
            from app.modules.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
            
            resolver = MediaItemService(self.db)
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
                from app.modules.scrapers.support.registry import ProviderRegistry
                cfg = ProviderRegistry.get_config(provider)
                prefix = cfg.prefix if cfg else provider.value.lower()
                track_id = f"{prefix}_{external_id}"
                
            if track_id:
                overrides.track_item(track_id, True)
        except Exception as ex:
            logger.error(f"Failed to auto-track list item {media_item_id or tmdb_id}: {ex}")

        try:
            self.db.refresh(item)
            if item.match:
                self.db.refresh(item.match)
            return self._serialize_item(item)
        except Exception:
            try:
                db_item = self.db.query(CustomListItem).filter(CustomListItem.id == serialized_fallback["id"]).first()
                if db_item:
                    return self._serialize_item(db_item)
            except Exception as e:
                try:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
                except Exception:
                    pass
                pass
            return serialized_fallback

    def remove_item_from_list(self, list_id: int, item_id: int) -> Dict[str, Any]:
        item = self.db.query(CustomListItem).filter(CustomListItem.list_id == list_id, CustomListItem.id == item_id).first()
        if not item:
            raise NotFoundException("Not found")
        self.db.delete(item)
        self.db.commit()
        return {"status": "success"}

    def get_item_membership(self, item_id: str) -> ListMembershipResponse:
        media_item_id = None
        person_id = None
        provider = None
        external_id = None

        if item_id.startswith("person_"):
            p_val = item_id.replace("person_", "")
            if p_val.isdigit():
                person_id = int(p_val)
            else:
                person_id = p_val
        elif "_" in item_id:
            from app.modules.scrapers.support.registry import ProviderRegistry
            try:
                provider, external_id = ProviderRegistry.clean_id(item_id)
            except ValueError:
                pass
        else:
            try:
                media_item_id = int(item_id)
            except (ValueError, TypeError) as e:
                try:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
                except Exception:
                    pass
                pass

        query = self.db.query(CustomListItem)
        if media_item_id:
            query = query.filter(CustomListItem.media_item_id == media_item_id)
        elif provider and external_id:
            local_item = self.db.query(MediaItem).join(MediaItem.matches).filter(
                MetadataMatch.provider == provider,
                MetadataMatch.external_id == str(external_id)
            ).first()
            match = self.db.query(MetadataMatch).filter(
                MetadataMatch.provider == provider,
                MetadataMatch.external_id == str(external_id)
            ).first()
            filters = []
            if match:
                filters.append(CustomListItem.match_id == match.id)
            if local_item:
                filters.append(CustomListItem.media_item_id == local_item.id)
            if filters:
                from sqlalchemy import or_
                query = query.filter(or_(*filters))
            else:
                return ListMembershipResponse(list_ids=[])
        elif person_id:
            query = query.filter(CustomListItem.person_id == person_id)
        else:
            return ListMembershipResponse(list_ids=[])

        items = query.all()
        list_ids = list(set(item.list_id for item in items))
        from app.modules.users.schemas import ListMembershipItem
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
                    "media_type": (match.media_type.value if hasattr(match.media_type, "value") else match.media_type) if match else "movie",
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
            parsed = parse_identifier(str(raw_id))
            if parsed and parsed.provider == "tmdb":
                tmdb_id = parsed.external_id
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
        from app.modules.media_assets.services.images import image_processing_service
        
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
