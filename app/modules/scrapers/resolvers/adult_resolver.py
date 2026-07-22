import logging
from typing import Optional, Any

from sqlalchemy.orm import Session

from app.modules.library.models import MediaItem
from app.core.enums import Provider, ScanMode

from app.modules.scrapers.resolvers.adult.resolution_orchestrator import AdultResolutionOrchestrator

logger = logging.getLogger(__name__)

class AdultResolver:
    """Handles resolving adult scene items against StashDB, PornDB, and FansDB APIs."""

    def __init__(self, db_session: Session, scraper_gateway: Optional[Any] = None):
        self.db = db_session
        from app.modules.scrapers.scraper_service import ScraperService
        from app.modules.scrapers.support.gateway import scraper_gateway as default_gateway
        self.scraper_gateway = scraper_gateway or default_gateway
        self.scraper_log_repo = ScraperService(db_session)
        self.orchestrator = AdultResolutionOrchestrator()

    def resolve_primary_scene_item(self, item: MediaItem, task_id: Optional[int] = None):
        """Resolves the primary scene item against configured adult resolvers."""
        self.orchestrator.resolve_adult_item(
            db=self.db,
            scraper_gateway=self.scraper_gateway,
            scraper_log_repo=self.scraper_log_repo,
            item=item,
            mode=ScanMode.SCENES,
            task_id=task_id
        )

    def resolve_scene_item(self, item: MediaItem, task_id: Optional[int] = None):
        """Delegates scene item resolution."""
        self.resolve_primary_scene_item(item, task_id)

    def resolve_stashdb_scene_item(self, item: MediaItem, task_id: Optional[int] = None):
        """Resolves scene item explicitly prioritizing StashDB."""
        self.orchestrator.resolve_adult_item(
            db=self.db,
            scraper_gateway=self.scraper_gateway,
            scraper_log_repo=self.scraper_log_repo,
            item=item,
            mode=ScanMode.SCENES,
            task_id=task_id,
            preferred_provider=Provider.STASHDB
        )

    def resolve_fansdb_scene_item(self, item: MediaItem, task_id: Optional[int] = None):
        """Resolves scene item explicitly prioritizing FansDB."""
        self.orchestrator.resolve_adult_item(
            db=self.db,
            scraper_gateway=self.scraper_gateway,
            scraper_log_repo=self.scraper_log_repo,
            item=item,
            mode=ScanMode.SCENES,
            task_id=task_id,
            preferred_provider=Provider.FANSDB
        )

    def resolve_porndb_scene_item(self, item: MediaItem, task_id: Optional[int] = None):
        """Resolves scene item explicitly prioritizing PornDB."""
        self.orchestrator.resolve_adult_item(
            db=self.db,
            scraper_gateway=self.scraper_gateway,
            scraper_log_repo=self.scraper_log_repo,
            item=item,
            mode=ScanMode.SCENES,
            task_id=task_id,
            preferred_provider=Provider.PORNDB
        )

    def resolve_adult_item(self, item: MediaItem, mode: ScanMode = ScanMode.SCENES, task_id: Optional[int] = None):
        """Resolves the adult item by calling primary resolution."""
        self.resolve_primary_scene_item(item, task_id)
