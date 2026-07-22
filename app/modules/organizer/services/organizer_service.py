import logging
from typing import List, Optional, Any
from sqlalchemy.orm import Session



from app.modules.media_assets.services.images import image_processing_service
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.modules.organizer.schemas import ActionResponse
from app.modules.organizer.services.organizer_helper import OrganizerHelper
from app.modules.organizer.services.groups_builder import OrganizerGroupsBuilder

logger = logging.getLogger(__name__)

class OrganizerService:
    def __init__(self, db: Session, scrapers: Any, settings: Optional[Any] = None):
        self.db = db
        from app.modules.settings.services.settings_service import SettingsService
        self.settings = settings or SettingsService(db)
        self.img_service = image_processing_service
        self.groups_builder = OrganizerGroupsBuilder(self.img_service)

    def _preferred_metadata_language(self) -> str:
        """Retrieves user's preferred language for scraping/organizing metadata."""
        lang = self.settings.get_setting("primary_metadata_language")
        return lang if lang else DEFAULT_FALLBACK_LANGUAGE

    def get_organizer_groups(
        self,
        page: int = 1,
        page_size: int = 40,
        tab: str = "manual",
        sub_tab: Optional[str] = None,
        q: Optional[str] = None,
        sort_by: str = "source",
        sort_dir: str = "asc",
        scan_mode: Optional[str] = None,
        session_mode: Optional[str] = None
    ) -> Any:
        """Categorizes all unorganized media and extra files into distinct preview groups with server-side pagination, search and sorting."""
        pref_lang = self._preferred_metadata_language()
        return self.groups_builder.get_organizer_groups(
            db=self.db,
            page=page,
            page_size=page_size,
            tab=tab,
            sub_tab=sub_tab,
            q=q,
            sort_by=sort_by,
            sort_dir=sort_dir,
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
