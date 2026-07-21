import logging
import math
import json as _json
from collections import Counter
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.enums import Provider as ProviderEnum, MediaType
from app.modules.metadata.models import MetadataMatch

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
        focus_tag = self.settings.get_setting(f"adult_{provider.lower()}_focus_tag") or ""
        
        cache_key = f"adult_discovery_{provider}"
        if focus_tag:
            cache_key = f"adult_discovery_{provider}_{focus_tag.lower().replace(' ', '_')}"
        
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
            # If focus tag is set, fetch the tag ID from the provider first
            resolved_tag_id = None
            if focus_tag:
                tag_query = """
                query QueryTags($input: TagQueryInput!) {
                  queryTags(input: $input) {
                    tags {
                      id
                      name
                    }
                  }
                }
                """
                try:
                    tag_res = scraper.execute_query(tag_query, {"input": {"name": focus_tag, "page": 1, "per_page": 5}})
                    if tag_res and "queryTags" in tag_res:
                        tags_list = tag_res["queryTags"].get("tags") or []
                        # Find exact name match or fallback to first
                        matched_tag = next((t for t in tags_list if t.get("name").lower() == focus_tag.lower()), None)
                        if not matched_tag and tags_list:
                            matched_tag = tags_list[0]
                        if matched_tag:
                            resolved_tag_id = matched_tag.get("id")
                except Exception as e:
                    logger.error(f"Failed to resolve focus tag ID for '{focus_tag}': {e}")

            variables = {
                "input": {
                  "page": 1,
                  "per_page": 100,
                  "direction": "DESC",
                  "sort": "TRENDING"
                }
            }
            if resolved_tag_id:
                # StashDB/FansDB supports tags filter as a MultiIDCriterionInput
                variables["input"]["tags"] = {
                    "value": [resolved_tag_id],
                    "modifier": "INCLUDES"
                }
            elif focus_tag:
                # If focus_tag was set but tag ID could not be resolved, return empty to prevent invalid query
                return []
            
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
        noise_keywords_raw = {
            # Locations (generic house parts)
            "bedroom", "living room", "home", "bathroom",
            # Generic/Too broad labels
            "narrative", "3rd person narrative", "taboo", "step brother", "step sister",
            "missing performer (male)",
            # Dick size / BBC (always noise, handled with synonyms)
            "big dick", "bbc"
        }

        from app.domains.recommendations.services.tag_safety import normalize_tag, expand_tags, has_word_match

        # Expand noise keywords using synonym mappings
        noise_keywords = expand_tags(noise_keywords_raw)

        if not focus_tag:
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
                # Noise is handled by the expanded noise_keywords set
                for t_name, count in tag_counter.items():
                    norm_t = normalize_tag(t_name)
                    if norm_t in noise_keywords:
                        continue  # Skip noise entirely
                    avg_rating = (tag_rating_sum.get(t_name, 0) / tag_rating_count[t_name]) if tag_rating_count.get(t_name) else 4.0
                    weight = math.log2(1 + count) * avg_rating
                    if weight > 0:
                        tag_weights[norm_t] = weight

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

        # 3. Fetch blacklist settings
        blacklist_setting = self.settings.get_setting("adult_tag_blacklist") or ""

        blacklist = expand_tags({t.strip() for t in blacklist_setting.split(",") if t.strip()})

        # 4. Filter and score scenes
        scored_scenes = []
        for s in raw_scenes:
            sid = s.get("id")
            if not sid or sid in in_library_ids:
                continue

            scene_tags = s.get("tags") or []
            scene_tag_names = {
                normalize_tag(t_item.get("name") if isinstance(t_item, dict) else t_item)
                for t_item in scene_tags
                if (t_item.get("name") if isinstance(t_item, dict) else t_item)
            }

            scene_title = f"{s.get('title') or ''} {s.get('details') or ''}"

            # A. Blacklist check: discard item if it contains any blacklisted tag or keyword
            if blacklist and (any(b_tag in scene_tag_names for b_tag in blacklist) or has_word_match(scene_title, blacklist)):
                continue

            # Calculate preference score: sum of matching signal-tag weights
            score = 0
            for t_name in scene_tag_names:
                score += tag_weights.get(t_name, 0)

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
                from app.modules.people.models import ExternalSourceLink
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
