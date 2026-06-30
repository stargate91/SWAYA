import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

# Import helpers & normalizers
from app.infrastructure.scrapers.support.normalization.helpers import normalize_tag_names, safe_parse_date
from app.infrastructure.scrapers.support.normalization.tmdb_movie_normalizer import TmdbMovieNormalizer
from app.infrastructure.scrapers.support.normalization.porndb_movie_normalizer import PorndbMovieNormalizer
from app.infrastructure.scrapers.support.normalization.adult_scene_normalizer import AdultSceneNormalizer

logger = logging.getLogger(__name__)

class ScraperNormalizer:
    """
    Central normalization class that processes raw JSON responses from various APIs
    and standardizes them into clean dictionaries matching our internal DB schemas.
    """

    @staticmethod
    def normalize_tmdb_movie(raw: Dict[str, Any], language: str) -> Dict[str, Any]:
        return TmdbMovieNormalizer.normalize(raw, language)

    @staticmethod
    def normalize_porndb_movie(raw: Dict[str, Any]) -> Dict[str, Any]:
        return PorndbMovieNormalizer.normalize(raw)

    @staticmethod
    def normalize_adult_scene(provider: str, raw: Dict[str, Any]) -> Dict[str, Any]:
        return AdultSceneNormalizer.normalize(provider, raw)
