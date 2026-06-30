import logging
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.domains.people.models import Person, ExternalSourceLink
from app.domains.people.schemas import PersonDetailResponse

logger = logging.getLogger(__name__)

class ProfileMerger:
    def resolve_effective_backdrop(
        self,
        db: Session,
        tmdb_client: Any,
        person: Person,
        override_dict: Optional[Dict[str, Any]],
        known_for: List[Any],
        ui_lang: str
    ) -> Tuple[Optional[str], Optional[int], Optional[str]]:
        """Resolves the most appropriate backdrop image for the performer profile page."""
        effective_backdrop = None
        source_tmdb_id = None
        source_media_type = None

        if override_dict and override_dict.get("custom_backdrop"):
            effective_backdrop = override_dict.get("custom_backdrop")
        elif person.external_ids and (person.external_ids.get("tmdb") or person.external_ids.get("tmdb_id")):
            from app.domains.people.helpers import resolve_person_known_for_backdrop
            effective_backdrop, source_tmdb_id, source_media_type = resolve_person_known_for_backdrop(
                db,
                tmdb_client,
                known_for,
                [ui_lang],
                department=person.known_for_department,
                adult_only=person.is_adult,
                respect_credit_order=True
            )
        return effective_backdrop, source_tmdb_id, source_media_type

    def build_suggested_tags(self, person: Person) -> List[str]:
        """Collects custom category tags from adult provider source metadata."""
        suggested_tags = []
        if person.is_adult:
            for link in person.external_links:
                if link.source_data and isinstance(link.source_data, dict):
                    src_tags = link.source_data.get("tags") or []
                    for t in src_tags:
                        t_name = None
                        if isinstance(t, dict):
                            t_name = t.get("name")
                        elif isinstance(t, str):
                            t_name = t
                        if t_name:
                            t_name = t_name.strip()
                            if t_name and t_name not in suggested_tags:
                                suggested_tags.append(t_name)
        return suggested_tags

    def build_external_ids(self, person: Person) -> Dict[str, Any]:
        """Constructs external IDs payload combining DB sources, links, and actor attributes."""
        external_ids = dict(person.external_ids or {})
        for link in person.external_links:
            prov_key = link.provider.value
            if prov_key not in external_ids:
                external_ids[prov_key] = link.external_id
            alt_key = f"{prov_key}_id" if prov_key != "porndb" else "theporndb_id"
            if alt_key not in external_ids:
                external_ids[alt_key] = link.external_id
        if "tmdb" in external_ids and "tmdb_id" not in external_ids:
            external_ids["tmdb_id"] = external_ids["tmdb"]
        if "stashdb" in external_ids and "stashdb_id" not in external_ids:
            external_ids["stashdb_id"] = external_ids["stashdb"]
        if "porndb" in external_ids and "theporndb_id" not in external_ids:
            external_ids["theporndb_id"] = external_ids["porndb"]
        if "fansdb" in external_ids and "fansdb_id" not in external_ids:
            external_ids["fansdb_id"] = external_ids["fansdb"]
        
        if person.socials:
            for k, v in person.socials.items():
                if v and f"{k}_id" not in external_ids:
                    external_ids[f"{k}_id"] = v
        if "imdb" in external_ids and "imdb_id" not in external_ids:
            external_ids["imdb_id"] = external_ids["imdb"]
        elif "imdb_id" in external_ids and "imdb" not in external_ids:
            external_ids["imdb"] = external_ids["imdb_id"]
        external_ids["attributes"] = {
            **dict(external_ids.get("attributes") or {}),
            **({
                "hair_color": person.hair_color,
                "eye_color": person.eye_color,
                "ethnicity": person.ethnicity,
                "height": person.height,
                "weight": person.weight,
                "measurements": person.measurements,
                "cup_size": person.cup_size,
                "band_size": person.band_size,
                "waist": person.waist,
                "hip": person.hip,
                "breast_type": person.breast_type,
                "tattoos": person.tattoos,
                "piercings": person.piercings,
                "same_sex_only": person.same_sex_only,
            }),
        }
        external_ids["attributes"] = {
            key: value for key, value in external_ids["attributes"].items()
            if value not in (None, "", [], {})
        }
        return external_ids

    def build_external_links(self, person: Person, external_ids: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Assembles fully generated absolute URLs for external database linkages (IMDB, TMDB, StashDB, etc.)."""
        from app.domains.library.services.detail.external_links import generate_external_links
        formatted_links = []
        seen_keys = set()

        for link in person.external_links:
            prov_val = link.provider.value
            prov_lower = prov_val.lower()
            
            helper_ids = {}
            if prov_lower == "stashdb":
                helper_ids["stash_id"] = link.external_id
                helper_ids["source"] = "stash"
            elif prov_lower == "fansdb":
                helper_ids["fansdb_id"] = link.external_id
                helper_ids["source"] = "fansdb"
            elif prov_lower == "porndb":
                helper_ids["porndb_id"] = link.external_id
                helper_ids["source"] = "porndb"
            elif prov_lower == "data18":
                helper_ids["data18_id"] = link.external_id
            
            generated = generate_external_links(helper_ids, "person")
            gen_url = generated[0]["url"] if generated else link.profile_url
            gen_name = generated[0]["name"] if generated else prov_val
            
            formatted_links.append({
                "provider": prov_val,
                "external_id": link.external_id,
                "profile_url": link.profile_url,
                "source_data": link.source_data,
                "name": gen_name,
                "url": gen_url
            })
            seen_keys.add(prov_lower)
            
        merged_ids = dict(external_ids or {})
        links_list = generate_external_links(merged_ids, "person", homepage=person.homepage)
        for l in links_list:
            key_lower = l["key"].lower()
            if key_lower not in seen_keys:
                formatted_links.append({
                    "provider": l["key"],
                    "external_id": l["url"].split("/")[-1],
                    "profile_url": l["url"],
                    "source_data": None,
                    "name": l["name"],
                    "url": l["url"]
                })
                seen_keys.add(key_lower)

        return formatted_links
