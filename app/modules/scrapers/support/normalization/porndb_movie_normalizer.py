import re
from typing import Dict, Any, Optional

class PorndbMovieNormalizer:
    @staticmethod
    def normalize(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes a PornDB Movies API SceneResource as an adult movie."""
        from app.modules.scrapers.support.normalization.adult_scene_normalizer import AdultSceneNormalizer
        movie = dict(raw or {})

        def image_variant(value: Any) -> Optional[str]:
            if isinstance(value, str):
                return value
            if isinstance(value, dict):
                return (
                    value.get("full")
                    or value.get("large")
                    or value.get("medium")
                    or value.get("small")
                )
            return None

        poster = (
            movie.get("image")
            or movie.get("poster_image")
            or movie.get("poster")
            or image_variant(movie.get("posters"))
        )
        backdrop = None

        site = movie.get("site") or {}
        if site.get("name") and not movie.get("studio"):
            movie["studio"] = {
                "name": site["name"],
                "logo": (
                    site.get("logo")
                    or site.get("image")
                    or image_variant(site.get("images"))
                ),
                "parent": site.get("parent"),
            }

        movie["background"] = backdrop
        movie["posters"] = {"large": poster} if poster else {}
        norm = AdultSceneNormalizer.normalize("porndb", {"data": movie})
        norm["match"]["backdrop_path"] = backdrop

        duration = movie.get("duration")
        try:
            norm["match"]["runtime"] = max(1, round(float(duration) / 60)) if duration else None
        except (TypeError, ValueError):
            norm["match"]["runtime"] = None

        links = movie.get("links") or {}
        imdb_value = next(
            (
                value
                for key, value in links.items()
                if str(key).casefold() in ("imdb", "imdb.com") and value
            ),
            None,
        )
        imdb_match = re.search(r"tt\d{7,10}", str(imdb_value or ""))
        norm["match"]["imdb_id"] = imdb_match.group(0) if imdb_match else None
        norm["match"]["raw_metadata"] = raw
        norm["localization"]["poster_path"] = poster
        return norm
