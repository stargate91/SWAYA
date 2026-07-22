import logging
from typing import List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.core.enums import Provider

from app.modules.scrapers.resolvers.adult.stashdb_resolver import StashDbResolver
from app.modules.scrapers.resolvers.adult.porndb_resolver import PornDbResolver
from app.modules.scrapers.resolvers.adult.fansdb_resolver import FansDbResolver

logger = logging.getLogger(__name__)

class AdultResolverFactory:
    def _configured_scene_provider_order(self, db: Session, scraper_gateway: Any) -> List[Provider]:
        """Loads provider hierarchy order preference from stash settings."""
        stash_scraper = scraper_gateway.adult(Provider.STASHDB, db)
        order_setting = stash_scraper.get_setting('scenes_scraper_order') or 'stashdb,porndb,fansdb'
        order = []
        from app.modules.scrapers.support.registry import ProviderRegistry
        for value in str(order_setting).split(','):
            p_enum = ProviderRegistry.get_provider_by_prefix(value.strip())
            if p_enum:
                order.append(p_enum)
        return order or ProviderRegistry.get_adult_providers()

    def build_scrapers_to_try(
        self,
        db: Session,
        scraper_gateway: Any,
        preferred_provider: Optional[Provider] = None
    ) -> List[Tuple[Any, Provider]]:
        """Instantiates resolvers and filters them based on settings and configuration status."""
        from app.modules.scrapers.support.registry import ProviderRegistry
        
        resolvers = {}
        for provider in ProviderRegistry.get_adult_providers():
            scraper = scraper_gateway.adult(provider, db)
            resolver_class = {
                Provider.STASHDB: StashDbResolver,
                Provider.PORNDB: PornDbResolver,
                Provider.FANSDB: FansDbResolver,
            }.get(provider)
            if resolver_class:
                resolvers[provider] = (resolver_class(scraper), provider)

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
