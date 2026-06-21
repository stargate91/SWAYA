from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.domains.media.models.filesystem import MediaItem, Library
from app.domains.media.models.metadata import MetadataMatch
from app.domains.media.schemas import MediaItemRead, MetadataMatchRead, LibraryRead

# Mainstream (SFW) Media Router
mainstream_router = APIRouter(prefix="/api/v1/mainstream/media", tags=["Mainstream Media"])

# Adult (NSFW) Media Router
adult_router = APIRouter(prefix="/api/v1/adult/media", tags=["Adult Media"])

# Common Media Router
router = APIRouter(prefix="/api/v1/media", tags=["General Media"])


# --- Mainstream Router Endpoints ---
@mainstream_router.get("", response_model=List[MetadataMatchRead])
def list_mainstream_metadata(db: Session = Depends(get_db), limit: int = 50):
    """List mainstream metadata matches (SFW)."""
    return db.query(MetadataMatch).filter(MetadataMatch.is_adult == False).limit(limit).all()


# --- Adult Router Endpoints ---
@adult_router.get("", response_model=List[MetadataMatchRead])
def list_adult_metadata(db: Session = Depends(get_db), limit: int = 50):
    """List adult metadata matches (NSFW)."""
    return db.query(MetadataMatch).filter(MetadataMatch.is_adult == True).limit(limit).all()


# General Media Router Endpoints ---
@router.get("/items", response_model=List[MediaItemRead])
def list_media_items(db: Session = Depends(get_db), limit: int = 50):
    """Retrieve indexed physical media files."""
    return db.query(MediaItem).limit(limit).all()


@router.get("/libraries", response_model=List[LibraryRead])
def list_libraries(db: Session = Depends(get_db)):
    """Retrieve registered media source roots."""
    return db.query(Library).all()


# --- Legacy Library Endpoints for RENDA Frontend ---
library_router = APIRouter(prefix="/api/v1", tags=["Library"])

from app.domains.media.services.library_service import LibraryService
from typing import Optional

@library_router.get("/library/stats")
def get_stats(db: Session = Depends(get_db), include_adult: bool = False):
    return LibraryService(db).get_stats(include_adult=include_adult)


@library_router.get("/library/continue-watching")
def get_continue_watching(db: Session = Depends(get_db), limit: int = 12, include_adult: bool = False):
    return LibraryService(db).get_continue_watching(limit=limit, include_adult=include_adult)


@library_router.get("/library")
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
):
    service = LibraryService(db)
    if tab:
        return service.get_library_tab_page(
            tab=tab,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            search=search,
            filter_favorite=filter_favorite,
            filter_watched=filter_watched,
            filter_ownership=filter_ownership,
            filter_status=filter_status,
            filter_gender=filter_gender,
            people_role=people_role,
            include_adult=include_adult,
        )
    return service.get_grouped_library(include_adult=include_adult)


@library_router.get("/library/tags")
def get_library_tags(db: Session = Depends(get_db), is_adult: bool = False):
    return LibraryService(db).get_tag_groups(is_adult)


@library_router.get("/library/filters")
def get_library_filters(
    db: Session = Depends(get_db),
    tab: str = "movies",
    filter_ownership: str = "owned",
    filter_status: str = "active"
):
    return LibraryService(db).get_library_filter_options(tab, filter_ownership, filter_status)


@library_router.get("/library/collections")
def get_movie_collections(
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: Optional[int] = 40,
    search: str = "",
    tab: str = "movies",
    include_adult: bool = False,
):
    return LibraryService(db).get_movie_collections(
        page=page,
        page_size=page_size,
        search=search,
        tab=tab,
        include_adult=include_adult,
    )


@library_router.get("/library/people/{role}")
def get_library_people(
    role: str,
    db: Session = Depends(get_db),
    filter_status: str = "active",
    tab: str = "people",
    include_adult: bool = False,
):
    return LibraryService(db).get_people_group(
        role=role,
        filter_status=filter_status,
        tab=tab,
        include_adult=include_adult,
    )


from app.domains.media.services.library_detail_service import LibraryDetailService

