import logging
import os
import re
from typing import Dict, Any, Optional
from datetime import datetime
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from app.modules.metadata.models import MetadataMatch


logger = logging.getLogger(__name__)


def _queue_image(image_downloader: Any, path: Optional[str], subfolder: str, prefix: str) -> Optional[str]:
    """Download a remote image asset locally, mirroring MainstreamEnricher._queue_image."""
    if not path:
        return None

    url = image_downloader.get_download_url(path, subfolder)
    if not url:
        return None

    basename = os.path.basename(urlparse(path).path)
    if not basename:
        return None

    ext = os.path.splitext(basename)[1].lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}:
        try:
            import requests
            resp = requests.head(url, timeout=3, allow_redirects=True, verify=False)
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
    image_downloader.enqueue_download(url, subfolder, filename)
    return f"{subfolder}/{filename}"


def _download_image_now(image_downloader: Any, path: Optional[str], subfolder: str, prefix: str) -> Optional[str]:
    """Download a remote image asset synchronously to disk before response rendering."""
    if not path:
        return None

    url = image_downloader.get_download_url(path, subfolder)
    if not url:
        return None

    basename = os.path.basename(urlparse(path).path)
    if not basename:
        return None

    ext = os.path.splitext(basename)[1].lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}:
        ext = ".png"
        basename = f"{basename}{ext}"

    safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", prefix).strip("_")
    filename = f"{safe_prefix}_{basename}"
    res = image_downloader.download_now(url, subfolder, filename)
    if res:
        return f"{subfolder}/{filename}"
    return None


class SceneMetadataSyncer:
    def sync_metadata(
        self,
        db: Session,
        match_db: MetadataMatch,
        title: str,
        scene_data: Dict[str, Any],
        poster_url: Optional[str],
        ext_background: Optional[str],
        date_str: Optional[str],
        image_downloader: Optional[ImageDownloadPort] = None
    ):
        db_updated = False
        if not match_db.backdrop_path and ext_background:
            match_db.backdrop_path = ext_background
            db_updated = True
        if not match_db.release_date and date_str:
            try:
                match_db.release_date = datetime.strptime(date_str, "%Y-%m-%d")
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        if scene_data.get("rating") is not None and float(scene_data.get("rating")) > 0:
            try:
                match_db.rating_porndb = float(scene_data.get("rating"))
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        
        duration_raw = scene_data.get("duration")
        if duration_raw and not match_db.runtime:
            try:
                duration_sec = int(duration_raw)
                match_db.runtime = int(duration_sec // 60)
                db_updated = True
            except Exception as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        
        loc_db = next((x for x in match_db.localizations if x.locale == "en"), None)

        if not loc_db:
            from app.modules.metadata.models import MetadataLocalization
            loc_db = MetadataLocalization(
                match_id=match_db.id,
                locale="en",
                title=title,
                overview=scene_data.get("details"),
                poster_path=poster_url
            )
            db.add(loc_db)
            db_updated = True
        else:
            if not loc_db.title and title:
                loc_db.title = title
                db_updated = True
            if not loc_db.overview and scene_data.get("details"):
                loc_db.overview = scene_data.get("details")
                db_updated = True
            if not loc_db.poster_path and poster_url:
                loc_db.poster_path = poster_url
                db_updated = True

        # Localize assets when an image_downloader is available (track flow)
        if image_downloader:
            prov_val = match_db.provider.value if hasattr(match_db.provider, "value") else str(match_db.provider)
            asset_prefix = f"{prov_val}_{match_db.external_id}"

            # Poster
            effective_poster = loc_db.poster_path if loc_db else poster_url
            if effective_poster and not getattr(loc_db, "local_poster_path", None):
                local_poster = _queue_image(image_downloader, effective_poster, "posters", asset_prefix)
                if local_poster and loc_db:
                    loc_db.local_poster_path = local_poster
                    db_updated = True

            # Backdrop
            effective_backdrop = match_db.backdrop_path or ext_background
            if effective_backdrop and not match_db.local_backdrop_path:
                local_backdrop = _queue_image(image_downloader, effective_backdrop, "backdrops", asset_prefix)
                if local_backdrop:
                    match_db.local_backdrop_path = local_backdrop
                    db_updated = True
        
        if db_updated:
            db.commit()
