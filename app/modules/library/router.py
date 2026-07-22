from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.modules.tasks.image_download_service import ImageDownloadService
from app.modules.library.services.library_service import LibraryService
from app.modules.metadata.schemas import MetadataMatchRead
from app.modules.library.schemas import (
    MediaItemRead,
    LibraryRead,
    LibraryStatsResponse,
    ContinueWatchingItem,
    LibraryTabResponse,
    GroupedLibraryResponse,
    TagGroupItem,
    FilterOptionsResponse,
    MovieCollectionsResponse,
    TvShowDetailResponse,
    TvSeasonDetailResponse,
    CollectionDetailResponse,
)
from app.modules.people.schemas import PeopleGroupItem
from app.modules.library.services.library_stats_service import LibraryStatsService
from app.modules.library.services.library_listing_service import LibraryListingService
from app.modules.library.services.library_collection_service import LibraryCollectionService
from app.modules.library.services.library_filter_service import LibraryFilterService
from typing import Union
from app.modules.people.services.people_library_service import PeopleLibraryService
from app.modules.library.services.detail.movie_detail_service import MovieDetailService
from app.modules.library.services.detail.tv_detail_service import TvDetailService
from app.modules.library.services.detail.scene_detail_service import SceneDetailService
from app.modules.library.services.detail.collection_detail_service import CollectionDetailService


# Mainstream (SFW) Media Router
mainstream_router = APIRouter(prefix="/api/v1/mainstream/media", tags=["Mainstream Media"])

# Adult (NSFW) Media Router
adult_router = APIRouter(prefix="/api/v1/adult/media", tags=["Adult Media"])

# Common Media Router
router = APIRouter(prefix="/api/v1/media", tags=["General Media"])

# Legacy Library Endpoints for Swaya Frontend
library_router = APIRouter(prefix="/api/v1", tags=["Library"])


# --- Mainstream Router Endpoints ---
@mainstream_router.get("", response_model=List[MetadataMatchRead])
def list_mainstream_metadata(db: Session = Depends(get_db), limit: int = 50):
    """List mainstream metadata matches (SFW)."""
    return LibraryService(db).list_mainstream_metadata(limit)


# --- Adult Router Endpoints ---
@adult_router.get("", response_model=List[MetadataMatchRead])
def list_adult_metadata(db: Session = Depends(get_db), limit: int = 50):
    """List adult metadata matches (NSFW)."""
    return LibraryService(db).list_adult_metadata(limit)


