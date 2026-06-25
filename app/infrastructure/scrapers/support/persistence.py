import os
import re
from pathlib import Path
from urllib.parse import urlparse
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.shared_kernel.enums import Provider, MediaType, RoleType
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.domains.metadata.models import MetadataMatch, MetadataLocalization, Studio, MediaCollection
from app.domains.people.models import Person, MediaPersonLink
from app.domains.people.services import PersonService
from app.shared_kernel.ports.metadata_repository_port import MetadataRepositoryPort
from app.shared_kernel.ports.people_repository_port import PeopleRepositoryPort
from app.shared_kernel.ports.image_download_port import ImageDownloadPort

logger = logging.getLogger(__name__)


import threading

persistence_lock = threading.Lock()

def _detect_remote_image_extension(url: str, fallback_name: str = "") -> str:
    fallback_ext = Path(urlparse(fallback_name).path).suffix.lower()
    if fallback_ext in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}:
        return '.jpg' if fallback_ext == '.jpeg' else fallback_ext

    def from_content_type(content_type: str) -> Optional[str]:
        value = (content_type or '').lower()
        if 'image/svg+xml' in value or 'svg' in value:
            return '.svg'
        if 'image/png' in value or 'png' in value:
            return '.png'
        if 'image/webp' in value or 'webp' in value:
            return '.webp'
        if 'image/gif' in value or 'gif' in value:
            return '.gif'
        if 'image/jpeg' in value or 'image/jpg' in value or 'jpeg' in value or 'jpg' in value:
            return '.jpg'
        return None

    def from_bytes(data: bytes) -> Optional[str]:
        sample = (data or b'').lstrip()
        if sample.startswith(b'\x89PNG\r\n\x1a\n'):
            return '.png'
        if sample.startswith(b'GIF87a') or sample.startswith(b'GIF89a'):
            return '.gif'
        if sample.startswith(b'\xff\xd8\xff'):
            return '.jpg'
        if sample.startswith(b'RIFF') and b'WEBP' in sample[:16]:
            return '.webp'
        lowered = sample[:4096].lower()
        if lowered.startswith(b'<?xml') or lowered.startswith(b'<svg') or b'<svg' in lowered:
            return '.svg'
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        import requests

        resp = requests.head(url, headers=headers, timeout=3, allow_redirects=True)
        ext = from_content_type(resp.headers.get('Content-Type', ''))
        if ext:
            return ext
    except Exception:
        pass

    try:
        import requests

        resp = requests.get(url, headers=headers, timeout=5, allow_redirects=True, stream=True)
        ext = from_content_type(resp.headers.get('Content-Type', ''))
        if ext:
            resp.close()
            return ext

        for chunk in resp.iter_content(chunk_size=4096):
            if chunk:
                ext = from_bytes(chunk)
                resp.close()
                if ext:
                    return ext
                break
        resp.close()
    except Exception:
        pass

    return '.jpg'


