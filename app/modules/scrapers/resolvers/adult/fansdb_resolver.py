import logging
from app.core.enums import Provider
from app.modules.scrapers.resolvers.adult.base_resolver import BaseStashGraphQLResolver

logger = logging.getLogger(__name__)

class FansDbResolver(BaseStashGraphQLResolver):
    """
    Submodule to resolve matches from FansDB API.
    """
    def __init__(self, scraper):
        super().__init__(scraper, Provider.FANSDB, ['fansdb_api_key'])