# General Media Router Endpoints ---
@router.get("/items", response_model=List[MediaItemRead])
def list_media_items(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve indexed physical media files."""
    return LibraryService(db).list_media_items(limit)


@router.get("/libraries", response_model=List[LibraryRead])
def list_libraries(db: Session = Depends(get_db)):
    """Retrieve registered media source roots."""
    return LibraryService(db).list_libraries()




@library_router.get("/library/stats", response_model=LibraryStatsResponse)
def get_stats(db: Session = Depends(get_db), include_adult: bool = False):
    from app.modules.settings.services.settings_service import SettingsService
    return LibraryStatsService(db, settings=SettingsService(db)).get_stats(include_adult=include_adult)


@library_router.get("/library/ratings/stats")
def get_ratings_stats(
    db: Session = Depends(get_db),
    include_adult: bool = False,
    gender: Optional[str] = None
):
    from app.core.user_context import get_current_user_id
    from app.modules.library.services.ratings_stats_service import RatingsStatsService
    current_uid = get_current_user_id() or 1
    return RatingsStatsService(db).get_ratings_stats(
        current_uid=current_uid,
        include_adult=include_adult,
        adult_gender_preference=gender
    )


@library_router.get("/library/continue-watching", response_model=List[ContinueWatchingItem])
def get_continue_watching(db: Session = Depends(get_db), limit: int = 12, include_adult: bool = False):
    from app.modules.settings.services.settings_service import SettingsService
    from app.modules.history.playback.playback_monitor import active_sessions
    return LibraryListingService(
        db,
        settings=SettingsService(db),
        active_sessions=active_sessions
    ).get_continue_watching(limit=limit, include_adult=include_adult)


@library_router.get("/library", response_model=Union[LibraryTabResponse, GroupedLibraryResponse])
def get_library_items(
    db: Session = Depends(get_db),
    tab: Optional[str] = None,
    page: int = 1,
    page_size: int = 40,
    sort_by: str = "title_asc",
    search: str = "",
    selected_tags: Optional[str] = None,
    selected_genre: Optional[str] = None,
    selected_decade: Optional[str] = None,
    selected_year: Optional[int] = None,
    filter_favorite: str = "all",
    filter_watched: str = "all",
    filter_ownership: str = "owned",
    filter_status: str = "active",
    filter_gender: str = "all",
    people_role: str = "all",
    include_adult: bool = False,
    selected_performer_id: Optional[int] = None,
    selected_studio_id: Optional[int] = None,
    selected_network_id: Optional[int] = None,
    filter_hair_color: Optional[str] = None,
    filter_ethnicity: Optional[str] = None,
    filter_eye_color: Optional[str] = None,
    filter_tattoos: Optional[str] = None,
    filter_piercings: Optional[str] = None,
    filter_breast_type: Optional[str] = None,
    filter_breast_size: Optional[str] = None,
    filter_butt_shape: Optional[str] = None,
    filter_butt_size: Optional[str] = None,
    filter_rating: str = "all",
):
    from app.modules.settings.services.settings_service import SettingsService
    service = LibraryListingService(db, settings=SettingsService(db))
    if tab:
        tags_list = None
        if selected_tags:
            tags_list = [t.strip() for t in selected_tags.split(",") if t.strip()]
        return service.get_library_tab_page(
            tab=tab,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            search=search,
            selected_tags=tags_list,
            selected_genre=selected_genre,
            selected_decade=selected_decade,
            selected_year=selected_year,
            filter_favorite=filter_favorite,
            filter_watched=filter_watched,
            filter_ownership=filter_ownership,
            filter_status=filter_status,
            filter_gender=filter_gender,
            people_role=people_role,
            include_adult=include_adult,
            selected_performer_id=selected_performer_id,
            selected_studio_id=selected_studio_id,
            selected_network_id=selected_network_id,
            filter_hair_color=filter_hair_color,
            filter_ethnicity=filter_ethnicity,
            filter_eye_color=filter_eye_color,
            filter_tattoos=filter_tattoos,
            filter_piercings=filter_piercings,
            filter_breast_type=filter_breast_type,
            filter_breast_size=filter_breast_size,
            filter_butt_shape=filter_butt_shape,
            filter_butt_size=filter_butt_size,
            filter_rating=filter_rating,
        )

    return service.get_grouped_library(include_adult=include_adult)


from app.modules.library.schemas import LibraryTagsResponse, TagItem

@library_router.get("/library/tags", response_model=LibraryTagsResponse)
def get_library_tags(
    db: Session = Depends(get_db),
    is_adult: bool = False,
    page: int = 1,
    page_size: int = 40,
    q: Optional[str] = None
):
    return LibraryFilterService(db).get_tag_groups(
        is_adult=is_adult,
        page=page,
        page_size=page_size,
        search=q
    )


@library_router.get("/library/tags/{tag_name}/items", response_model=TagItem)
def get_library_tag_items(
    tag_name: str,
    is_adult: bool = False,
    db: Session = Depends(get_db)
):
    return LibraryFilterService(db).get_tag_items(
        tag_name=tag_name,
        is_adult=is_adult
    )


@library_router.get("/library/filters", response_model=FilterOptionsResponse)
def get_library_filters(
    db: Session = Depends(get_db),
    tab: str = "movies",
    filter_ownership: str = "owned",
    filter_status: str = "active",
    include_adult: bool = False,
    selected_tags: Optional[str] = None,
    selected_genre: Optional[str] = None,
    selected_decade: Optional[str] = None,
    selected_year: Optional[int] = None,
    filter_favorite: str = "all",
    filter_watched: str = "all",
    filter_gender: str = "all",
    people_role: str = "all",
    selected_performer_id: Optional[int] = None,
    selected_studio_id: Optional[int] = None,
    selected_network_id: Optional[int] = None,
    filter_hair_color: Optional[str] = None,
    filter_ethnicity: Optional[str] = None,
    filter_eye_color: Optional[str] = None,
    filter_tattoos: Optional[str] = None,
    filter_piercings: Optional[str] = None,
    filter_breast_type: Optional[str] = None,
    filter_breast_size: Optional[str] = None,
    filter_butt_shape: Optional[str] = None,
    filter_butt_size: Optional[str] = None,
):
    from app.modules.library.services.listing.filter_params import ListingFilterParams
    
    tags_list = None
    if selected_tags:
        tags_list = [t.strip() for t in selected_tags.split(",") if t.strip()]
 
    params = ListingFilterParams(
        tab=tab,
        selected_tags=tags_list,
        selected_genre=selected_genre,
        selected_decade=selected_decade,
        selected_year=selected_year,
        filter_favorite=filter_favorite,
        filter_watched=filter_watched,
        filter_ownership=filter_ownership,
        filter_status=filter_status,
        filter_gender=filter_gender,
        people_role=people_role,
        include_adult=include_adult,
        selected_performer_id=selected_performer_id,
        selected_studio_id=selected_studio_id,
        selected_network_id=selected_network_id,
        filter_hair_color=filter_hair_color,
        filter_ethnicity=filter_ethnicity,
        filter_eye_color=filter_eye_color,
        filter_tattoos=filter_tattoos,
        filter_piercings=filter_piercings,
        filter_breast_type=filter_breast_type,
        filter_breast_size=filter_breast_size,
        filter_butt_shape=filter_butt_shape,
        filter_butt_size=filter_butt_size,
    )
    return LibraryFilterService(db).get_library_filter_options(params)


@library_router.get("/library/collections", response_model=MovieCollectionsResponse)
def get_movie_collections(
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: Optional[int] = 40,
    search: str = "",
    tab: str = "movies",
    include_adult: bool = False,
    collection_status: str = "all",
    sort_by: str = "owned_count",
    sort_direction: str = "desc",
):
    from app.modules.settings.services.settings_service import SettingsService
    from app.modules.scrapers.support.gateway import scraper_gateway
    from app.core.enums import Provider
    return LibraryCollectionService(
        db,
        settings=SettingsService(db),
        image_downloader=ImageDownloadService(),
        tmdb_scraper=scraper_gateway.get_scraper(Provider.TMDB, db)
    ).get_movie_collections(
        page=page,
        page_size=page_size,
        search=search,
        tab=tab,
        include_adult=include_adult,
        collection_status=collection_status,
        sort_by=sort_by,
        sort_direction=sort_direction,
    )




@library_router.get("/library/people/{role}", response_model=List[PeopleGroupItem])
def get_library_people(
    role: str,
    db: Session = Depends(get_db),
    filter_status: str = "active",
    tab: str = "people",
    include_adult: bool = False,
):
    return PeopleLibraryService(db).get_people_group(
        role=role,
        filter_status=filter_status,
        tab=tab,
        include_adult=include_adult,
    )




def get_scraper_gateway():
    from app.modules.scrapers.support.gateway import scraper_gateway
    return scraper_gateway

@library_router.get("/library/item/{item_id}")
def get_library_item_detail(
    item_id: str,
    full_people: bool = False,
    media_type: Optional[str] = None,
    db: Session = Depends(get_db),
    scrapers: Any = Depends(get_scraper_gateway)
):
    from app.modules.scrapers.support.registry import MediaTypeRegistry, ProviderRegistry
    from app.core.enums import MediaType

    # Explicit media_type from query param
    if media_type:
        try:
            m_enum = MediaType(media_type.lower())
        except ValueError:
            m_enum = MediaType.MOVIE
        cfg = MediaTypeRegistry.get_config(m_enum)
        if cfg and cfg.detail_loader:
            return cfg.detail_loader(db, scrapers, item_id, full_people=full_people)

    # Auto-detect from ID prefix
    detected_type = MediaType.MOVIE
    if "_" in item_id:
        prefix = item_id.split("_", 1)[0].lower()
        resolved = ProviderRegistry.resolve_prefix(prefix)
        if resolved in (Provider.STASHDB, Provider.FANSDB) or prefix == "scene":
            detected_type = MediaType.SCENE
        elif prefix == "manual":
            detected_type = MediaType.VIDEO
        elif resolved == Provider.PORNDB:
            scene_uuid = item_id.split("_", 1)[1]
            from app.modules.metadata.models import MetadataMatch
            match_db = db.query(MetadataMatch).filter(
                MetadataMatch.external_id == scene_uuid,
                MetadataMatch.media_type == MediaType.SCENE
            ).first()
            if match_db:
                detected_type = MediaType.SCENE
            else:
                scene_cfg = MediaTypeRegistry.get_config(MediaType.SCENE)
                if scene_cfg and scene_cfg.detail_loader:
                    scene_resp = scene_cfg.detail_loader(db, scrapers, item_id)
                    if isinstance(scene_resp, JSONResponse) and scene_resp.status_code == 404:
                        detected_type = MediaType.MOVIE
                    else:
                        return scene_resp

    cfg = MediaTypeRegistry.get_config(detected_type)
    if cfg and cfg.detail_loader:
        return cfg.detail_loader(db, scrapers, item_id, full_people=full_people)

    return JSONResponse(status_code=404, content={"detail": "Detail loader not found for this media type"})


@library_router.get("/library/tv/{tv_tmdb_id}", response_model=TvShowDetailResponse)
def get_library_tv_detail(
    tv_tmdb_id: str,
    seasons_limit: int = 999,
    initial_episodes_limit: int = 999,
    language: str = None,
    db: Session = Depends(get_db),
    scrapers: Any = Depends(get_scraper_gateway)
):
    return TvDetailService(db, scrapers).get_library_tv_detail(
        tv_tmdb_id, seasons_limit=seasons_limit, initial_episodes_limit=initial_episodes_limit, language=language
    )


@library_router.get("/library/tv/{tv_tmdb_id}/season/{season_number}", response_model=TvSeasonDetailResponse)
def get_library_tv_season_detail(
    tv_tmdb_id: str,
    season_number: int,
    db: Session = Depends(get_db),
    scrapers: Any = Depends(get_scraper_gateway)
):
    return TvDetailService(db, scrapers).get_library_tv_season_detail(tv_tmdb_id, season_number)


@library_router.get("/library/collection/{collection_tmdb_id}", response_model=CollectionDetailResponse)
def get_library_collection_detail(
    collection_tmdb_id: str,
    language: str | None = None,
    db: Session = Depends(get_db),
    scrapers: Any = Depends(get_scraper_gateway)
):
    return CollectionDetailService(db, scrapers, image_downloader=ImageDownloadService()).get_collection_detail(collection_tmdb_id, language=language)
