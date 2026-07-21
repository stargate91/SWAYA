from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import SWAYA_DATABASE_URL, CACHE_DATABASE_URL

# --- Main Swaya DB Engine (swaya.db) ---
engine = create_engine(
    SWAYA_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# --- Cache Engine (cache.db) ---
cache_engine = create_engine(
    CACHE_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

def configure_sqlite_wal(target_engine):
    @event.listens_for(target_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

configure_sqlite_wal(engine)
configure_sqlite_wal(cache_engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
CacheSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cache_engine)

class Base(DeclarativeBase):
    """Main Relational DB Base (swaya.db)"""
    pass

class CacheBase(DeclarativeBase):
    """Temporary API Cache DB Base (cache.db)"""
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_cache_db():
    db = CacheSessionLocal()
    try:
        yield db
    finally:
        db.close()
