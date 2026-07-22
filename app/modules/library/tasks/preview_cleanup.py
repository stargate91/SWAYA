import os
import time
import logging
from sqlalchemy.orm import Session
from app.core.database import SWAYA_DB_PATH
from app.modules.settings.services.settings_service import SettingsService

logger = logging.getLogger("app.tasks.preview_cleanup")

def clean_preview_cache(db: Session):
    """
    Cleans up generated previews in the previews directory based on user settings:
    - Max age in days (previews_cache_max_age_days)
    - Max cache size in MB (previews_cache_max_size_mb)
    """
    previews_dir = os.path.abspath(os.path.join(os.path.dirname(SWAYA_DB_PATH), "previews"))
    if not os.path.exists(previews_dir):
        return

    settings = SettingsService(db)
    
    max_age_days = settings.get_setting("previews_cache_max_age_days")
    max_size_mb = settings.get_setting("previews_cache_max_size_mb")
    
    if max_age_days is None:
        max_age_days = 30
    if max_size_mb is None:
        max_size_mb = 2048  # 2GB
        
    logger.info(f"Running preview cache cleanup. Limits: max_age_days={max_age_days}, max_size_mb={max_size_mb}")

    now = time.time()
    files = []
    
    for filename in os.listdir(previews_dir):
        if not filename.endswith(".mp4"):
            continue
        filepath = os.path.join(previews_dir, filename)
        try:
            stat = os.stat(filepath)
            access_time = max(stat.st_atime, stat.st_mtime)
            size = stat.st_size
            files.append({
                "path": filepath,
                "access_time": access_time,
                "size": size
            })
        except Exception as e:
            logger.error(f"Failed to stat file {filepath}: {e}")

    # 1. Prune by age (if limit is not disabled with -1)
    if max_age_days > 0:
        max_age_sec = max_age_days * 24 * 3600
        remaining_files = []
        for f in files:
            age = now - f["access_time"]
            if age > max_age_sec:
                try:
                    os.remove(f["path"])
                    logger.info(f"Pruned old preview cache file (age): {f['path']}")
                except Exception as e:
                    logger.error(f"Failed to delete {f['path']}: {e}")
            else:
                remaining_files.append(f)
        files = remaining_files

    # 2. Prune by size (if limit is not disabled with -1)
    if max_size_mb > 0:
        max_size_bytes = max_size_mb * 1024 * 1024
        total_size = sum(f["size"] for f in files)
        
        if total_size > max_size_bytes:
            # Sort files by access time ascending (oldest first)
            files.sort(key=lambda x: x["access_time"])
            for f in files:
                if total_size <= max_size_bytes:
                    break
                try:
                    os.remove(f["path"])
                    total_size -= f["size"]
                    logger.info(f"Pruned preview cache file to fit size limit: {f['path']}")
                except Exception as e:
                    logger.error(f"Failed to delete {f['path']}: {e}")
