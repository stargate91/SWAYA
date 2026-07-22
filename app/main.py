import logging
import os
import sys
from contextlib import asynccontextmanager

# Force-import all SQLAlchemy models on startup to prevent registry relationship errors
import app.modules.scrapers.models
import app.modules.users.models
import app.modules.tasks.models
import app.modules.settings.models
import app.modules.people.models
import app.modules.metadata.models
import app.modules.library.models
import app.modules.history.models
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.database import init_databases
from app.core.logging import setup_logger
from app.modules.media_assets.services.images import image_processing_service

# Setup logging
setup_logger()
logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize databases (e.g. creating cache tables if they don't exist)
    logger.info("Initializing databases...")
    init_databases()
    
    # Ensure default user with id=1 exists to satisfy foreign key constraints
    from sqlalchemy.orm import Session
    from app.core.database import engine
    from app.modules.users.models import User
    with Session(engine) as session:
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
    
    # Ensure image folders are created
    from app.modules.media_assets.services.images import image_processing_service
    image_processing_service.ensure_folders()
    logger.info("Image directories ensured.")

    # Clean preview cache on startup
    try:
        from app.core.database import SessionLocal
        from app.modules.library.tasks.preview_cleanup import clean_preview_cache
        with SessionLocal() as db_session:
            clean_preview_cache(db_session)
    except Exception as e:
        logger.error(f"Failed to run preview cache cleanup on startup: {e}")
    
    # Start background download worker on the main event loop
    from app.modules.tasks import task_manager
    from app.modules.scrapers.support.gateway import scraper_gateway
    from app.modules.people.enrich_worker import PeopleEnrichWorker
    from app.modules.tasks.image_download_service import ImageDownloadService
    
    image_downloader = ImageDownloadService(task_manager.download_worker)
    
    task_manager.people_enrich_worker = PeopleEnrichWorker(
        session_factory=task_manager.session_factory,
        executor=task_manager.executor,
        task_monitor=task_manager,
        image_downloader=image_downloader,
    )
    task_manager.people_enrich_worker.scrapers = scraper_gateway
    task_manager.cleanup_stale_tasks()
    await task_manager.download_worker.start()
    await task_manager.people_enrich_worker.start()
    if sys.platform == "win32":
        from app.modules.history.playback.hotkey_listener import start_hotkey_listener
        start_hotkey_listener()
    
    from app.modules.library.filesystem.folder_watcher import start_watcher, stop_watcher
    start_watcher()
    
    yield
    # Shutdown logic if any goes here
    stop_watcher()
    await task_manager.download_worker.stop()
    await task_manager.people_enrich_worker.stop()
    logger.info("Application shutting down.")

app = FastAPI(
    title="Swaya Backend",
    version="1.0.0",
    lifespan=lifespan
)

from app.core.exceptions import AppException  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi import Request  # noqa: E402
from app.core.user_context import set_current_user_id, reset_current_user_id  # noqa: E402

@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message}
    )

@app.middleware("http")
async def user_context_middleware(request: Request, call_next):
    user_id = 1
    header_val = request.headers.get("x-user-id")
    if header_val:
        try:
            user_id = int(header_val)
        except ValueError as e:
            logger.debug(f"Swallowed exception in main.py:76: {e}", exc_info=True)
    else:
        qp_val = request.query_params.get("user_id")
        if qp_val:
            try:
                user_id = int(qp_val)
            except ValueError as e:
                logger.debug(f"Swallowed exception in main.py:83: {e}", exc_info=True)
                
    token = set_current_user_id(user_id)
    try:
        response = await call_next(request)
        return response
    finally:
        reset_current_user_id(token)

from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.modules.tasks.router import router as tasks_router  # noqa: E402
from app.modules.library.router import router as media_router, mainstream_router as media_mainstream_router, adult_router as media_adult_router, library_router  # noqa: E402
from app.modules.metadata.router import library_router as metadata_router  # noqa: E402
from app.modules.people.router import router as people_router, mainstream_router as people_mainstream_router, adult_router as people_adult_router  # noqa: E402
from app.modules.settings.router import router as settings_router, db_router  # noqa: E402
from app.modules.users.router import router as users_router, catalog_router  # noqa: E402
from app.modules.history.router import router as history_router  # noqa: E402
from app.modules.media.router import router as app_media_router  # noqa: E402
from app.modules.recommendations.router import router as app_rec_router  # noqa: E402
from app.modules.organizer.router import router as app_organizer_router  # noqa: E402

app.include_router(tasks_router)
app.include_router(media_router)
app.include_router(media_mainstream_router)
app.include_router(media_adult_router)
app.include_router(library_router)
app.include_router(metadata_router)
app.include_router(people_router)
app.include_router(people_mainstream_router)
app.include_router(people_adult_router)
app.include_router(settings_router)
app.include_router(db_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(history_router)
app.include_router(app_media_router)
app.include_router(app_rec_router)
app.include_router(app_organizer_router)




# Resolve media directory path for static file serving
# This must match where ImageProcessingService saves images:
# e.g., <data_root>/media/images/original/... and <data_root>/media/images/thumbnails/...
media_root = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "media")))

# Ensure media folder exists
media_root.mkdir(parents=True, exist_ok=True)

logger.info(f"Mounting /media static files route pointing to: {media_root}")
app.mount("/media", StaticFiles(directory=str(media_root)), name="media")

@app.get("/")
def read_root():
    return {"status": "ok", "app": "Swaya Backend"}
