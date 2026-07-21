from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session

class BaseFilmographyStrategy:
    def __init__(self, scrapers: Any, db: Session):
        self.scrapers = scrapers
        self.db = db

    def query_remote(self, media_type: str, ext_id: str, source: str) -> Tuple[List[Dict[str, Any]], int]:
        raise NotImplementedError("Subclasses must implement query_remote")

    @staticmethod
    def get_strategy(source: str, scrapers: Any, db: Session) -> "BaseFilmographyStrategy":
        from app.modules.people.services.filmography.strategies.stashdb_strategy import StashDbFilmographyStrategy
        from app.modules.people.services.filmography.strategies.porndb_strategy import PornDbFilmographyStrategy

        source_lower = str(source or "").lower()
        if source_lower in ("stashdb", "fansdb"):
            return StashDbFilmographyStrategy(scrapers, db)
        elif source_lower == "porndb":
            return PornDbFilmographyStrategy(scrapers, db)
        else:
            raise ValueError(f"Unsupported remote credits source: {source}")
