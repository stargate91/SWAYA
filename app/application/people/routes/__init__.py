from fastapi import APIRouter

# Import sub-routers from the split route files
from app.application.people.routes.routes_mainstream import mainstream_router
from app.application.people.routes.routes_adult import adult_router

from app.application.people.routes.routes_detail import router as detail_router
from app.application.people.routes.routes_images import router as images_router
from app.application.people.routes.routes_linking import router as linking_router
from app.application.people.routes.routes_status import router as status_router

# Core aggregator router for people APIs
router = APIRouter()
router.include_router(detail_router)
router.include_router(images_router)
router.include_router(linking_router)
router.include_router(status_router)
