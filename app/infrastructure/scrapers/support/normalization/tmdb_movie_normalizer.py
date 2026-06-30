from typing import Dict, Any
from app.infrastructure.scrapers.support.normalization.helpers import safe_parse_date

class TmdbMovieNormalizer:
    @staticmethod
    def normalize(raw: Dict[str, Any], language: str) -> Dict[str, Any]:
        """Normalizes raw TMDB movie payload."""
        match_data = {
            "imdb_id": raw.get("imdb_id"),
            "original_title": raw.get("original_title"),
            "release_date": safe_parse_date(raw.get("release_date")),
            "runtime": raw.get("runtime"),
            "popularity": raw.get("popularity"),
            "rating_tmdb": raw.get("vote_average"),
            "vote_count_tmdb": raw.get("vote_count"),
            "budget": raw.get("budget"),
            "revenue": raw.get("revenue"),
            "release_status": raw.get("status"),
            "is_adult": raw.get("adult", False),
            "backdrop_path": raw.get("backdrop_path"),
            "raw_metadata": raw,
            "fetched_locales": [language]
        }

        localization = {
            "title": raw.get("title") or raw.get("original_title") or "Unknown",
            "tagline": raw.get("tagline"),
            "overview": raw.get("overview"),
            "poster_path": raw.get("poster_path"),
            "genres": [g["name"] for g in raw.get("genres") or []]
        }

        studios = []
        for comp in raw.get("production_companies") or []:
            if comp.get("name"):
                studios.append({
                    "name": comp["name"],
                    "logo_path": comp.get("logo_path"),
                    "parent": None
                })

        collection = None
        belongs_to_collection = raw.get("belongs_to_collection")
        if belongs_to_collection:
            collection = {
                "external_id": str(belongs_to_collection["id"]),
                "name": belongs_to_collection.get("name"),
                "poster_path": belongs_to_collection.get("poster_path"),
                "backdrop_path": belongs_to_collection.get("backdrop_path")
            }

        performers = []
        credits = raw.get("credits") or {}
        for cast_member in credits.get("cast") or []:
            performers.append({
                "name": cast_member.get("name"),
                "profile_path": cast_member.get("profile_path"),
                "gender": cast_member.get("gender"),
                "is_adult": False,
                "tmdb_id": str(cast_member["id"]),
                "character": cast_member.get("character"),
                "performer_details": None,
                "known_for_department": cast_member.get("known_for_department")
            })

        return {
            "match": match_data,
            "localization": localization,
            "studios": studios,
            "collection": collection,
            "performers": performers
        }
