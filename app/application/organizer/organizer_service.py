import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.shared_kernel.ports.settings_port import SettingsPort
from app.domains.media_assets.services.images import image_processing_service
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.application.organizer.schemas import OrganizerGroupsResponse, ActionResponse
from app.application.organizer.organizer_helper import OrganizerHelper
from app.application.organizer.groups_builder import OrganizerGroupsBuilder

logger = logging.getLogger(__name__)

class OrganizerService:
    def __init__(self, db: Session, scrapers: ScraperGatewayPort, settings_port: Optional[SettingsPort] = None):
        self.db = db
        from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter
        self.settings = settings_port or DbSettingsAdapter(db)
        self.img_service = image_processing_service
        self.groups_builder = OrganizerGroupsBuilder(self.img_service)

    def _preferred_metadata_language(self) -> str:
        """Retrieves user's preferred language for scraping/organizing metadata."""
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE

    def get_organizer_groups(self, scan_mode: Optional[str] = None, session_mode: Optional[str] = None) -> OrganizerGroupsResponse:
        """Categorizes all unorganized media and extra files into distinct preview groups."""
        pref_lang = self._preferred_metadata_language()
        return self.groups_builder.get_organizer_groups(
            db=self.db,
            scan_mode=scan_mode,
            session_mode=session_mode,
            pref_lang=pref_lang
        )

    def get_organizer_item_count(self, scan_mode: Optional[str] = None, session_mode: Optional[str] = None) -> int:
        """Returns the total number of unorganized media items."""
        items = OrganizerHelper.get_unorganized_media_items(self.db, scan_mode, session_mode)
        return len(items)

    def delete_organizer_items(self, item_ids: List[int], extra_ids: List[int], mode: str) -> ActionResponse:
        """Handles deleting or ignoring unorganized items/extras."""
        res = OrganizerHelper.delete_or_ignore_items(self.db, item_ids, extra_ids, mode)
        return ActionResponse(
            status="success",
            ignored_items=res.get("ignored_items", 0),
            deleted_items=res.get("deleted_items", 0),
            deleted_extras=res.get("deleted_extras", 0),
            mode=mode
        )
