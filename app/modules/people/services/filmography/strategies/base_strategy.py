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

        from app.modules.scrapers.support.registry import ProviderRegistry
        from app.core.enums import Provider

        source_lower = str(source or "").lower()
        p_enum = ProviderRegistry.get_provider_by_prefix(source_lower)
        if p_enum:
            cfg = ProviderRegistry.get_config(p_enum)
            if cfg and cfg.uses_flat_measurements:
                return StashDbFilmographyStrategy(scrapers, db)
            elif p_enum == Provider.PORNDB:
                return PornDbFilmographyStrategy(scrapers, db)
        
        raise ValueError(f"Unsupported remote credits source: {source}")
