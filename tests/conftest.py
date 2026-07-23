import pytest
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db, get_cache_db
from app.main import app

# Create in-memory test engines
test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
test_cache_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
TestCacheSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_cache_engine)

@asynccontextmanager
async def mock_lifespan(app: FastAPI):
    # lifespan is a no-op in tests
    yield

@pytest.fixture(scope="session", autouse=True)
def disable_lifespan():
    app.router.lifespan_context = mock_lifespan

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    from _pytest.monkeypatch import MonkeyPatch
    mp = MonkeyPatch()
    import app.core.database
    mp.setattr(app.core.database, "CacheSessionLocal", TestCacheSessionLocal)
    mp.setattr(app.core.database, "SessionLocal", TestSessionLocal)
    
    # Mock qBittorrent client requests during tests
    from app.modules.torrent.services.qbittorrent_client import QBittorrentClient
    
    class MockResponse:
        def __init__(self, status_code=200, text="Ok.", json_data=None):
            self.status_code = status_code
            self.text = text
            self._json_data = json_data or {}
            
        def json(self):
            return self._json_data

    def mock_post(self, path, data=None, files=None, retried=False):
        return MockResponse(status_code=200, text="Ok.")

    def mock_get(self, path, params=None, retried=False):
        if "/info" in path:
            return MockResponse(status_code=200, json_data=[])
        return MockResponse(status_code=200, text="Ok.")

    def mock_login(self):
        return True

    mp.setattr(QBittorrentClient, "_post", mock_post)
    mp.setattr(QBittorrentClient, "_get", mock_get)
    mp.setattr(QBittorrentClient, "login", mock_login)
    
    # Pre-create in-memory cache tables
    from app.core.database import CacheBase
    import app.modules.scrapers.models
    CacheBase.metadata.create_all(bind=test_cache_engine)

    # Force import models to register schemas on Base.metadata
    import app.modules.tasks.models
    import app.modules.history.models
    import app.modules.library.models
    import app.modules.metadata.models
    import app.modules.people.models
    import app.modules.settings.models
    import app.modules.users.models
    
    Base.metadata.create_all(bind=test_engine)
    
    # Seed default user with id=1
    from app.modules.users.models import User
    with TestSessionLocal() as session:
        if not session.get(User, 1):
            default_user = User(
                id=1,
                username="default_user",
                email="default@swaya.io",
                password_hash="",
                allow_adult=True
            )
            session.add(default_user)
            session.commit()
    yield
    mp.undo()
    Base.metadata.drop_all(bind=test_engine)
    CacheBase.metadata.drop_all(bind=test_cache_engine)

@pytest.fixture(autouse=True)
def db_session_override():
    from app.modules.settings.services.settings_service import clear_settings_cache
    clear_settings_cache()

    # Create isolated transaction session per test case
    connection = test_engine.connect()
    transaction = connection.begin()
    db = TestSessionLocal(bind=connection)

    cache_connection = test_cache_engine.connect()
    cache_transaction = cache_connection.begin()
    cache_db = TestCacheSessionLocal(bind=cache_connection)

    # Make sure tables are created in cache db
    # Cache tables are managed directly, create them on the fly
    from app.core.database import CacheBase
    CacheBase.metadata.create_all(bind=cache_connection)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    def override_get_cache_db():
        try:
            yield cache_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_cache_db] = override_get_cache_db

    yield db

    app.dependency_overrides.clear()
    
    db.close()
    transaction.rollback()
    connection.close()

    cache_db.close()
    cache_transaction.rollback()
    cache_connection.close()

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
