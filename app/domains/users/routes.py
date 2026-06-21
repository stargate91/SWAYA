from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.domains.users.models import User, UserOverride, CustomList
from app.domains.users.schemas import (
    UserRead,
    UserCreate,
    UserOverrideRead,
    UserOverrideCreate,
    CustomListRead,
    CustomListCreate,
)

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


# --- User Profiles ---

@router.get("", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db)):
    """Retrieve all users."""
    return db.query(User).all()


@router.post("", response_model=UserRead)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user profile."""
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    is_first_user = db.query(User.id).first() is None
    role = "owner" if is_first_user else (user_data.role or "member")
    if role not in {"owner", "member", "child"}:
        raise HTTPException(status_code=400, detail="Invalid user role")
    if role == "owner" and not is_first_user:
        raise HTTPException(status_code=400, detail="Owner profile already exists")
    if role == "child" and not user_data.managed_by_user_id:
        raise HTTPException(status_code=400, detail="Child profile requires a managing user")
    if user_data.managed_by_user_id:
        manager = db.get(User, user_data.managed_by_user_id)
        if not manager or manager.role not in {"owner", "member"}:
            raise HTTPException(status_code=400, detail="Invalid managing user")

    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=user_data.password_hash,
        pin_hash=user_data.pin_hash,
        role=role,
        managed_by_user_id=user_data.managed_by_user_id,
        allow_adult=user_data.allow_adult if role != "child" else False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- User Overrides ---

@router.get("/{user_id}/overrides", response_model=List[UserOverrideRead])
def list_user_overrides(user_id: int, db: Session = Depends(get_db)):
    """Retrieve all metadata and physical asset overrides for a user."""
    return db.query(UserOverride).filter(UserOverride.user_id == user_id).all()


@router.post("/{user_id}/overrides", response_model=UserOverrideRead)
def create_user_override(user_id: int, override_data: UserOverrideCreate, db: Session = Depends(get_db)):
    """Create or update a user override for a specific media item, performer, or collection."""
    # Find existing override for same resource to avoid duplicates
    query = db.query(UserOverride).filter(UserOverride.user_id == user_id)
    if override_data.media_item_id:
        query = query.filter(UserOverride.media_item_id == override_data.media_item_id)
    elif override_data.metadata_match_id:
        query = query.filter(UserOverride.metadata_match_id == override_data.metadata_match_id)
    elif override_data.person_id:
        query = query.filter(UserOverride.person_id == override_data.person_id)
    elif override_data.studio_id:
        query = query.filter(UserOverride.studio_id == override_data.studio_id)
    elif override_data.collection_id:
        query = query.filter(UserOverride.collection_id == override_data.collection_id)
    else:
        raise HTTPException(status_code=400, detail="Must target at least one resource ID")

    override = query.first()
    if not override:
        override = UserOverride(
            user_id=user_id,
            media_item_id=override_data.media_item_id,
            metadata_match_id=override_data.metadata_match_id,
            person_id=override_data.person_id,
            studio_id=override_data.studio_id,
            collection_id=override_data.collection_id,
        )
        db.add(override)

    # Apply values
    override.custom_title = override_data.custom_title
    override.custom_overview = override_data.custom_overview
    override.custom_poster = override_data.custom_poster
    override.custom_backdrop = override_data.custom_backdrop
    override.custom_logo = override_data.custom_logo
    override.custom_language = override_data.custom_language
    override.custom_edition = override_data.custom_edition
    override.custom_audio_type = override_data.custom_audio_type
    override.custom_source = override_data.custom_source
    override.user_rating = override_data.user_rating
    override.user_comment = override_data.user_comment
    override.is_favorite = override_data.is_favorite
    override.is_watched = override_data.is_watched
    override.is_tracked = override_data.is_tracked

    db.commit()
    db.refresh(override)
    return override


# --- Custom User Lists ---

@router.get("/{user_id}/lists", response_model=List[CustomListRead])
def list_user_custom_lists(user_id: int, db: Session = Depends(get_db)):
    """Retrieve custom user lists."""
    return db.query(CustomList).filter(CustomList.user_id == user_id).all()
