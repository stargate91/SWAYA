import logging
from app.core.enums import Provider
from app.modules.scrapers.resolvers.adult.base_resolver import BaseStashGraphQLResolver, HASH_QUERY, SEARCH_QUERY

logger = logging.getLogger(__name__)

class StashDbResolver(BaseStashGraphQLResolver):
    """
    Submodule to resolve matches from StashDB API.
    """
    def __init__(self, scraper):
        super().__init__(scraper, Provider.STASHDB, ['stashdb_api_key'])

