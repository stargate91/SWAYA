from typing import Any

from app.core.enums import Provider
from app.modules.scrapers.enrichment.mainstream_enricher import MainstreamEnricher


class ScraperGateway:
    def get_scraper(self, provider: Provider, db_session: Any) -> Any:
        from app.modules.scrapers.support.registry import ProviderRegistry
        config = ProviderRegistry.get_config(provider)
        scraper_loader = config.scraper_loader if config else None
        if scraper_loader:
            scraper_class = scraper_loader()
            return scraper_class(db_session)
        raise ValueError(f"Unsupported metadata provider: {provider}")

    def enrich_mainstream(
        self,
        db_session: Any,
        item: Any,
        language: str,
        *,
        commit: bool = True,
    ) -> None:
        MainstreamEnricher(db_session).enrich_matched_item(
            item,
            language=language,
            commit=commit,
        )


scraper_gateway = ScraperGateway()
