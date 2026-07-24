import re
import os
import logging
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.modules.metadata.models import MetadataMatch
from app.modules.people.models import Person
from app.modules.people.services.person_service import PersonService
from app.core.enums import Provider, RoleType


logger = logging.getLogger(__name__)

class PerformerPersister:
    def __init__(self, db: Session, image_downloader: Any):
        self.db = db
        self.image_downloader = image_downloader
        self.people_repo = PersonService(db)

    def _local_image_exists(self, path: Optional[str], subfolder: str) -> bool:
        return bool(path and path.startswith(f"{subfolder}/"))

    def queue_person_profile(self, person: Person) -> None:
        """Queues person profile image downloads."""
        if not person or not person.profile_path:
            return
        if person.local_profile_path and person.local_profile_path.startswith("people/") and self._local_image_exists(person.local_profile_path, "people"):
            return

        url = self.image_downloader.get_download_url(person.profile_path, "people")
        if not url:
            return

        basename = os.path.basename(urlparse(person.profile_path).path)
        if not basename:
            return

        ext = os.path.splitext(basename)[1].lower()
        if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}:
            try:
                import requests
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                resp = requests.head(url, headers=headers, timeout=3, allow_redirects=True)
                ct = resp.headers.get("Content-Type", "").lower()
                if "png" in ct:
                    ext = ".png"
                elif "webp" in ct:
                    ext = ".webp"
                elif "gif" in ct:
                    ext = ".gif"
                elif "svg" in ct:
                    ext = ".svg"
                elif "jpeg" in ct or "jpg" in ct:
                    ext = ".jpg"
                else:
                    ext = ".jpg"
            except Exception:
                ext = ".jpg"

        if ext == ".jpeg":
            ext = ".jpg"

        re.sub(r"[^A-Za-z0-9_.-]+", "_", person.name).strip("_")
        from app.modules.people.helpers import resolve_and_enqueue_person_profile_image
        resolve_and_enqueue_person_profile_image(
            self.db,
            person,
            url,
            self.image_downloader,
            ext=ext
        )

    def persist_performers(self, performers_info: List[Dict[str, Any]], match: MetadataMatch, limit_cast: int = 15):
        person_service = PersonService(self.db)
        
        # In movies we only persist up to limit_cast performers (usually 15)
        target_performers = performers_info[:limit_cast] if limit_cast > 0 else performers_info
        
        for idx, perf in enumerate(target_performers):
            prov_enum = None
            if perf.get("provider"):
                try:
                    prov_enum = Provider(perf["provider"])
                except Exception as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            person = person_service.update_or_create_person(
                name=perf["name"],
                profile_path=perf["profile_path"],
                gender=perf["gender"],
                is_adult=perf["is_adult"],
                performer_details=perf.get("performer_details"),
                provider=prov_enum,
                external_id=perf.get("external_id"),
                known_for_department=perf.get("known_for_department"),
                urls=perf.get("urls"),
                tmdb_id=perf.get("tmdb_id")
            )

            # Queue profile image download
            self.queue_person_profile(person)

            # Link person to match
            link = self.people_repo.get_media_person_link(match.id, person.id, RoleType.ACTOR)

            if not link:
                self.people_repo.create_media_person_link(
                    role=RoleType.ACTOR,
                    character_name=perf.get("character"),
                    order=idx,
                    match_id=match.id,
                    person_id=person.id
                )
