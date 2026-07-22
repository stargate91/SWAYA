import logging
from typing import Optional
from app.core.enums import Provider
from app.modules.metadata.models import MetadataMatch
from app.modules.scrapers.support.base import BaseScraper

from app.core.constants import OMDB_DEFAULT_ENDPOINT, OMDB_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class OMDBScraper(BaseScraper):
    """OMDB-specific metadata retriever."""

    def __init__(self, settings, cache_service=None):
        super().__init__(settings, cache_service, Provider.OMDB)

    def fetch_omdb(self, imdb_id: str, force_refresh: bool = False) -> Optional[dict]:
        """Fetches additional ratings/details from OMDB (always SFW and non-localized)."""
        if not imdb_id or not imdb_id.startswith("tt"):
            return None

        api_key = self.get_setting("omdb_api_key")
        if not api_key:
            logger.warning("OMDB API key not configured.")
            return None

        cache_key = f"omdb/{imdb_id}"
        url = OMDB_DEFAULT_ENDPOINT
        params = {"apikey": api_key, "i": imdb_id}
        
        return self.get_json_cached(
            Provider.OMDB,
            cache_key,
            url,
            params=params,
            force_refresh=force_refresh,
            external_id=imdb_id,
            result_extractor=lambda d: d if d.get("Response") == "True" else None,
            timeout=OMDB_REQUEST_TIMEOUT,
        )

    def update_omdb_ratings(self, match: MetadataMatch, raw_data: dict) -> None:
        """Parses OMDB raw ratings and updates the MetadataMatch record."""
        if not raw_data:
            return

        try:
            imdb_rating = raw_data.get("imdbRating")
            if imdb_rating and imdb_rating != "N/A":
                match.rating_imdb = float(imdb_rating)
        except Exception as e:
            logger.debug(f"Failed to parse IMDb rating: {e}")

        try:
            imdb_votes = raw_data.get("imdbVotes")
            if imdb_votes and imdb_votes != "N/A":
                match.vote_count_imdb = int(imdb_votes.replace(",", ""))
        except Exception as e:
            logger.debug(f"Failed to parse IMDb vote count: {e}")

        try:
            metascore = raw_data.get("Metascore")
            if metascore and metascore != "N/A":
                match.rating_meta = int(metascore)
        except Exception as e:
            logger.debug(f"Failed to parse Metascore: {e}")

        # Extract Rotten Tomatoes rating
        for rating in raw_data.get("Ratings", []):
            if rating.get("Source") == "Rotten Tomatoes":
                match.rating_rotten = rating.get("Value")
                break
