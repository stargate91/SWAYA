import logging
from typing import List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.shared_kernel.enums import Provider

from app.infrastructure.scrapers.resolvers.adult.stashdb_resolver import StashDbResolver
from app.infrastructure.scrapers.resolvers.adult.porndb_resolver import PornDbResolver
from app.infrastructure.scrapers.resolvers.adult.fansdb_resolver import FansDbResolver

logger = logging.getLogger(__name__)

class AdultResolverFactory:
    def _configured_scene_provider_order(self, db: Session, scraper_gateway: Any) -> List[Provider]:
        """Loads provider hierarchy order preference from stash settings."""
        stash_scraper = scraper_gateway.adult(Provider.STASHDB, db)
        order_setting = stash_scraper.get_setting('scenes_scraper_order') or 'stashdb,porndb,fansdb'
        order = []
        for value in str(order_setting).split(','):
            name = value.strip().lower()
            if name == 'stashdb':
                order.append(Provider.STASHDB)
            elif name == 'fansdb':
                order.append(Provider.FANSDB)
            elif name == 'porndb':
                order.append(Provider.PORNDB)
        return order or [Provider.STASHDB, Provider.PORNDB, Provider.FANSDB]

    def build_scrapers_to_try(
        self,
        db: Session,
        scraper_gateway: Any,
        preferred_provider: Optional[Provider] = None
    ) -> List[Tuple[Any, Provider]]:
        """Instantiates resolvers and filters them based on settings and configuration status."""
        stash_scraper = scraper_gateway.adult(Provider.STASHDB, db)
        porndb_scraper = scraper_gateway.adult(Provider.PORNDB, db)
        fans_scraper = scraper_gateway.adult(Provider.FANSDB, db)

        resolvers = {
            Provider.STASHDB: (StashDbResolver(stash_scraper), Provider.STASHDB),
            Provider.PORNDB: (PornDbResolver(porndb_scraper), Provider.PORNDB),
            Provider.FANSDB: (FansDbResolver(fans_scraper), Provider.FANSDB),
        }

        available = {}
        for provider, (res_obj, _) in resolvers.items():
            if res_obj.is_configured():
                available[provider] = (res_obj, provider)

        if preferred_provider:
            selected = [available[preferred_provider]] if preferred_provider in available else []
            return selected

        for provider in self._configured_scene_provider_order(db, scraper_gateway):
            if provider in available:
                return [available[provider]]
        return []
