import logging
from app.core.enums import Provider
from app.modules.scrapers.support.base import BaseStashGraphQLScraper

logger = logging.getLogger(__name__)

class FansDBScraper(BaseStashGraphQLScraper):
    """FansDB-specific metadata retriever and parser utilizing GraphQL and ScraperNormalizer."""

    def __init__(self, settings, cache_service=None):
        super().__init__(settings, cache_service, Provider.FANSDB)



