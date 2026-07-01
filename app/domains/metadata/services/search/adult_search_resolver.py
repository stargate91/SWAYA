import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.shared_kernel.enums import Provider

logger = logging.getLogger(__name__)

PORNDB_API_BASE = "https://api.theporndb.net"
SCRAPER_REQUEST_TIMEOUT = 15


def _provider_source_name(prov_enum: Provider) -> str:
    if prov_enum == Provider.PORNDB:
        return "theporndb"
    return prov_enum.value


def _map_performer_gender(gender_val) -> int:
    if gender_val in (1, "1"):
        return 1
    if gender_val in (2, "2"):
        return 2
    gender_str = str(gender_val or "").upper()
    if "FEMALE" in gender_str:
        return 1
    if "MALE" in gender_str:
        return 2
    if gender_str:
        return 3
    return 0


class AdultSearchResolver:
    def search_metadata(
        self,
        db: Session,
        scrapers: Any,
        query: str,
        item_type: str,
        year: Optional[int],
        prov_enum: Provider
    ) -> List[Dict[str, Any]]:
        """Handles searches on adult metadata providers (StashDB, PornDB, FansDB) for movies and scenes."""
        scraper = None
        if prov_enum == Provider.STASHDB:
            scraper = scrapers.adult(Provider.STASHDB, db)
        elif prov_enum == Provider.PORNDB:
            scraper = scrapers.adult(Provider.PORNDB, db)
        elif prov_enum == Provider.FANSDB:
            scraper = scrapers.adult(Provider.FANSDB, db)

        if not scraper:
            return []

        if prov_enum == Provider.PORNDB and item_type == "movie":
            try:
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
                        "year": int(str(m["date"]).split("-")[0]) if m.get("date") else None,
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
                params = {"q": query}
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
                            "year": int(str(s["date"]).split("-")[0]) if s.get("date") else None,
                            "overview": s.get("description") or s.get("details"),
                            "poster_path": poster,
                            "backdrop_path": backdrop,
                            "rating": s.get("rating") or 0.0,
                            "media_type": "scene",
                            "provider": prov_enum.value,
                            "studio": site_data.get("name")
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
                    "year": int(s["date"].split("-")[0]) if s.get("date") else None,
                    "overview": s.get("details"),
                    "poster_path": s.get("images", [{}])[0].get("url") if s.get("images") else None,
                    "backdrop_path": None,
                    "rating": s.get("rating") or 0.0,
                    "media_type": "scene",
                    "provider": prov_enum.value,
                    "studio": studio_data.get("name")
                })
            return formatted
        except Exception as e:
            logger.error(f"Search failed on adult provider {prov_enum.value}: {e}")
            return []

    def search_performers(self, db: Session, scrapers: Any, query: str, prov_enum: Provider) -> List[Dict[str, Any]]:
        """Handles performer searches on adult metadata providers."""
        scraper = scrapers.adult(prov_enum, db)
        if not scraper:
            return []
        try:
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
