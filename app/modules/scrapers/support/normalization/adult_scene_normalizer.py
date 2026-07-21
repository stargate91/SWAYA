import logging
from typing import Dict, Any, Optional
from app.modules.scrapers.support.normalization.helpers import safe_parse_date, normalize_tag_names

logger = logging.getLogger(__name__)

class AdultSceneNormalizer:
    @staticmethod
    def normalize(provider: str, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes raw adult scene payloads from StashDB, PornDB, or FansDB.
        Standardizes schemas (REST vs GraphQL) to a single internal format.
        """
        title = "Unknown Scene"
        overview = None
        release_date = None
        rating_val = None
        backdrop_url = None
        poster_url = None
        studio_data = None
        performers_raw = []
        tags_raw = []
        
        def image_variant(value: Any) -> Optional[str]:
            if isinstance(value, str):
                return value
            if isinstance(value, dict):
                return next((v for v in (value.get("full"), value.get("large"), value.get("medium"), value.get("small")) if v), None)
            return None

        def first_image_url(images: Any) -> Optional[str]:
            if isinstance(images, list) and images:
                first = images[0]
                if isinstance(first, dict):
                    return first.get("url") or image_variant(first)
                if isinstance(first, str):
                    return first
            return None

        def safe_parse_duration(val: Any) -> Optional[int]:
            if val is None:
                return None
            if isinstance(val, (int, float)):
                return int(val)
            if isinstance(val, str):
                val = val.strip()
                if not val:
                    return None
                if val.isdigit():
                    return int(val)
                parts = val.split(":")
                try:
                    if len(parts) == 2:
                        return int(parts[0]) * 60 + int(parts[1])
                    elif len(parts) == 3:
                        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                except ValueError as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            return None

        duration_val = None
        # 1. Extract based on Stash-compatible GraphQL schema (StashDB & FansDB/PornDB GraphQL)
        if "findScene" in raw or "id" in raw:
            scene = raw.get("findScene") or raw
            title = scene.get("title") or "Unknown Scene"
            overview = scene.get("details") or scene.get("description")
            release_date = safe_parse_date(scene.get("date"))
            
            rating_val = (scene.get("rating_porndb") if scene.get("rating_porndb") is not None else scene.get("rating")) if provider == "porndb" else None
            duration_val = safe_parse_duration(scene.get("duration"))
            
            # Images
            images = scene.get("images") or []
            poster_url_temp = (
                image_variant(scene.get("posters"))
                or scene.get("poster_image")
                or scene.get("poster")
                or scene.get("image")
                or first_image_url(images)
            )
            backdrop_url = (
                image_variant(scene.get("background"))
                or image_variant(scene.get("background_back"))
                or scene.get("back_image")
                or scene.get("image")
                or first_image_url(images)
                or poster_url_temp
            )
            poster_url = poster_url_temp
            
            studio_data = scene.get("studio") or scene.get("site")
            performers_raw = [
                p.get("performer") or p
                for p in (scene.get("performers") or [])
                if isinstance(p, dict) and (p.get("performer") or p.get("name"))
            ]
            tags_raw = scene.get("tags") or []

        # 2. Extract based on standard REST schemas (PornDB/FansDB REST if returned in 'data')
        elif "data" in raw:
            scene = raw["data"]
            title = scene.get("title") or "Unknown Scene"
            overview = scene.get("description") or scene.get("details")
            release_date = safe_parse_date(scene.get("date"))
            rating_val = (scene.get("rating_porndb") if scene.get("rating_porndb") is not None else scene.get("rating")) if provider == "porndb" else None
            duration_val = safe_parse_duration(scene.get("duration"))
            poster_url_temp = image_variant(scene.get("posters")) or scene.get("poster_image") or scene.get("poster") or scene.get("image")
            backdrop_url = image_variant(scene.get("background")) or image_variant(scene.get("background_back")) or scene.get("back_image") or scene.get("image") or poster_url_temp
            poster_url = poster_url_temp
            studio_data = scene.get("studio") or scene.get("site")
            performers_raw = scene.get("performers") or []
            tags_raw = scene.get("tags") or []

        # Normalize Studio details
        studios = []
        if studio_data and studio_data.get("name"):
            s_logo = (
                studio_data.get("image_path")
                or studio_data.get("logo")
                or studio_data.get("image")
                or studio_data.get("poster")
            )
            if not s_logo and studio_data.get("images"):
                s_logo = studio_data["images"][0].get("url")

            parent = None
            parent_data = studio_data.get("parent") or studio_data.get("network")
            if parent_data and parent_data.get("name"):
                p_logo = (
                    parent_data.get("image_path")
                    or parent_data.get("logo")
                    or parent_data.get("image")
                    or parent_data.get("poster")
                )
                if not p_logo and parent_data.get("images"):
                    p_logo = parent_data["images"][0].get("url")
                parent = {
                    "name": parent_data["name"],
                    "logo_path": p_logo
                }

            studios.append({
                "name": studio_data["name"],
                "logo_path": s_logo,
                "parent": parent
            })

        # Normalize Performers
        performers = []
        for cast_member in performers_raw:
            if not isinstance(cast_member, dict):
                continue
            
            cast_extra = cast_member.get("extra") or cast_member.get("extras") or {}
            if not isinstance(cast_extra, dict):
                cast_extra = {}
            cast_member["extra"] = cast_extra

            parent_member = cast_member.get("parent")
            if isinstance(parent_member, dict):
                parent_extra = parent_member.get("extra") or parent_member.get("extras") or {}
                if not isinstance(parent_extra, dict):
                    parent_extra = {}
                
                for key in ["image", "face", "photo", "image_path", "images", "gender", "hair_color", "eye_color", "ethnicity", "height", "weight", "measurements"]:
                    val = parent_member.get(key) or parent_extra.get(key)
                    if cast_member.get(key) is None and val is not None:
                        cast_member[key] = val
                
                for e_key, e_val in parent_extra.items():
                    if cast_member["extra"].get(e_key) is None:
                        cast_member["extra"][e_key] = e_val

            p_name = cast_member.get("name")
            if not p_name:
                continue
            
            p_gender = (
                cast_member.get("gender") or 
                cast_member["extra"].get("gender") or 
                ""
            )
            p_gender = str(p_gender).upper()
            gender_int = 1 if "FEMALE" in p_gender else (2 if "MALE" in p_gender else None)
            
            p_image = cast_member.get("image_path") or cast_member.get("image") or cast_member.get("photo")
            if not p_image and cast_member.get("images"):
                p_image = cast_member["images"][0].get("url")

            # Extract measurements
            measurements = cast_member.get("measurements")
            if isinstance(measurements, dict):
                parts = []
                band = measurements.get("band_size")
                cup = measurements.get("cup_size")
                bust = f"{band}{cup}" if band or cup else ""
                if bust:
                    parts.append(bust)
                waist = measurements.get("waist")
                if waist:
                    parts.append(str(waist))
                hip = measurements.get("hip")
                if hip:
                    parts.append(str(hip))
                measurements = "-".join(parts) if parts else None

            extra = cast_member.get("extra") or {}
            performer_details = {
                "hair_color": cast_member.get("hair_color") or cast_member.get("hair") or extra.get("haircolor") or extra.get("hair_color") or extra.get("hair"),
                "eye_color": cast_member.get("eye_color") or cast_member.get("eye") or extra.get("eyecolor") or extra.get("eye_color") or extra.get("eye") or extra.get("eye_colour"),
                "ethnicity": cast_member.get("ethnicity") or extra.get("ethnicity"),
                "height": cast_member.get("height") or extra.get("height"),
                "scene_count": cast_member.get("scene_count"),
                "rating_porndb": cast_member.get("rating_porndb") or cast_member.get("rating"),
                "weight": cast_member.get("weight") or extra.get("weight"),
                "measurements": measurements or extra.get("measurements"),
                "career_start_year": cast_member.get("career_start_year"),
                "career_end_year": cast_member.get("career_end_year"),
                "deathday": cast_member.get("death_date") or cast_member.get("deathday"),
                "place_of_birth": cast_member.get("country")
            }

            performers.append({
                "name": p_name,
                "profile_path": p_image,
                "gender": gender_int,
                "is_adult": True,
                "tmdb_id": None,
                "character": None,
                "performer_details": performer_details,
                "provider": provider,
                "external_id": str(
                    parent_member.get("id")
                    if isinstance(parent_member, dict) and parent_member.get("id")
                    else cast_member.get("id")
                ) if (cast_member.get("id") or (isinstance(parent_member, dict) and parent_member.get("id"))) else None,
                "urls": cast_member.get("urls") or []
            })

        # Main match fields
        match_data = {
            "imdb_id": None,
            "original_title": title,
            "release_date": release_date,
            "runtime": duration_val,
            "popularity": None,
            "rating_porndb": float(rating_val) if provider == "porndb" and rating_val is not None and float(rating_val) > 0 else None,
            "is_adult": True,
            "backdrop_path": backdrop_url,
            "suggested_tags": normalize_tag_names(tags_raw),
            "raw_metadata": raw,
            "fetched_locales": ["en"]
        }

        # Localization fields
        localization = {
            "title": title,
            "tagline": None,
            "overview": overview,
            "poster_path": poster_url or backdrop_url,
            "genres": []
        }

        return {
            "match": match_data,
            "localization": localization,
            "studios": studios,
            "collection": None,
            "performers": performers
        }