class ScraperPersister:
    """
    Handles database persistence for scraper metadata.
    Decoupled from scraper classes to maintain clean domain boundaries.
    """

    def __init__(
        self,
        db: Session,
        metadata_repo: Optional[MetadataRepositoryPort] = None,
        people_repo: Optional[PeopleRepositoryPort] = None,
        image_downloader: Optional[ImageDownloadPort] = None,
    ):
        self.db = db
        from app.infrastructure.repositories.db_metadata_repository import DbMetadataRepository
        from app.infrastructure.repositories.db_people_repository import DbPeopleRepository
        from app.infrastructure.tasks.tasks_image_download_adapter import TasksImageDownloadAdapter
        self.metadata_repo = metadata_repo or DbMetadataRepository(db)
        self.people_repo = people_repo or DbPeopleRepository(db)
        self.image_downloader = image_downloader or TasksImageDownloadAdapter()

    def _local_image_exists(self, path: Optional[str], subfolder: str) -> bool:
        return bool(path and path.startswith(f"{subfolder}/"))

    def persist_normalized_scene(
        self,
        provider: Provider,
        scene_id: str,
        norm: Dict[str, Any],
        media_type: MediaType = MediaType.SCENE,
        media_item_id: Optional[int] = None,
    ) -> MetadataMatch:
        """Takes a normalized scene structure and persists it to the database."""
        with persistence_lock:
            # Find or create match
            match = self.metadata_repo.get_match(
                provider=provider,
                external_id=scene_id,
                media_type=media_type,
                media_item_id=media_item_id
            )

            if not match:
                try:
                    with self.db.begin_nested():
                        match = self.metadata_repo.create_match(
                            provider=provider,
                            external_id=scene_id,
                            media_type=media_type,
                            media_item_id=media_item_id
                        )
                        self.metadata_repo.flush()
                except Exception:
                    match = self.metadata_repo.get_match(
                        provider=provider,
                        external_id=scene_id,
                        media_type=media_type,
                        media_item_id=media_item_id
                    )

            # 1. Map basic match fields
            for k, v in norm["match"].items():
                setattr(match, k, v)

            # 2. Map Studio details
            for studio_info in norm["studios"]:
                s_name = studio_info["name"]
                studio = self.metadata_repo.get_studio_by_name(s_name)
                if not studio:
                    try:
                        with self.db.begin_nested():
                            studio = self.metadata_repo.create_studio(name=s_name, logo_path=studio_info["logo_path"])
                            self.metadata_repo.flush()
                    except Exception:
                        studio = self.metadata_repo.get_studio_by_name(s_name)
                elif studio_info.get("logo_path") and (
                    not studio.logo_path 
                    or not self._local_image_exists(studio.logo_path, "logos")
                    or (studio.logo_path.startswith("logos/") and studio.logo_path.lower().endswith((".jpg", ".jpeg")))
                ):
                    studio.logo_path = studio_info["logo_path"]
                
                # Map parent studio
                parent_info = studio_info["parent"]
                if parent_info:
                    p_name = parent_info["name"]
                    parent_studio = self.metadata_repo.get_studio_by_name(p_name)
                    if not parent_studio:
                        try:
                            with self.db.begin_nested():
                                parent_studio = self.metadata_repo.create_studio(name=p_name, logo_path=parent_info["logo_path"])
                                self.metadata_repo.flush()
                        except Exception:
                            parent_studio = self.metadata_repo.get_studio_by_name(p_name)
                    elif parent_info.get("logo_path") and (
                        not parent_studio.logo_path 
                        or not self._local_image_exists(parent_studio.logo_path, "logos")
                        or (parent_studio.logo_path.startswith("logos/") and parent_studio.logo_path.lower().endswith((".jpg", ".jpeg")))
                    ):
                        parent_studio.logo_path = parent_info["logo_path"]
                    studio.parent_studio = parent_studio
                    self._queue_studio_logo(parent_studio)

                self._queue_studio_logo(studio)

                if studio not in match.studios:
                    match.studios.append(studio)

            loc = None
            for l in match.localizations:
                if l.locale == DEFAULT_FALLBACK_LANGUAGE:
                    loc = l
                    break
            if not loc:
                loc = self.metadata_repo.get_localization(match.id, DEFAULT_FALLBACK_LANGUAGE)
            if not loc:
                loc = self.metadata_repo.create_localization(match.id, DEFAULT_FALLBACK_LANGUAGE)
                for k, v in norm["localization"].items():
                    if k != "genres":
                        setattr(loc, k, v)
                if loc not in match.localizations:
                    match.localizations.append(loc)
                try:
                    with self.db.begin_nested():
                        self.metadata_repo.flush()
                except Exception:
                    loc = self.metadata_repo.get_localization(match.id, DEFAULT_FALLBACK_LANGUAGE)
            else:
                for k, v in norm["localization"].items():
                    if k != "genres":
                        setattr(loc, k, v)

            # 4. Map Performers/Cast utilizing PersonService
            person_service = PersonService(self.db)
            for idx, perf in enumerate(norm["performers"]):
                prov_enum = None
                if perf.get("provider"):
                    try:
                        prov_enum = Provider(perf["provider"])
                    except Exception:
                        pass
                person = person_service.update_or_create_person(
                    name=perf["name"],
                    profile_path=perf["profile_path"],
                    gender=perf["gender"],
                    is_adult=perf["is_adult"],
                    performer_details=perf["performer_details"],
                    provider=prov_enum,
                    external_id=perf.get("external_id"),
                    known_for_department=perf.get("known_for_department")
                )

                # Queue profile image download
                self._queue_person_profile(person)

                # Link person to match
                link = self.people_repo.get_media_person_link(match.id, person.id, RoleType.ACTOR)

                if not link:
                    link = self.people_repo.create_media_person_link(
                        role=RoleType.ACTOR,
                        order=idx,
                        match_id=match.id,
                        person_id=person.id
                    )

            self.metadata_repo.flush()
            self._queue_adult_assets(match)
            return match

    def persist_normalized_movie(self, movie_id: str, norm: Dict[str, Any], language: str) -> MetadataMatch:
        """Takes a normalized movie structure and persists it to the database."""
        with persistence_lock:
            match = self.metadata_repo.get_match(
                provider=Provider.TMDB,
                external_id=movie_id,
                media_type=MediaType.MOVIE
            )

            if not match:
                try:
                    with self.db.begin_nested():
                        match = self.metadata_repo.create_match(
                            provider=Provider.TMDB,
                            external_id=movie_id,
                            media_type=MediaType.MOVIE
                        )
                        self.metadata_repo.flush()
                except Exception:
                    match = self.metadata_repo.get_match(
                        provider=Provider.TMDB,
                        external_id=movie_id,
                        media_type=MediaType.MOVIE
                    )

            # 1. Map basic match fields
            for k, v in norm["match"].items():
                setattr(match, k, v)

            # 2. Map Studio details
            for studio_info in norm["studios"]:
                s_name = studio_info["name"]
                studio = self.metadata_repo.get_studio_by_name(s_name)
                if not studio:
                    try:
                        with self.db.begin_nested():
                            studio = self.metadata_repo.create_studio(name=s_name, logo_path=studio_info["logo_path"])
                            self.metadata_repo.flush()
                    except Exception:
                        studio = self.metadata_repo.get_studio_by_name(s_name)
                elif studio_info.get("logo_path") and (
                    not studio.logo_path 
                    or (studio.logo_path.startswith("logos/") and studio.logo_path.lower().endswith((".jpg", ".jpeg")))
                ):
                    studio.logo_path = studio_info["logo_path"]

                if studio not in match.studios:
                    match.studios.append(studio)
                
                self._queue_studio_logo(studio)

            # 3. Map Collection details
            coll_info = norm["collection"]
            if coll_info:
                coll_id = coll_info["external_id"]
                collection = self.metadata_repo.get_collection(Provider.TMDB, coll_id)
                if not collection:
                    try:
                        with self.db.begin_nested():
                            collection = self.metadata_repo.create_collection(
                                provider=Provider.TMDB,
                                external_id=coll_id,
                                backdrop_path=coll_info["backdrop_path"]
                            )
                            self.metadata_repo.flush()
                    except Exception:
                        collection = self.metadata_repo.get_collection(Provider.TMDB, coll_id)
                match.collection = collection
                
                if collection:
                    from app.shared_kernel.language import LanguageService
                    lang_code = LanguageService.clean_locale(language)
                    loc = None
                    if collection.id is not None:
                        loc = self.metadata_repo.get_collection_localization(collection.id, lang_code)
                    if not loc:
                        loc = self.metadata_repo.create_collection_localization(
                            collection_id=collection.id,
                            locale=lang_code
                        )
                    loc.title = coll_info.get("name") or loc.title
                    loc.poster_path = coll_info.get("poster_path") or loc.poster_path
                    
                    if loc.poster_path and not loc.local_poster_path:
                        try:
                            url = self.image_downloader.get_download_url(loc.poster_path, "posters")
                            if url:
                                import os
                                import re
                                from urllib.parse import urlparse
                                basename = os.path.basename(urlparse(loc.poster_path).path)
                                ext = os.path.splitext(basename)[1].lower() or ".jpg"
                                asset_prefix = f"tmdb_{collection.external_id}"
                                safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", asset_prefix).strip("_")
                                filename = f"{safe_prefix}_{basename}{ext}"
                                self.image_downloader.enqueue_download(url, "posters", filename)
                                loc.local_poster_path = f"posters/{filename}"
                        except Exception as e:
                            logger.error(f"Failed to queue image download for collection in persistence: {e}")

                    if collection.backdrop_path and not collection.local_backdrop_path:
                        try:
                            url = self.image_downloader.get_download_url(collection.backdrop_path, "backdrops")
                            if url:
                                import os
                                import re
                                from urllib.parse import urlparse
                                basename = os.path.basename(urlparse(collection.backdrop_path).path)
                                ext = os.path.splitext(basename)[1].lower() or ".jpg"
                                asset_prefix = f"tmdb_{collection.external_id}"
                                safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", asset_prefix).strip("_")
                                filename = f"{safe_prefix}_{basename}{ext}"
                                self.image_downloader.enqueue_download(url, "backdrops", filename)
                                collection.local_backdrop_path = f"backdrops/{filename}"
                        except Exception as e:
                            logger.error(f"Failed to queue backdrop download for collection in persistence: {e}")

            # 4. Map Localization
            loc = None
            for l in match.localizations:
                if l.locale == language:
                    loc = l
                    break
            if not loc:
                loc = self.metadata_repo.get_localization(match.id, language)
            if not loc:
                loc = self.metadata_repo.create_localization(match.id, language)
                for k, v in norm["localization"].items():
                    setattr(loc, k, v)
                if loc not in match.localizations:
                    match.localizations.append(loc)
                try:
                    with self.db.begin_nested():
                        self.metadata_repo.flush()
                except Exception:
                    loc = self.metadata_repo.get_localization(match.id, language)
            else:
                for k, v in norm["localization"].items():
                    setattr(loc, k, v)

            # 5. Map Cast/Crew utilizing PersonService
            person_service = PersonService(self.db)
            for idx, cast_member in enumerate(norm["performers"][:15]):
                person = person_service.update_or_create_person(
                    name=cast_member["name"],
                    profile_path=cast_member["profile_path"],
                    gender=cast_member["gender"],
                    is_adult=cast_member["is_adult"],
                    tmdb_id=cast_member["tmdb_id"],
                    performer_details=cast_member.get("performer_details"),
                    provider=Provider(cast_member["provider"]) if cast_member.get("provider") else None,
                    external_id=cast_member.get("external_id"),
                    known_for_department=cast_member.get("known_for_department"),
                    urls=cast_member.get("urls")
                )
                
                # Queue profile image download
                self._queue_person_profile(person)

                # Check Link
                link = self.people_repo.get_media_person_link(match.id, person.id, RoleType.ACTOR)
                if not link:
                    link = self.people_repo.create_media_person_link(
                        role=RoleType.ACTOR,
                        character_name=cast_member["character"],
                        order=idx,
                        match_id=match.id,
                        person_id=person.id
                    )

            self.metadata_repo.flush()
            self._queue_adult_assets(match)
            return match

    def _queue_adult_assets(self, match: MetadataMatch) -> None:
        """Queues poster/backdrop downloads for adult matches."""
        def queue_image(path: Optional[str], subfolder: str, prefix: str) -> Optional[str]:
            if not path:
                return None

            url = self.image_downloader.get_download_url(path, subfolder)
            if not url:
                return None

            basename = os.path.basename(urlparse(path).path)
            if not basename:
                return None

            ext = os.path.splitext(basename)[1].lower()
            if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}:
                try:
                    import requests
                    resp = requests.head(url, timeout=3, allow_redirects=True)
                    ct = resp.headers.get("Content-Type", "").lower()
                    if "png" in ct:
                        ext = ".png"
                    elif "webp" in ct:
                        ext = ".webp"
                    elif "gif" in ct:
                        ext = ".gif"
                    elif "svg" in ct:
                        ext = ".svg"
                    else:
                        ext = ".jpg"
                except Exception:
                    ext = ".jpg"
                basename = f"{basename}{ext}"

            safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", prefix).strip("_")
            filename = f"{safe_prefix}_{basename}"
            self.image_downloader.enqueue_download(url, subfolder, filename)
            return f"{subfolder}/{filename}"

        asset_prefix = f"{match.provider.value}_{match.external_id}"
        backdrop_subfolder = "scene_stills" if match.media_type == MediaType.SCENE else "backdrops"
        match.local_backdrop_path = queue_image(match.backdrop_path, backdrop_subfolder, asset_prefix)

        loc = next((l for l in match.localizations if l.locale == DEFAULT_FALLBACK_LANGUAGE), None)
        if loc:
            if match.media_type == MediaType.SCENE and loc.poster_path and loc.poster_path == match.backdrop_path:
                loc.local_poster_path = match.local_backdrop_path
            else:
                loc.local_poster_path = queue_image(loc.poster_path, "posters", asset_prefix)

    def _queue_studio_logo(self, studio: Studio) -> None:
        """Queues studio logo downloads."""
        if not studio or not studio.logo_path:
            return
        if studio.logo_path.startswith("logos/") and self._local_image_exists(studio.logo_path, "logos"):
            return

        url = self.image_downloader.get_download_url(studio.logo_path, "logos")
        if not url:
            return

        basename = os.path.basename(urlparse(studio.logo_path).path)
        if not basename:
            return

        ext = _detect_remote_image_extension(url, studio.logo_path)
        basename_root = Path(basename).stem or basename
        basename = f"{basename_root}{ext}"

        safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", studio.name).strip("_")
        filename = f"studio_{safe_name}_{basename}"
        studio.logo_path = f"logos/{filename}"
        self.image_downloader.enqueue_download(url, "logos", filename)

    def _queue_person_profile(self, person: Person) -> None:
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
                ext = os.path.splitext(basename)[1].lower() or ".jpg"
        except Exception:
            ext = os.path.splitext(basename)[1].lower() or ".jpg"
        basename = f"{basename}{ext}"

        safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", person.name).strip("_")
        ext_id = "unknown"
        prov_val = "perf"
        if person.external_ids:
            for k, v in person.external_ids.items():
                prov_val = k
                ext_id = v
                break
        filename = f"{prov_val}_{ext_id}_{safe_name}_{basename}"
        person.local_profile_path = f"people/{filename}"
        self.image_downloader.enqueue_download(url, "people", filename)
