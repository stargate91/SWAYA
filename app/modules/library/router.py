from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.modules.tasks.tasks_image_download_adapter import TasksImageDownloadAdapter
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
    from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
    return LibraryStatsService(db, settings_port=DbSettingsAdapter(db)).get_stats(include_adult=include_adult)


@library_router.get("/library/continue-watching", response_model=List[ContinueWatchingItem])
def get_continue_watching(db: Session = Depends(get_db), limit: int = 12, include_adult: bool = False):
    from app.modules.library.db_media_resolver import DbMediaResolver
    from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
    from app.modules.history.playback.playback_monitor import active_sessions
    return LibraryListingService(
        db,
        library_port=DbMediaResolver(db),
        settings_port=DbSettingsAdapter(db),
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
):
    from app.modules.library.db_media_resolver import DbMediaResolver
    from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
    service = LibraryListingService(db, library_port=DbMediaResolver(db), settings_port=DbSettingsAdapter(db))
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
        )

    return service.get_grouped_library(include_adult=include_adult)


@library_router.get("/library/tags", response_model=List[TagGroupItem])
def get_library_tags(db: Session = Depends(get_db), is_adult: bool = False):
    from app.modules.users.db_user_repository import DbUserRepository
    user_repo = DbUserRepository(db)
    return LibraryFilterService(db, user_repository=user_repo).get_tag_groups(is_adult)


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
    from app.modules.users.db_user_repository import DbUserRepository
    from app.modules.library.services.listing.filter_params import ListingFilterParams
    user_repo = DbUserRepository(db)
    
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
    return LibraryFilterService(db, user_repository=user_repo).get_library_filter_options(params)


@library_router.get("/library/collections", response_model=MovieCollectionsResponse)
def get_movie_collections(
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: Optional[int] = 40,
    search: str = "",
    tab: str = "movies",
    include_adult: bool = False,
):
    from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
    from app.modules.scrapers.providers.tmdb import TMDBScraper
    return LibraryCollectionService(
        db,
        settings_port=DbSettingsAdapter(db),
        image_downloader=TasksImageDownloadAdapter(),
        tmdb_scraper=TMDBScraper(db)
    ).get_movie_collections(
        page=page,
        page_size=page_size,
        search=search,
        tab=tab,
        include_adult=include_adult,
    )




@library_router.get("/library/people/{role}", response_model=List[PeopleGroupItem])
def get_library_people(
    role: str,
    db: Session = Depends(get_db),
    filter_status: str = "active",
    tab: str = "people",
    include_adult: bool = False,
):
    from app.modules.library.db_media_resolver import DbMediaResolver
    return PeopleLibraryService(db, library_port=DbMediaResolver(db)).get_people_group(
        role=role,
        filter_status=filter_status,
        tab=tab,
        include_adult=include_adult,
    )




def get_scraper_gateway() -> ScraperGatewayPort:
    from app.modules.scrapers.support.gateway import scraper_gateway
    return scraper_gateway

DETAIL_DISPATCH = {
    "scene": lambda db, scrapers, item_id, **kw: SceneDetailService(db, scrapers, image_downloader=TasksImageDownloadAdapter()).get_scene_detail(item_id),
    "movie": lambda db, scrapers, item_id, **kw: MovieDetailService(db, scrapers).get_library_item_detail(item_id, full_people=kw.get("full_people", False)),
    "tv":    lambda db, scrapers, item_id, **kw: TvDetailService(db, scrapers).get_library_tv_detail(item_id),
}

@library_router.get("/library/item/{item_id}")
def get_library_item_detail(
    item_id: str,
    full_people: bool = False,
    media_type: Optional[str] = None,
    db: Session = Depends(get_db),
    scrapers: Any = Depends(get_scraper_gateway)
):
    # Explicit media_type from query param
    if media_type and media_type.lower() in DETAIL_DISPATCH:
        return DETAIL_DISPATCH[media_type.lower()](db, scrapers, item_id, full_people=full_people)

    # Auto-detect from ID prefix
    if "_" in item_id:
        prefix = item_id.split("_", 1)[0].lower()
        if prefix in ("stash", "stashdb", "fansdb", "scene"):
            return DETAIL_DISPATCH["scene"](db, scrapers, item_id)
        elif prefix in ("porndb", "theporndb"):
            scene_uuid = item_id.split("_", 1)[1]
            from app.modules.metadata.models import MetadataMatch
            from app.core.enums import MediaType
            match_db = db.query(MetadataMatch).filter(
                MetadataMatch.external_id == scene_uuid,
                MetadataMatch.media_type == MediaType.SCENE
            ).first()
            if match_db:
                return DETAIL_DISPATCH["scene"](db, scrapers, item_id)
            
            scene_resp = DETAIL_DISPATCH["scene"](db, scrapers, item_id)
            if isinstance(scene_resp, JSONResponse) and scene_resp.status_code == 404:
                return DETAIL_DISPATCH["movie"](db, scrapers, item_id, full_people=full_people)
            return scene_resp

    return DETAIL_DISPATCH["movie"](db, scrapers, item_id, full_people=full_people)


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
    return CollectionDetailService(db, scrapers, image_downloader=TasksImageDownloadAdapter()).get_collection_detail(collection_tmdb_id, language=language)
