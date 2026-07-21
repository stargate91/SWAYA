from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.application.maintenance.database_maintenance_service import DatabaseMaintenanceService
from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
from app.domains.settings.services.settings_service import SettingsService
from app.modules.settings.schemas import (
    SystemSettingRead,
    SystemSettingUpdate,
    UserSettingRead,
    UserSettingUpdate,
)

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


def _settings_service(db: Session, user_id: Optional[int] = None) -> SettingsService:
    from app.infrastructure.media.db_media_resolver import DbMediaResolver
    return SettingsService(
        db,
        library_port=DbMediaResolver(db),
        settings_port=DbSettingsAdapter(db),
        user_id=user_id
    )

# --- System Settings Endpoints ---
@router.get("/system", response_model=List[SystemSettingRead])
def list_system_settings(db: Session = Depends(get_db)):
    """Retrieve all system settings."""
    return _settings_service(db).get_system_settings()


@router.put("/system/{key}", response_model=SystemSettingRead)
def update_system_setting(key: str, update_data: SystemSettingUpdate, db: Session = Depends(get_db)):
    """Update a specific system setting."""
    return _settings_service(db).set_system_setting(key, update_data.value, update_data.description)


# --- User Settings Endpoints ---
@router.get("/user/{user_id}", response_model=List[UserSettingRead])
def list_user_settings(user_id: int, db: Session = Depends(get_db)):
    """Retrieve settings/preferences for a specific user."""
    return _settings_service(db).get_user_settings_list(user_id)


@router.put("/user/{user_id}/{key}", response_model=UserSettingRead)
def update_user_setting(user_id: int, key: str, update_data: UserSettingUpdate, db: Session = Depends(get_db)):
    """Update a preference key for a specific user."""
    return _settings_service(db).set_user_setting(user_id, key, update_data.value, update_data.description)

@router.post("/user/{user_id}/avatar")
def upload_user_avatar(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        return _settings_service(db, user_id=user_id).upload_avatar(file.filename or "", file.file)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


# --- Combined/Generic Settings Endpoints ---
@router.get("", response_model=dict)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve all user settings as a key-value dictionary."""
    return _settings_service(db).get_settings()


@router.post("", response_model=dict)
def update_settings(payload: dict, db: Session = Depends(get_db)):
    """Update user settings keys."""
    return _settings_service(db).update_settings(payload)


@router.post("/import", response_model=dict)
def import_settings(payload: dict, db: Session = Depends(get_db)):
    """Import and apply settings payload."""
    return _settings_service(db).update_settings(payload)


# --- Validation Endpoints ---
@router.post("/validate-folders", response_model=dict)
def validate_folders(payload: dict, db: Session = Depends(get_db)):
    """Validate scan and library directory paths."""
    return _settings_service(db).validate_folders(payload)


@router.post("/validate-api-keys", response_model=dict)
def validate_api_keys(payload: dict, db: Session = Depends(get_db)):
    """Validate external scraper API keys."""
    return _settings_service(db).validate_api_keys(payload)


@router.get("/changelog", response_model=dict)
def get_changelog(db: Session = Depends(get_db)):
    return _settings_service(db).get_changelog()


@router.get("/ignored-items", response_model=dict)
def get_ignored_items(
    search: str = "",
    offset: int = 0,
    limit: int = 40,
    db: Session = Depends(get_db),
):
    return _settings_service(db).get_ignored_items(search, offset, limit)


class RestoreIgnoredRequest(BaseModel):
    item_ids: List[int]


@router.post("/ignored-items/restore", response_model=dict)
def restore_ignored_items(request: RestoreIgnoredRequest, db: Session = Depends(get_db)):
    return _settings_service(db).restore_ignored_items(request.item_ids)

# --- Database Endpoints ---
db_router = APIRouter(prefix="/api/v1/database", tags=["Database"])

@db_router.post("/clear", response_model=dict)
def clear_database(payload: Optional[dict] = None, db: Session = Depends(get_db)):
    """Clear metadata, files, libraries, or history from database."""
    return DatabaseMaintenanceService(db).clear_database(payload)
