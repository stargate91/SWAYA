import pytest
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.modules.users.models import UserOverride, User
from app.modules.metadata.models import MetadataMatch, MetadataLocalization
from app.modules.library.models import MediaItem, Library
from app.core.enums import Provider, MediaType, ItemStatus
from app.modules.library.services.detail.player_discovery_service import PlayerDiscoveryService

class DummySettingsAdapter:
    def get_setting(self, key: str, user_id: Optional[int] = None) -> str:
        return "en"

class DummyImageService:
    def resolve_image_url(self, path: str, folder: str) -> str:
        return f"/resolved/{folder}/{path}"

@pytest.fixture(autouse=True)
def mock_image_service(monkeypatch):
    import app.modules.library.services.detail.player_discovery_service as disc_mod
    dummy = DummyImageService()
    monkeypatch.setattr(disc_mod, "image_processing_service", dummy, raising=False)
    # Also patch the source module
    from app.modules.media_assets.services import images as img_mod
    monkeypatch.setattr(img_mod, "image_processing_service", dummy)

def _make_item(db: Session, filename: str) -> MediaItem:
    lib = db.query(Library).filter(Library.name == "test_lib").first()
    if not lib:
        lib = Library(name="test_lib", root_path="/testlib")
        db.add(lib)
        db.flush()
    item = MediaItem(library_id=lib.id, filename=filename, relative_path=filename, extension=".mkv")
    db.add(item)
    db.flush()
    return item

def test_to_discovery_item_handles_user_override_poster(db_session_override):
    db = db_session_override
    
    # Insert custom user to avoid foreign key and unique constraint conflicts
    user = User(
        id=9999,
        username="test_user_9999",
        email="test_9999@swaya.io",
        password_hash="",
        allow_adult=True
    )
    db.add(user)
    db.flush()
    
    item = _make_item(db, "movie.mkv")
    
    match = MetadataMatch(
        media_item_id=item.id,
        provider=Provider.TMDB,
        external_id="12345",
        media_type=MediaType.MOVIE
    )
    db.add(match)
    db.flush()
    
    # Custom User override poster
    user_ov = UserOverride(
        user_id=9999,
        media_item_id=item.id,
        custom_poster="custom_covers/my_poster.jpg"
    )
    db.add(user_ov)
    db.flush()
    
    settings = DummySettingsAdapter()
    discovery_item = PlayerDiscoveryService.to_discovery_item(db, match, 9999, settings)
    
    assert discovery_item is not None
    assert "my_poster.jpg" in discovery_item["poster_path"]


def test_get_playback_discovery_info_respects_adult_gender_preference(db_session_override):
    db = db_session_override
    from app.modules.people.models import Person, MediaPersonLink
    
    # Setup test performer and media items
    item = _make_item(db, "scene.mkv")
    match = MetadataMatch(
        media_item_id=item.id,
        provider=Provider.TMDB,
        external_id="scene123",
        media_type=MediaType.SCENE,
        is_adult=True
    )
    db.add(match)
    db.flush()

    # Performer 1 (Female, gender = 1)
    p_female = Person(name="Jane Doe", gender=1)
    db.add(p_female)
    db.flush()

    # Performer 2 (Male, gender = 2)
    p_male = Person(name="John Doe", gender=2)
    db.add(p_male)
    db.flush()

    from app.core.enums import RoleType
    # Link both to the scene
    link_female = MediaPersonLink(match_id=match.id, person_id=p_female.id, role=RoleType.ACTOR)
    link_male = MediaPersonLink(match_id=match.id, person_id=p_male.id, role=RoleType.ACTOR)
    db.add(link_female)
    db.add(link_male)
    db.flush()

    # Create unwatched scenes for both performers to recommend
    item_female_scene = _make_item(db, "female_scene.mkv")
    match_female_scene = MetadataMatch(
        media_item_id=item_female_scene.id,
        provider=Provider.TMDB,
        external_id="scene_fem",
        media_type=MediaType.SCENE,
        is_active=True,
        is_adult=True
    )
    db.add(match_female_scene)
    db.flush()
    link_female_scene = MediaPersonLink(match_id=match_female_scene.id, person_id=p_female.id, role=RoleType.ACTOR)
    db.add(link_female_scene)

    item_male_scene = _make_item(db, "male_scene.mkv")
    match_male_scene = MetadataMatch(
        media_item_id=item_male_scene.id,
        provider=Provider.TMDB,
        external_id="scene_male",
        media_type=MediaType.SCENE,
        is_active=True,
        is_adult=True
    )
    db.add(match_male_scene)
    db.flush()
    link_male_scene = MediaPersonLink(match_id=match_male_scene.id, person_id=p_male.id, role=RoleType.ACTOR)
    db.add(link_male_scene)
    db.flush()

    # Mock settings with female preference
    class CustomSettingsAdapter:
        def get_setting(self, key: str, user_id: Optional[int] = None) -> str:
            if key == "adult_gender_preference":
                return "female"
            return "all"

    settings = CustomSettingsAdapter()
    discovery = PlayerDiscoveryService.get_playback_discovery_info(
        db=db,
        item=item,
        current_uid=1,
        is_adult=True,
        media_type="scene",
        match=match,
        settings_adapter=settings
    )

    assert discovery["performer_unwatched"] is not None
    assert discovery["performer_unwatched"]["performer_name"] == "Jane Doe"

