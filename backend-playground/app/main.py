from fastapi import FastAPI
from app.core.database import engine, cache_engine, Base, CacheBase

# Force-import all module models to register on Base.metadata / CacheBase.metadata
import app.modules.users.models
import app.modules.settings.models
import app.modules.people.models
import app.modules.metadata.models
import app.modules.library.models
import app.modules.history.models
import app.modules.tasks.models
import app.modules.scrapers.models

# Initialize relational database (swaya.db) and API cache database (cache.db)
Base.metadata.create_all(bind=engine)
CacheBase.metadata.create_all(bind=cache_engine)

app = FastAPI(
    title="Swaya Backend Playground",
    description="Clean Modular Monolith architecture prototype for Swaya (Dual DB Architecture)",
    version="0.1.0"
)

@app.get("/")
def root():
    return {
        "message": "Welcome to Swaya Backend Playground",
        "status": "Dual DB (swaya.db & cache.db) initialized successfully"
    }