@library_router.get("/library/item/{item_id}")
def get_library_item_detail(item_id: str, full_people: bool = False, db: Session = Depends(get_db)):
    return LibraryDetailService(db).get_library_item_detail(item_id, full_people=full_people)


@library_router.get("/library/tv/{tv_tmdb_id}")
def get_library_tv_detail(
    tv_tmdb_id: str,
    seasons_limit: int = 5,
    initial_episodes_limit: int = 4,
    db: Session = Depends(get_db)
):
    return LibraryDetailService(db).get_library_tv_detail(
        tv_tmdb_id, seasons_limit=seasons_limit, initial_episodes_limit=initial_episodes_limit
    )


@library_router.get("/library/tv/{tv_tmdb_id}/season/{season_number}")
def get_library_tv_season_detail(tv_tmdb_id: str, season_number: int, db: Session = Depends(get_db)):
    return LibraryDetailService(db).get_library_tv_season_detail(tv_tmdb_id, season_number)


@library_router.get("/library/collection/{collection_tmdb_id}")
def get_library_collection_detail(collection_tmdb_id: str, language: str | None = None, db: Session = Depends(get_db)):
    return LibraryDetailService(db).get_collection_detail(collection_tmdb_id, language=language)


from app.domains.media.services.playback_service import PlaybackService

@library_router.post("/media/play")
def play_media_item(payload: dict, db: Session = Depends(get_db)):
    item_id = payload.get("item_id")
    if not item_id:
        return JSONResponse(status_code=400, content={"error": "item_id is required"})
    return PlaybackService(db).play_media_item(item_id)


@library_router.post("/media/preview")
def preview_media_file(payload: dict, db: Session = Depends(get_db)):
    file_path = payload.get("file_path")
    start_seconds = payload.get("start_seconds") or 0
    return PlaybackService(db).preview_media_file(file_path, start_seconds)


@library_router.post("/reveal")
def reveal_in_explorer(payload: dict, db: Session = Depends(get_db)):
    path = payload.get("path")
    return PlaybackService(db).reveal_in_explorer(path)


@library_router.post("/open-path")
def open_path(payload: dict, db: Session = Depends(get_db)):
    path = payload.get("path")
    return PlaybackService(db).open_path(path)


@library_router.get("/library/watched-history")
def get_watched_history(page: int = 1, limit: int = 20, include_adult: bool = False, db: Session = Depends(get_db)):
    return PlaybackService(db).get_watched_history(page=page, limit=limit, include_adult=include_adult)


@library_router.post("/library/item/{item_id}/watch-history")
def add_watch_history_entry(item_id: int, payload: dict = None, db: Session = Depends(get_db)):
    watched_at = (payload or {}).get("watched_at")
    return PlaybackService(db).add_watch_history_entry(item_id, watched_at)


@library_router.put("/library/item/{item_id}/watch-history/{log_id}")
def update_watch_history_entry(item_id: int, log_id: int, payload: dict = None, db: Session = Depends(get_db)):
    watched_at = (payload or {}).get("watched_at")
    return PlaybackService(db).update_watch_history_entry(item_id, log_id, watched_at)


@library_router.delete("/library/item/{item_id}/watch-history/{log_id}")
def delete_watch_history_entry(item_id: int, log_id: int, db: Session = Depends(get_db)):
    return PlaybackService(db).delete_watch_history_entry(item_id, log_id)


@library_router.post("/library/item/{item_id}/reset-progress")
def reset_item_progress(item_id: int, db: Session = Depends(get_db)):
    return PlaybackService(db).reset_item_progress(item_id)


# --- Legacy Scanner and Renamer Endpoints ---
from pydantic import BaseModel
from app.domains.media.services.scanner_service import ScannerService
from app.core.enums import ScanMode

class ScanRequest(BaseModel):
    paths: List[str]
    stop_after: Optional[str] = None
    mode: ScanMode = ScanMode.MOVIES_TV
    include_adult: Optional[bool] = None

class RenameRequest(BaseModel):
    item_ids: Optional[List[int]] = None

