import logging
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.modules.users.services.user_service import UserService
from app.modules.users.schemas import (
    UserRead,
    UserCreate,
    UserOverrideRead,
    UserOverrideCreate,
    CustomListRead,
    ItemOverridesUpdate,
    ItemStatusUpdate,
    ImageOverrideUpdate,
    BulkOverridesUpdate,
    BulkTagsUpdate,
    BulkWatchedUpdate,
    TagResponse,
    CustomListResponse,
    CustomListDetailResponse,
    ListMembershipResponse,
    CustomListItemResponse,
    CatalogResponse,
    BulkUpdateResponse,
)
from app.modules.users.services.tags_service import TagsService
from app.modules.users.services.lists_service import ListsService
from app.modules.users.services.overrides_service import OverridesService
from app.modules.library.services.media_item_service import MediaItemService
from app.modules.tasks.image_download_service import ImageDownloadService
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


def _user_service(db: Session) -> UserService:
    return UserService(db)

# --- User Profiles ---

@router.get("", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db)):
    """Retrieve all users."""
    return _user_service(db).list_users()


@router.post("", response_model=UserRead)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user profile."""
    return _user_service(db).create_user(
        username=user_data.username,
        email=user_data.email,
        password_hash=user_data.password_hash,
        pin_hash=user_data.pin_hash,
        role=user_data.role,
        managed_by_user_id=user_data.managed_by_user_id,
        allow_adult=user_data.allow_adult,
    )


# --- User Overrides ---

@router.get("/{user_id}/overrides", response_model=List[UserOverrideRead])
def list_user_overrides(user_id: int, db: Session = Depends(get_db)):
    """Retrieve all metadata and physical asset overrides for a user."""
    return _user_service(db).list_user_overrides(user_id)


@router.post("/{user_id}/overrides", response_model=UserOverrideRead)
def create_user_override(user_id: int, override_data: UserOverrideCreate, db: Session = Depends(get_db)):
    """Create or update a user override for a specific media item, performer, or collection."""
    return _user_service(db).create_or_update_override(user_id, override_data.model_dump())



# --- Custom User Lists ---

@router.get("/{user_id}/lists", response_model=List[CustomListRead])
def list_user_custom_lists(user_id: int, db: Session = Depends(get_db)):
    """Retrieve custom user lists."""
    return _user_service(db).list_user_custom_lists(user_id)


# Compatibility API owned by the Users domain.
catalog_router = APIRouter(prefix="/api/v1", tags=["User Catalog"])


@catalog_router.get("/tags", response_model=List[TagResponse])
def get_all_tags(target_type: Optional[str] = None, is_adult: bool = False, db: Session = Depends(get_db)):
    return TagsService(db).get_all_tags(target_type, is_adult)


@catalog_router.post("/tags", response_model=TagResponse)
def create_tag(payload: dict, db: Session = Depends(get_db)):
    return TagsService(db).create_tag(payload)


@catalog_router.put("/tags/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, payload: dict, db: Session = Depends(get_db)):
    return TagsService(db).update_tag(tag_id, payload)


@catalog_router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    return TagsService(db).delete_tag(tag_id)


@catalog_router.get("/lists", response_model=List[CustomListResponse])
def get_all_lists(include_adult: bool = False, db: Session = Depends(get_db)):
    return ListsService(db).get_all_lists(include_adult)


@catalog_router.get("/lists/item-membership/{item_id}", response_model=ListMembershipResponse)
def get_item_membership(item_id: str, db: Session = Depends(get_db)):
    return ListsService(db).get_item_membership(item_id)


@catalog_router.get("/lists/{list_id}", response_model=CustomListDetailResponse)
def get_list_details(
    list_id: int,
    watched_filter: str = "all",
    media_type_filter: str = "all",
    genre_filter: str = "all",
    gender_filter: str = "all",
    job_filter: str = "all",
    search: str = "",
    sort_by: str = "added_at",
    sort_direction: str = "desc",
    db: Session = Depends(get_db)
):
    return ListsService(db).get_list_details(
        list_id=list_id,
        watched_filter=watched_filter,
        media_type_filter=media_type_filter,
        genre_filter=genre_filter,
        gender_filter=gender_filter,
        job_filter=job_filter,
        search=search,
        sort_by=sort_by,
        sort_direction=sort_direction
    )


@catalog_router.post("/lists", response_model=CustomListResponse)
def create_list(payload: dict, db: Session = Depends(get_db)):
    return ListsService(db).create_list(payload)


@catalog_router.put("/lists/{list_id}", response_model=CustomListDetailResponse)
def update_list(list_id: int, payload: dict, db: Session = Depends(get_db)):
    return ListsService(db).update_list(list_id, payload)


@catalog_router.delete("/lists/{list_id}")
def delete_list(list_id: int, db: Session = Depends(get_db)):
    return ListsService(db).delete_list(list_id)


@catalog_router.post("/lists/{list_id}/image", response_model=CustomListDetailResponse)
def set_list_image(list_id: int, payload: dict, db: Session = Depends(get_db)):
    path = payload.get("path") or payload.get("url")
    return ListsService(db).set_list_image(list_id, path)


@catalog_router.post("/lists/{list_id}/upload-image", response_model=CustomListDetailResponse)
def upload_list_image(list_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return ListsService(db).upload_list_image(list_id, file.filename, file.file)



@catalog_router.post("/lists/{list_id}/items", response_model=CustomListItemResponse)
def add_item_to_list(list_id: int, payload: dict, db: Session = Depends(get_db)):
    return ListsService(db).add_item_to_list(list_id, payload)


@catalog_router.delete("/lists/{list_id}/items/{item_id}")
def remove_item_from_list(list_id: int, item_id: int, db: Session = Depends(get_db)):
    return ListsService(db).remove_item_from_list(list_id, item_id)



@catalog_router.get("/user/catalog", response_model=CatalogResponse)
def get_user_catalog(
    tab: Optional[str] = None,
    offset: int = 0,
    limit: int = 40,
    search: str = "",
    favorite_only: bool = False,
    db: Session = Depends(get_db),
):
    return ListsService(db).get_user_catalog(tab, offset, limit, search, favorite_only)


@catalog_router.post("/user/catalog/bulk-status", response_model=BulkUpdateResponse)
def bulk_update_catalog_status(payload: dict, db: Session = Depends(get_db)):
    return ListsService(db).bulk_update_catalog_status(payload)



def _img_dl():
    return ImageDownloadService()

def _overrides_service(db: Session, image_downloader=None) -> OverridesService:
    from app.modules.library.services.media_item_service import MediaItemService
    from app.modules.scrapers.support.gateway import scraper_gateway
    from app.modules.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
    return OverridesService(
        db,
        MediaItemService(db),
        image_downloader=image_downloader,
        scrapers=scraper_gateway,
        mainstream_enricher=MainstreamEnricher
    )

@catalog_router.post("/media/update")
def update_item_overrides(payload: ItemOverridesUpdate, db: Session = Depends(get_db)):
    return _overrides_service(db).update_item_overrides(payload)

@catalog_router.post("/item/{item_id}/status")
def update_item_status(item_id: str, payload: ItemStatusUpdate, db: Session = Depends(get_db)):
    return _user_service(db).update_item_status_composite(
        item_id=item_id,
        payload_data=payload.model_dump(),
        model_fields_set=payload.model_fields_set,
        resolver=MediaItemService(db),
    )

@catalog_router.post("/item/{item_id}/poster")
def update_item_poster(item_id: str, payload: ImageOverrideUpdate, db: Session = Depends(get_db)):
    path = payload.path or payload.url or payload.poster_path
    if path in ("none", "clear", "default"):
        path = ""
    elif not path:
        raise HTTPException(status_code=400, detail="Image path/url is required")
    return _overrides_service(db, image_downloader=_img_dl()).update_item_image(item_id, "poster", path, media_type=payload.media_type)

@catalog_router.post("/item/{item_id}/backdrop")
def update_item_backdrop(item_id: str, payload: ImageOverrideUpdate, db: Session = Depends(get_db)):
    path = payload.path or payload.url or payload.backdrop_path
    if path in ("none", "clear", "default"):
        path = ""
    elif not path:
        raise HTTPException(status_code=400, detail="Image path/url is required")
    return _overrides_service(db, image_downloader=_img_dl()).update_item_image(item_id, "backdrop", path, media_type=payload.media_type)

@catalog_router.post("/item/{item_id}/logo")
def update_item_logo(item_id: str, payload: ImageOverrideUpdate, db: Session = Depends(get_db)):
    path = payload.path or payload.url or payload.logo_path
    if path in ("none", "clear", "default"):
        path = ""
    elif not path:
        raise HTTPException(status_code=400, detail="Image path/url is required")
    return _overrides_service(db, image_downloader=_img_dl()).update_item_image(item_id, "logo", path, media_type=payload.media_type)

@catalog_router.post("/item/{item_id}/upload-poster")
def upload_item_poster(item_id: str, file: UploadFile = File(...), media_type: Optional[str] = Form(None), db: Session = Depends(get_db)):
    return _overrides_service(db).handle_image_upload(item_id, "poster", file.filename, file.file, media_type=media_type)

@catalog_router.post("/item/{item_id}/upload-backdrop")
def upload_item_backdrop(item_id: str, file: UploadFile = File(...), media_type: Optional[str] = Form(None), db: Session = Depends(get_db)):
    return _overrides_service(db).handle_image_upload(item_id, "backdrop", file.filename, file.file, media_type=media_type)

@catalog_router.post("/item/{item_id}/upload-logo")
def upload_item_logo(item_id: str, file: UploadFile = File(...), media_type: Optional[str] = Form(None), db: Session = Depends(get_db)):
    return _overrides_service(db).handle_image_upload(item_id, "logo", file.filename, file.file, media_type=media_type)

@catalog_router.post("/media/bulk-update")
def bulk_update(payload: BulkOverridesUpdate, db: Session = Depends(get_db)):
    return _overrides_service(db).bulk_update(payload)

@catalog_router.post("/media/bulk-tags")
def bulk_tags(payload: BulkTagsUpdate, db: Session = Depends(get_db)):
    return _overrides_service(db).bulk_tags(payload)

@catalog_router.post("/media/bulk-watched")
def bulk_watched(payload: BulkWatchedUpdate, db: Session = Depends(get_db)):
    return _overrides_service(db).bulk_watched(payload)

@catalog_router.post("/library/item/{item_id}/track")
def track_item(item_id: str, media_type: Optional[str] = None, db: Session = Depends(get_db)):
    return _overrides_service(db).track_item(item_id, True, media_type=media_type)

@catalog_router.post("/library/item/{item_id}/untrack")
def untrack_item(item_id: str, media_type: Optional[str] = None, db: Session = Depends(get_db)):
    return _overrides_service(db).track_item(item_id, False, media_type=media_type)


class AddPeakRequest(BaseModel):
    video_position: Optional[int] = None
    snapshot_path: Optional[str] = None

@catalog_router.post("/library/item/{item_id}/peaks")
def add_item_peak(item_id: str, payload: Optional[AddPeakRequest] = None, db: Session = Depends(get_db)):
    from app.core.user_context import get_current_user_id
    from app.modules.library.services.media_item_service import MediaItemService
    from app.modules.history.services.playback_peak_service import PlaybackPeakService
    
    current_uid = get_current_user_id() or 1
    service = PlaybackPeakService(db, MediaItemService(db))
    try:
        video_pos = payload.video_position if payload else None
        snap_path = payload.snapshot_path if payload else None
        return service.add_peak(item_id, current_uid, video_position=video_pos, snapshot_path=snap_path)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise

@catalog_router.delete("/library/item/{item_id}/peaks/{log_id}")
def delete_item_peak(item_id: str, log_id: int, db: Session = Depends(get_db)):
    from app.core.user_context import get_current_user_id
    from app.modules.library.services.media_item_service import MediaItemService
    from app.modules.history.services.playback_peak_service import PlaybackPeakService
    
    current_uid = get_current_user_id() or 1
    service = PlaybackPeakService(db, MediaItemService(db))
    try:
        return service.delete_peak(item_id, log_id, current_uid)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise
