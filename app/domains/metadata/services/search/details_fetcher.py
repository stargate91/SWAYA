import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.enums import Provider, MediaType
from app.modules.metadata.models import MetadataMatch
from app.shared_kernel.ports.media_item_port import MediaItemPort

logger = logging.getLogger(__name__)

class DetailsFetcher:
    def get_seasons(self, tmdb_client: Any, tmdb_id: int) -> List[Dict[str, Any]]:
        """Retrieves and formats TV seasons for a given show."""
        details = tmdb_client.get_details(tmdb_id, "tv")
        seasons = details.get("seasons", []) or []
        formatted = []
        for s in seasons:
            formatted.append({
                "season_number": s.get("season_number"),
                "name": s.get("name"),
                "episode_count": s.get("episode_count"),
                "poster_path": s.get("poster_path"),
                "air_date": s.get("air_date"),
            })
        return formatted

    def get_episodes(self, tmdb_client: Any, tmdb_id: int, season_number: int) -> List[Dict[str, Any]]:
        """Retrieves and formats TV episodes for a given season."""
        details = tmdb_client.get_season_details(tmdb_id, season_number)
        episodes = details.get("episodes", []) or []
        formatted = []
        for ep in episodes:
            formatted.append({
                "episode_number": ep.get("episode_number"),
                "name": ep.get("name"),
                "overview": ep.get("overview"),
                "still_path": ep.get("still_path"),
                "air_date": ep.get("air_date"),
                "vote_average": ep.get("vote_average"),
            })
        return formatted

    def get_full_metadata(
        self,
        db: Session,
        scrapers: Any,
        tmdb_client: Any,
        item_id: str,
        media_type: Optional[str] = None,
        language: Optional[str] = None,
        media_item_port: Optional[MediaItemPort] = None
    ) -> Dict[str, Any]:
        """Retrieves complete metadata details (raw details + local match metadata) for an item."""
        is_tmdb_direct = False
        tmdb_id_int = None
        
        if isinstance(item_id, str) and item_id.startswith("tmdb_"):
            try:
                tmdb_id_int = int(item_id.split("_")[1])
                is_tmdb_direct = True
            except (ValueError, IndexError) as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)
        
        if not is_tmdb_direct and (media_type == "tv" or (isinstance(item_id, str) and "tv" in item_id)):
            try:
                clean_id = str(item_id)
                if clean_id.startswith("tmdb_"):
                    clean_id = clean_id.split("_")[1]
                tmdb_id_int = int(clean_id)
                is_tmdb_direct = True
            except (ValueError, IndexError) as e:
                logger.debug(f"Swallowed exception: {e}", exc_info=True)

        if is_tmdb_direct and tmdb_id_int is not None:
            details = {}
            try:
                resolved_media_type = media_type or "tv"
                item_type = "tv" if resolved_media_type == "tv" else "movie"
                details = tmdb_client.get_details(tmdb_id_int, item_type, language=language)
            except Exception as e:
                logger.error(f"Failed to fetch direct TMDB full metadata: {e}")
            return {
                "item_id": item_id,
                "match": None,
                "raw_details": details,
            }

        try:
            item_id_int = int(item_id)
        except ValueError:
            from app.core.exceptions import BadRequestException
            raise BadRequestException("Invalid item ID format")

        if not media_item_port:
            from app.core.exceptions import BadRequestException
            raise BadRequestException("media_item_port is required for this operation")

        item = media_item_port.get_item_by_id(item_id_int)
        if not item:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Item not found")

        match = db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).first()
        if not match:
            return {
                "item_id": item.id,
                "match": None,
                "raw_details": {},
            }

        details = {}
        try:
            if match.provider in (Provider.STASHDB, Provider.PORNDB, Provider.FANSDB):
                scraper = None
                if match.provider == Provider.STASHDB:
                    scraper = scrapers.adult(Provider.STASHDB, db)
                elif match.provider == Provider.PORNDB:
                    scraper = scrapers.adult(Provider.PORNDB, db)
                elif match.provider == Provider.FANSDB:
                    scraper = scrapers.adult(Provider.FANSDB, db)

                if scraper:
                    details = scraper.fetch_scene(match.external_id) or {}
            else:
                item_type = "tv" if match.media_type in (MediaType.TV, MediaType.SEASON, MediaType.EPISODE) else "movie"
                details = tmdb_client.get_details(int(match.external_id), item_type, language=language)
        except Exception as e:
            logger.error(f"Failed to fetch detailed match info: {e}")

        return {
            "item_id": item.id,
            "match": {
                "id": match.id,
                "provider": match.provider.value,
                "external_id": match.external_id,
                "media_type": match.media_type.value,
                "season_number": match.season_number,
                "episode_number": match.episode_number,
                "release_date": match.release_date.isoformat() if match.release_date else None,
                "original_title": match.original_title,
                "backdrop_path": match.backdrop_path,
            },
            "raw_details": details
        }
