import logging
import math
import json as _json
from collections import Counter
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.shared_kernel.enums import Provider as ProviderEnum, MediaType
from app.domains.metadata.models import MetadataMatch

logger = logging.getLogger(__name__)


class AdultDiscoveryService:
    def __init__(self, db: Session, settings_port):
        self.db = db
        self.settings = settings_port

    def get_adult_discovery(self, provider: str) -> List[Dict[str, Any]]:
        api_key = self.settings.get_setting(f"{provider}_api_key")
        if not api_key:
            return []

        from app.infrastructure.cache.cache_service import CacheService
        cache_srv = CacheService()
        
        provider_enum = ProviderEnum(provider.lower())
        cache_key = f"adult_discovery_{provider}"
        
        # Try to load from cache
        cached_data = cache_srv.get(provider_enum, cache_key)
        
        raw_scenes = []
        if cached_data and isinstance(cached_data, dict) and "scenes" in cached_data:
            raw_scenes = cached_data["scenes"]
        else:
            # Query trending scenes from the scraper gateway
            from app.infrastructure.scrapers.support.gateway import scraper_gateway
            try:
                scraper = scraper_gateway.adult(provider_enum, self.db)
            except Exception as e:
                logger.error(f"Failed to get {provider} scraper: {e}")
                return []

            query = """
            query QueryScenes($input: SceneQueryInput!) {
              queryScenes(input: $input) {
                scenes {
                  id
                  title
                  date
                  details
                  studio {
                    id
                    name
                  }
                  images {
                    url
                    width
                    height
                  }
                  tags {
                    id
                    name
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
            }
            """
            variables = {
                "input": {
                  "page": 1,
                  "per_page": 100,
                  "direction": "DESC",
                  "sort": "TRENDING"
                }
            }
            
            try:
                res_data = scraper.execute_query(query, variables)
                if res_data and "queryScenes" in res_data:
                    raw_scenes = res_data["queryScenes"].get("scenes") or []
                    # Cache the raw list of scenes (expired in 24 hours)
                    cache_srv.set(provider_enum, cache_key, {"scenes": raw_scenes}, ttl_seconds=86400)
            except Exception as e:
                logger.error(f"Failed to query discovery from {provider}: {e}")
                return []

        if not raw_scenes:
            return []

        # 1. Fetch user's local tag preferences using TF-IDF weighted scoring
        tag_weights = {}
        # Tags that describe appearance/demographics/meta — not actual content preferences
        noise_keywords = {
            # Hair
            "brown hair", "blond hair", "blonde hair", "black hair", "red hair",
            "brunette", "blonde", "brown hair (female)", "brown hair (male)",
            "blond hair (female)", "black hair (female)", "red hair (female)",
            "long hair", "short hair", "straight hair", "wavy hair", "curly hair",
            # Body descriptors
            "tattoos", "tattoo", "piercings", "piercing", "nose piercing", "navel piercing",
            "natural tits", "fake boobs", "big tits", "small tits", "big breasts", "medium tits",
            "big ass", "small ass", "medium ass", "athletic", "athletic woman", "slim",
            "shaved", "hairy", "tall", "short", "petite", "chubby", "bbw", "average body",
            "big dick", "innie pussy", "outie pussy", "hairless pussy", "trimmed pussy",
            "tan lines", "freckles", "gauges",
            # Eye color
            "brown eyes", "blue eyes", "green eyes", "hazel eyes",
            # Skin/ethnicity/nationality
            "white woman", "white man", "pale skin", "medium skin", "dark skin",
            "american", "european", "latina woman", "asian", "asian woman",
            # Production/meta
            "hd available", "4k available",
            "indoors", "outdoors", "professional production", "pornstar",
            "bedroom", "living room", "home", "bathroom",
            "nude", "barefoot", "no bra", "no condom",
            # Clothing that's not a preference
            "panties", "thong", "lingerie", "dress", "skirt", "short skirt",
            "tank top", "strapless top", "blouse", "sandals", "casual wear",
            "stockings", "choker", "necklace", "headband", "leash", "bondage collar",
            # Gender labels
            "male - pov", "straight", "twosome",
            # Too generic
            "narrative", "3rd person narrative", "taboo",
            "step brother", "step sister",
            # Height/body variants with gender suffix
            "short woman", "tall woman", "short man", "tall man",
            # Hair (male)
            "short hair (male)", "bald (male)",
            # Footwear/accessories
            "woman's heels", "high heels", "boots", "sneakers",
            # Generic sex position labels that are too broad
            "twosome (straight)", "threesome (bgg)", "threesome (bbg)",
            # Caught/voyeur meta
            "caught", "voyeur",
            # Age bracket labels
            "teen (18-22)", "teen girl (18-22)", "teen boy (18-22)", "milf (30+)",
            # Other noise
            "orgasm", "kissing", "rubbing", "moaning", "dirty talk",
            "cum in mouth", "cum swapping", "swallowing",
            "adorable", "slutty", "upskirt",
            "puppy play", "breast play", "dick play",
            "missing performer (male)",
        }
        try:
            # Build tag frequency from metadata_matches.suggested_tags
            tag_counter = Counter()
            tag_rating_sum = {}
            tag_rating_count = {}
            total_scenes = 0

            sql = """
                SELECT mm.suggested_tags, uo.user_rating
                FROM metadata_matches mm
                LEFT JOIN user_overrides uo ON uo.media_item_id = mm.media_item_id
                WHERE mm.is_adult = 1
                  AND mm.suggested_tags IS NOT NULL
                  AND mm.media_item_id IS NOT NULL
            """
            rows = self.db.execute(text(sql)).fetchall()
            for r in rows:
                total_scenes += 1
                tags_json = r[0]
                user_rating = r[1]
                tags = _json.loads(tags_json) if tags_json else []
                for tag in tags:
                    t_name = (tag.get("name") if isinstance(tag, dict) else str(tag)).lower()
                    if t_name:
                        tag_counter[t_name] += 1
                        if user_rating is not None:
                            tag_rating_sum[t_name] = tag_rating_sum.get(t_name, 0) + user_rating
                            tag_rating_count[t_name] = tag_rating_count.get(t_name, 0) + 1

            # Frequency-based: high library count = strong preference
            # Noise is handled by the noise_keywords set, not by IDF
            for t_name, count in tag_counter.items():
                if t_name in noise_keywords:
                    continue  # Skip noise entirely
                avg_rating = (tag_rating_sum.get(t_name, 0) / tag_rating_count[t_name]) if tag_rating_count.get(t_name) else 4.0
                weight = math.log2(1 + count) * avg_rating
                if weight > 0:
                    tag_weights[t_name] = weight

            # Keep only top 50 signal tags for scoring
            if len(tag_weights) > 50:
                top_entries = sorted(tag_weights.items(), key=lambda x: x[1], reverse=True)[:50]
                tag_weights = dict(top_entries)

        except Exception as e:
            logger.error(f"Failed to fetch library tag weights: {e}")

        # 2. Fetch local library matches for this provider to filter out already owned scenes
        matches = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == provider_enum,
            MetadataMatch.media_item_id.isnot(None)
        ).all()
        in_library_ids = {m.external_id for m in matches}

        # 3. Filter and score scenes
        scored_scenes = []
        for s in raw_scenes:
            sid = s.get("id")
            if not sid or sid in in_library_ids:
                continue

            # Calculate preference score: sum of matching signal-tag weights
            scene_tags = s.get("tags") or []
            score = 0
            for t_item in scene_tags:
                t_name = t_item.get("name") if isinstance(t_item, dict) else t_item
                if t_name:
                    score += tag_weights.get(t_name.lower(), 0)

            scored_scenes.append((score, s))

        # Sort by score desc
        scored_scenes.sort(key=lambda x: x[0], reverse=True)
        top_scenes = [item[1] for item in scored_scenes[:20]]

        # 4. Map to RecommendationItem schema format
        # Build external-ID → local Person ID lookup for performer links
        all_performer_ids = set()
        for s in top_scenes:
            for p_outer in (s.get("performers") or []):
                p = p_outer.get("performer")
                if p and p.get("id"):
                    all_performer_ids.add(p["id"])

        ext_to_local = {}
        if all_performer_ids:
            try:
                from app.domains.people.models import ExternalSourceLink
                links = self.db.query(
                    ExternalSourceLink.person_id,
                    ExternalSourceLink.external_id
                ).filter(
                    ExternalSourceLink.provider == provider_enum,
                    ExternalSourceLink.external_id.in_(list(all_performer_ids))
                ).all()
                for person_id, external_id in links:
                    ext_to_local[str(external_id)] = person_id
            except Exception as e:
                logger.error(f"Failed to query ExternalSourceLink for discovery lookup: {e}")

        result = []
        from app.domains.media_assets.services.images import image_processing_service
        for s in top_scenes:
            images = s.get("images") or []
            poster_url = images[0].get("url") if images else None
            img_width = images[0].get("width") if images else None
            img_height = images[0].get("height") if images else None
            
            resolved_img = image_processing_service.resolve_image_url(poster_url, "posters") if poster_url else None
            
            studio_name = s.get("studio", {}).get("name") if s.get("studio") else None
            
            performers_list = []
            raw_performers = s.get("performers") or []
            for p_outer in raw_performers:
                p = p_outer.get("performer")
                if p:
                    p_gender = p.get("gender")
                    gender_int = None
                    if p_gender:
                        p_gender_str = str(p_gender).upper()
                        gender_int = 1 if "FEMALE" in p_gender_str else (2 if "MALE" in p_gender_str else None)
                    ext_id = str(p.get("id", ""))
                    local_id = ext_to_local.get(ext_id)
                    performers_list.append({
                        "id": local_id if local_id is not None else f"{provider}:{ext_id}",
                        "name": p.get("name"),
                        "gender": gender_int,
                    })
            
            result.append({
                "id": f"{provider}_{s.get('id')}",
                "title": s.get("title") or "Unknown",
                "media_type": "scene",
                "in_library": False,
                "media_item_id": None,
                "poster_path": resolved_img,
                "backdrop_path": resolved_img,
                "release_date": s.get("date"),
                "overview": s.get("details") or studio_name,
                "is_adult": True,
                "image_width": img_width,
                "image_height": img_height,
                "people": performers_list,
                "source": provider,
            })
            
        return result
