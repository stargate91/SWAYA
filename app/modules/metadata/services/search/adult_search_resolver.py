import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.enums import Provider
from app.core.date_utils import get_year_from_date
from app.core.gender_utils import map_gender_str_to_int

logger = logging.getLogger(__name__)

PORNDB_API_BASE = "https://api.theporndb.net"
SCRAPER_REQUEST_TIMEOUT = 15


def _provider_source_name(prov_enum: Provider) -> str:
    from app.modules.scrapers.support.registry import ProviderRegistry
    cfg = ProviderRegistry.get_config(prov_enum)
    return cfg.prefix if cfg else prov_enum.value


def _map_performer_gender(gender_val) -> int:
    return map_gender_str_to_int(gender_val)



class AdultSearchResolver:
    def search_metadata(
        self,
        db: Session,
        scrapers: Any,
        query: str,
        item_type: str,
        year: Optional[int],
        prov_enum: Provider,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """Handles searches on adult metadata providers (StashDB, PornDB, FansDB) for movies and scenes."""
        from app.modules.scrapers.support.registry import ProviderRegistry
        scraper = scrapers.get_scraper(prov_enum, db) if ProviderRegistry.is_adult_provider(prov_enum) else None

        if not scraper:
            return []

        if prov_enum == Provider.PORNDB and item_type == "movie":
            try:
                movies = []
                if hasattr(scraper, "search_movies"):
                    try:
                        movies = scraper.search_movies(query, year=year, page=page)
                    except TypeError:
                        movies = scraper.search_movies(query, year=year)
                formatted = []
                for m in movies:
                    poster = (
                        m.get("poster_image")
                        or m.get("poster")
                        or m.get("image")
                    )
                    if not poster and isinstance(m.get("posters"), dict):
                        poster = (
                            m["posters"].get("full")
                            or m["posters"].get("large")
                            or m["posters"].get("medium")
                            or m["posters"].get("small")
                        )
                    backdrop = m.get("background")
                    if not backdrop and isinstance(m.get("backgrounds"), dict):
                        backdrop = (
                            m["backgrounds"].get("full")
                            or m["backgrounds"].get("large")
                            or m["backgrounds"].get("medium")
                            or m["backgrounds"].get("small")
                        )
                    site_data = m.get("site") or {}
                    studio_name = m.get("studio", {}).get("name") if isinstance(m.get("studio"), dict) else (site_data.get("name") or m.get("studio"))
                    formatted.append({
                        "id": m.get("id"),
                        "title": m.get("title"),
                        "original_title": None,
                        "release_date": m.get("date"),
                        "year": get_year_from_date(m.get("date")),
                        "overview": m.get("synopsis") or m.get("description"),
                        "poster_path": poster,
                        "backdrop_path": backdrop,
                        "rating": m.get("rating") or 0.0,
                        "media_type": "movie",
                        "provider": prov_enum.value,
                        "studio": studio_name
                    })
                return formatted
            except Exception as e:
                logger.error(f"Search failed on PornDB movies: {e}")
                return []

        if prov_enum == Provider.PORNDB and item_type in ("scene", "scenes", "adult"):
            try:
                params = {"q": query, "page": page}
                if year:
                    params["year"] = year
                api_token = scraper.get_setting("porndb_api_key") or scraper.get_setting("porndb_api_token")
                headers = {
                    "Authorization": f"Bearer {api_token}",
                    "Accept": "application/json"
                }
                resp = scraper.session.get(f"{PORNDB_API_BASE}/scenes", params=params, headers=headers, timeout=SCRAPER_REQUEST_TIMEOUT)
                if resp.status_code == 200:
                    scenes = resp.json().get("data") or []
                    formatted = []
                    for s in scenes:
                        site_data = s.get("site") or {}
                        posters = s.get("posters")
                        poster = None
                        if isinstance(posters, dict):
                            poster = (
                                posters.get("medium")
                                or posters.get("small")
                                or posters.get("large")
                                or posters.get("full")
                            )
                        if not poster:
                            poster = s.get("poster") or s.get("image") or s.get("face") or s.get("thumbnail")

                        backgrounds = s.get("backgrounds")
                        background = s.get("background")
                        backdrop = None
                        if isinstance(backgrounds, dict):
                            backdrop = (
                                backgrounds.get("large")
                                or backgrounds.get("full")
                                or backgrounds.get("medium")
                            )
                        if not backdrop and isinstance(background, dict):
                            backdrop = (
                                background.get("large")
                                or background.get("full")
                                or background.get("medium")
                            )
                        if not backdrop:
                            backdrop = s.get("image") or poster

                        formatted.append({
                            "id": s.get("id"),
                            "title": s.get("title"),
                            "original_title": None,
                            "release_date": s.get("date"),
                            "year": get_year_from_date(s.get("date")),
                            "overview": s.get("description") or s.get("details"),
                            "poster_path": poster,
                            "backdrop_path": backdrop,
                            "rating": s.get("rating") or 0.0,
                            "media_type": "scene",
                            "provider": prov_enum.value,
                            "studio": site_data.get("name"),
                            "people": [
                                {
                                    "id": f"porndb:{p.get('id')}" if p.get('id') else None,
                                    "name": p.get("name"),
                                    "gender": _map_performer_gender(p.get("gender"))
                                }
                                for p in s.get("performers", [])
                                if isinstance(p, dict) and p.get("name")
                            ]
                        })
                    return formatted
                else:
                    logger.error(f"PornDB REST scenes search failed with status {resp.status_code}")
            except Exception as e:
                logger.error(f"PornDB REST scenes search error: {e}")

        search_query = """
        query SearchScenes($q: String!) {
          searchScene(term: $q) {
            id
            title
            details
            date
            studio {
              id
              name
            }
            images {
              url
            }
            performers {
              performer {
                id
                name
                gender
              }
            }
          }
        }
        """
        try:
            res = scraper.execute_query(search_query, {"q": query})
            scenes = res.get("searchScene", []) if res else []
            if not scenes:
                scenes = []
            
            if year:
                scenes = [s for s in scenes if s.get("date") and str(s.get("date")).startswith(str(year))]

            formatted = []
            for s in scenes:
                studio_data = s.get("studio") or {}
                formatted.append({
                    "id": s.get("id"),
                    "title": s.get("title"),
                    "original_title": None,
                    "release_date": s.get("date"),
                    "year": get_year_from_date(s.get("date")),
                    "overview": s.get("details"),
                    "poster_path": s.get("images", [{}])[0].get("url") if s.get("images") else None,
                    "backdrop_path": None,
                    "rating": s.get("rating") or 0.0,
                    "media_type": "scene",
                    "provider": prov_enum.value,
                    "studio": studio_data.get("name"),
                    "people": [
                        {
                            "id": f"{_provider_source_name(prov_enum)}:{p.get('performer', {}).get('id')}" if p.get('performer', {}).get('id') else None,
                            "name": p.get('performer', {}).get('name'),
                            "gender": _map_performer_gender(p.get('performer', {}).get('gender'))
                        }
                        for p in s.get("performers", [])
                        if isinstance(p, dict) and p.get('performer', {}).get('name')
                    ]
                })
            return formatted
        except Exception as e:
            logger.error(f"Search failed on adult provider {prov_enum.value}: {e}")
            return []

    def search_performers(self, db: Session, scrapers: Any, query: str, prov_enum: Provider, page: int = 1) -> List[Dict[str, Any]]:
        """Handles performer searches on adult metadata providers."""
        scraper = scrapers.get_scraper(prov_enum, db)
        if not scraper:
            return []
        try:
            results = []
            if hasattr(scraper, "search_performers"):
                if prov_enum == Provider.PORNDB:
                    try:
                        results = scraper.search_performers(query, page=page)
                    except TypeError:
                        results = scraper.search_performers(query)
                else:
                    results = scraper.search_performers(query)
            source_name = _provider_source_name(prov_enum)
            formatted = []
            for p in results:
                perf_id = p.get("id")
                if not perf_id:
                    continue
                formatted.append({
                    "id": f"{source_name}:{perf_id}",
                    "title": p.get("name"),
                    "original_title": None,
                    "release_date": None,
                    "year": None,
                    "overview": f"Gender: {p.get('gender', 'Unknown')} | Scenes: {p.get('scene_count', 0)}",
                    "poster_path": p.get("images", [{}])[0].get("url") if p.get("images") else None,
                    "backdrop_path": None,
                    "rating": float(p.get("scene_count") or 0.0),
                    "media_type": "person",
                    "provider": prov_enum.value,
                    "gender": _map_performer_gender(p.get("gender")),
                })
            return formatted
        except Exception as e:
            logger.error(f"Performers search failed on adult provider {prov_enum.value}: {e}")
            return []
