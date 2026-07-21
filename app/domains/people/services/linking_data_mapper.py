import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.core.enums import Provider

logger = logging.getLogger(__name__)

class LinkingDataMapper:
    def fetch_and_map_external_performer(self, db: Session, source: str, external_id: str, scrapers: Optional[ScraperGatewayPort] = None) -> Dict[str, Any]:
        """Fetches performer details from external scraper and normalizes fields to a unified format."""
        external_data = {
            "name": None,
            "gender": 0,
            "birthday": None,
            "place_of_birth": None,
            "height": None,
            "measurements": None,
            "ethnicity": None,
            "eye_color": None,
            "hair_color": None,
            "biography": None,
            "aliases": [],
            "images_count": 0,
        }

        if not scrapers:
            return external_data

        source_lower = source.lower()
        if source_lower == "tmdb":
            tmdb_details = None
            try:
                tmdb_client = scrapers.tmdb(db)
                tmdb_details = tmdb_client.get_person_details(int(external_id))
            except Exception as e:
                logger.error(f"Error fetching tmdb details: {e}")

            if tmdb_details:
                external_data["name"] = tmdb_details.get("name")
                external_data["gender"] = tmdb_details.get("gender") or 0
                external_data["birthday"] = tmdb_details.get("birthday")
                external_data["place_of_birth"] = tmdb_details.get("place_of_birth")
                external_data["biography"] = tmdb_details.get("biography")
                external_data["aliases"] = tmdb_details.get("also_known_as") or []
                images = tmdb_details.get("images", {})
                profiles = images.get("profiles", []) if isinstance(images, dict) else []
                external_data["images_count"] = len(profiles)
        else:
            perf = None
            try:
                scraper_name = "porndb" if source_lower == "theporndb" else source_lower
                provider_enum = Provider(scraper_name)
                scraper_client = scrapers.adult(provider_enum, db)
                perf = scraper_client.get_performer_details(external_id)
            except Exception as e:
                logger.error(f"Error fetching adult performer details: {e}")

            if perf:
                external_data["name"] = perf.get("name")
                g = perf.get("gender")
                if g:
                    g_lower = str(g).lower()
                    if "female" in g_lower:
                        external_data["gender"] = 1
                    elif "male" in g_lower:
                        external_data["gender"] = 2
                    else:
                        external_data["gender"] = 0
                external_data["birthday"] = perf.get("birth_date")
                external_data["ethnicity"] = perf.get("ethnicity")
                external_data["eye_color"] = perf.get("eye_color")
                external_data["hair_color"] = perf.get("hair_color")
                h = perf.get("height")
                if h is not None:
                    try:
                        external_data["height"] = int(h)
                    except (ValueError, TypeError) as e:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)
                m = perf.get("measurements")
                if m and isinstance(m, dict):
                    band = m.get("band_size")
                    cup = m.get("cup_size")
                    waist = m.get("waist")
                    hip = m.get("hip")
                    if band and cup and waist and hip:
                        external_data["measurements"] = f"{band}{cup}-{waist}-{hip}"
                external_data["biography"] = perf.get("details")
                external_data["aliases"] = perf.get("aliases") or []
                external_data["images_count"] = len(perf.get("images") or [])

        return external_data
