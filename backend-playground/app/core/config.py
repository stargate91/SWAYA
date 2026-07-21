import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

SWAYA_DB_PATH = DATA_DIR / "swaya.db"
CACHE_DB_PATH = DATA_DIR / "cache.db"

SWAYA_DATABASE_URL = f"sqlite:///{SWAYA_DB_PATH}"
CACHE_DATABASE_URL = f"sqlite:///{CACHE_DB_PATH}"
