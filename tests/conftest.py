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
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(autouse=True)
def db_session_override():
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