@library_router.get("/scan-status")
def get_scan_status(db: Session = Depends(get_db)):
    return ScannerService(db).get_scan_status()

@library_router.get("/hydrate-status")
def get_hydrate_status(db: Session = Depends(get_db)):
    return ScannerService(db).get_hydrate_status()

@library_router.get("/image-status")
def get_image_status(db: Session = Depends(get_db)):
    return ScannerService(db).get_image_status()

@library_router.post("/reset-image-status")
def reset_image_status(db: Session = Depends(get_db)):
    return ScannerService(db).reset_image_status()

@library_router.post("/scan")
def start_scan(request: ScanRequest, db: Session = Depends(get_db)):
    return ScannerService(db).start_scan(
        request.paths,
        request.stop_after,
        request.mode,
        request.include_adult,
    )

@library_router.post("/task/stop")
def stop_active_task(db: Session = Depends(get_db)):
    return ScannerService(db).stop_active_task()

@library_router.post("/rename/start")
def start_rename(request: Optional[RenameRequest] = None, db: Session = Depends(get_db)):
    item_ids = request.item_ids if request else None
    return ScannerService(db).start_rename(item_ids)

@library_router.get("/history")
def get_history(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    return ScannerService(db).get_history(page, limit)

@library_router.post("/rename/undo/{batch_id}")
def undo_rename(batch_id: int, db: Session = Depends(get_db)):
    return ScannerService(db).start_undo(batch_id)


# --- Legacy Recommendations, Discovery, and Watchlist Endpoints ---
from app.domains.media.services.recommendations_service import RecommendationsService

@library_router.get("/recommendations")
def get_recommendations(language: Optional[str] = None, db: Session = Depends(get_db)):
    return RecommendationsService(db).get_recommendations(language=language)

@library_router.get("/discovery")
def get_discovery_items(db: Session = Depends(get_db)):
    return RecommendationsService(db).get_discovery_groups()

@library_router.get("/discovery/count")
def get_discovery_item_count(db: Session = Depends(get_db)):
    return {"count": RecommendationsService(db).get_discovery_item_count()}

class DiscoveryDeleteRequest(BaseModel):
    item_ids: Optional[List[int]] = None
    extra_ids: Optional[List[int]] = None
    mode: str = "db_only"

@library_router.post("/discovery/delete")
def delete_discovery_items(request: DiscoveryDeleteRequest, db: Session = Depends(get_db)):
    return RecommendationsService(db).delete_discovery_items(
        item_ids=request.item_ids or [],
        extra_ids=request.extra_ids or [],
        mode=request.mode
    )

class WatchlistRequest(BaseModel):
    tmdb_id: int
    type: str = "movie"

@library_router.post("/watchlist")
def add_to_watchlist(request: WatchlistRequest, db: Session = Depends(get_db)):
    return RecommendationsService(db).add_to_watchlist(request.tmdb_id, request.type)

@library_router.delete("/watchlist/{tmdb_id}")
def remove_from_watchlist(tmdb_id: int, db: Session = Depends(get_db)):
    return RecommendationsService(db).remove_from_watchlist(tmdb_id)


# --- Legacy Settings and Database Maintenance Endpoints ---
from app.domains.settings.services.settings_service import SettingsService

@library_router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return SettingsService(db).get_settings()

@library_router.post("/settings")
def update_settings(settings: dict, db: Session = Depends(get_db)):
    return SettingsService(db).update_settings(settings)

@library_router.post("/settings/validate-folders")
def validate_folders(payload: dict, db: Session = Depends(get_db)):
    return SettingsService(db).validate_folders(payload)

@library_router.post("/settings/validate-api-keys")
def validate_api_keys(payload: dict, db: Session = Depends(get_db)):
    return SettingsService(db).validate_api_keys(payload)

@library_router.get("/settings/changelog")
def get_changelog(db: Session = Depends(get_db)):
    return SettingsService(db).get_changelog()

@library_router.get("/settings/ignored-items")
def get_ignored_items(search: str = "", offset: int = 0, limit: int = 40, db: Session = Depends(get_db)):
    return SettingsService(db).get_ignored_items(search, offset, limit)

class RestoreIgnoredRequest(BaseModel):
    item_ids: List[int]

@library_router.post("/settings/ignored-items/restore")
def restore_ignored_items(request: RestoreIgnoredRequest, db: Session = Depends(get_db)):
    return SettingsService(db).restore_ignored_items(request.item_ids)

@library_router.post("/database/clear")
def clear_database(options: Optional[dict] = None, db: Session = Depends(get_db)):
    return SettingsService(db).clear_database(options)


# --- Legacy Tags Endpoints ---
from app.domains.users.services.tags_service import TagsService

@library_router.get("/tags")
def get_all_tags(target_type: Optional[str] = None, is_adult: bool = False, db: Session = Depends(get_db)):
    return TagsService(db).get_all_tags(target_type, is_adult)

@library_router.post("/tags")
def create_tag(payload: dict, db: Session = Depends(get_db)):
    res = TagsService(db).create_tag(payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.put("/tags/{tag_id}")
def update_tag(tag_id: int, payload: dict, db: Session = Depends(get_db)):
    res = TagsService(db).update_tag(tag_id, payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    res = TagsService(db).delete_tag(tag_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


# --- Legacy Custom Lists and Catalog Endpoints ---
from app.domains.users.services.lists_service import ListsService

@library_router.get("/lists")
def get_all_lists(db: Session = Depends(get_db)):
    return ListsService(db).get_all_lists()

@library_router.get("/lists/{list_id}")
def get_list_details(list_id: int, db: Session = Depends(get_db)):
    res = ListsService(db).get_list_details(list_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@library_router.post("/lists")
def create_list(payload: dict, db: Session = Depends(get_db)):
    res = ListsService(db).create_list(payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.put("/lists/{list_id}")
def update_list(list_id: int, payload: dict, db: Session = Depends(get_db)):
    res = ListsService(db).update_list(list_id, payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.delete("/lists/{list_id}")
def delete_list(list_id: int, db: Session = Depends(get_db)):
    res = ListsService(db).delete_list(list_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/lists/{list_id}/items")
def add_item_to_list(list_id: int, payload: dict, db: Session = Depends(get_db)):
    res = ListsService(db).add_item_to_list(list_id, payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.delete("/lists/{list_id}/items/{item_id}")
def remove_item_from_list(list_id: int, item_id: int, db: Session = Depends(get_db)):
    res = ListsService(db).remove_item_from_list(list_id, item_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.get("/lists/item-membership/{item_id}")
def get_item_membership(item_id: str, db: Session = Depends(get_db)):
    return ListsService(db).get_item_membership(item_id)

@library_router.get("/user/catalog")
def get_user_catalog(
    tab: Optional[str] = None,
    offset: int = 0,
    limit: int = 40,
    search: str = "",
    favorite_only: bool = False,
    db: Session = Depends(get_db),
):
    return ListsService(db).get_user_catalog(tab, offset, limit, search, favorite_only)

@library_router.post("/user/catalog/bulk-status")
def bulk_update_catalog_status(payload: dict, db: Session = Depends(get_db)):
    return ListsService(db).bulk_update_catalog_status(payload)


# --- Legacy Overrides Endpoints ---
from app.domains.media.services.overrides_service import OverridesService
from fastapi import File, UploadFile
from app.domains.media.schemas import (
    ItemOverridesUpdate,
    ItemStatusUpdate,
    ImageOverrideUpdate,
    BulkOverridesUpdate,
    BulkTagsUpdate,
    BulkWatchedUpdate,
    MetadataResolveRequest,
    BulkResolveRequest,
)

@library_router.post("/media/update")
def update_item_overrides(payload: ItemOverridesUpdate, db: Session = Depends(get_db)):
    res = OverridesService(db).update_item_overrides(payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/status")
def update_item_status(item_id: int, payload: ItemStatusUpdate, db: Session = Depends(get_db)):
    res = OverridesService(db).update_item_status(item_id, payload.status)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/poster")
def update_item_poster(item_id: str, payload: ImageOverrideUpdate, db: Session = Depends(get_db)):
    path = payload.path or payload.url or payload.poster_path
    if not path:
        raise HTTPException(status_code=400, detail="Image path/url is required")
    res = OverridesService(db).update_item_image(item_id, "poster", path)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/backdrop")
def update_item_backdrop(item_id: str, payload: ImageOverrideUpdate, db: Session = Depends(get_db)):
    path = payload.path or payload.url or payload.backdrop_path
    if not path:
        raise HTTPException(status_code=400, detail="Image path/url is required")
    res = OverridesService(db).update_item_image(item_id, "backdrop", path)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/logo")
def update_item_logo(item_id: str, payload: ImageOverrideUpdate, db: Session = Depends(get_db)):
    path = payload.path or payload.url or payload.logo_path
    if not path:
        raise HTTPException(status_code=400, detail="Image path/url is required")
    res = OverridesService(db).update_item_image(item_id, "logo", path)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/upload-poster")
def upload_item_poster(item_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    res = OverridesService(db).handle_image_upload(item_id, "poster", file.filename, file.file)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/upload-backdrop")
def upload_item_backdrop(item_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    res = OverridesService(db).handle_image_upload(item_id, "backdrop", file.filename, file.file)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/item/{item_id}/upload-logo")
def upload_item_logo(item_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    res = OverridesService(db).handle_image_upload(item_id, "logo", file.filename, file.file)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/media/bulk-update")
def bulk_update(payload: BulkOverridesUpdate, db: Session = Depends(get_db)):
    return OverridesService(db).bulk_update(payload)

@library_router.post("/media/bulk-tags")
def bulk_tags(payload: BulkTagsUpdate, db: Session = Depends(get_db)):
    return OverridesService(db).bulk_tags(payload)

@library_router.post("/media/bulk-watched")
def bulk_watched(payload: BulkWatchedUpdate, db: Session = Depends(get_db)):
    return OverridesService(db).bulk_watched(payload)

@library_router.post("/library/item/{item_id}/track")
def track_item(item_id: str, db: Session = Depends(get_db)):
    res = OverridesService(db).track_virtual(item_id, True)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/library/item/{item_id}/untrack")
def untrack_item(item_id: str, db: Session = Depends(get_db)):
    res = OverridesService(db).track_virtual(item_id, False)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


# --- Legacy Metadata Endpoints ---
from app.domains.media.services.metadata_service import MetadataService

@library_router.get("/metadata/search")
def search_metadata(query: str, type: str = "movie", year: Optional[int] = None, provider: Optional[str] = None, db: Session = Depends(get_db)):
    return MetadataService(db).search_metadata(query, item_type=type, year=year, provider=provider)

@library_router.get("/metadata/tv/{tmdb_id}/seasons")
def get_metadata_seasons(tmdb_id: int, db: Session = Depends(get_db)):
    return MetadataService(db).get_seasons(tmdb_id)

@library_router.get("/metadata/tv/{tmdb_id}/season/{season_number}/episodes")
def get_metadata_episodes(tmdb_id: int, season_number: int, db: Session = Depends(get_db)):
    return MetadataService(db).get_episodes(tmdb_id, season_number)

@library_router.post("/metadata/resolve")
def resolve_metadata_item(payload: MetadataResolveRequest, db: Session = Depends(get_db)):
    res = MetadataService(db).resolve_item(payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@library_router.post("/metadata/bulk-resolve")
def bulk_resolve_metadata(payload: BulkResolveRequest, db: Session = Depends(get_db)):
    return MetadataService(db).bulk_resolve(payload)

@library_router.get("/metadata/item/{item_id}/full-metadata")
def get_full_metadata(item_id: int, db: Session = Depends(get_db)):
    res = MetadataService(db).get_full_metadata(item_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@library_router.get("/metadata/sync-language/status")
def get_sync_language_status(db: Session = Depends(get_db)):
    return MetadataService(db).get_sync_status()

@library_router.post("/metadata/sync-language")
def trigger_sync_language(payload: dict = None, db: Session = Depends(get_db)):
    return MetadataService(db).trigger_sync(payload)









