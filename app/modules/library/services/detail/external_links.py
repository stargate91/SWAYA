from typing import List, Dict, Any, Optional

def generate_external_links(external_ids: Dict[str, Any], media_type: str, homepage: Optional[str] = None) -> List[Dict[str, str]]:
    links = []
    if not external_ids:
        external_ids = {}
        
    mt = media_type.lower() if media_type else ""
    if mt == "people":
        mt = "person"

    def add_link(key: str, name: str, url: str):
        if not any(x["key"] == key for x in links):
            links.append({"key": key, "name": name, "url": url})

    # 1. TMDB Links
    tmdb_id = external_ids.get("tmdb") or external_ids.get("tmdb_id")
    if tmdb_id:
        if mt == "movie":
            add_link("tmdb", "TMDB", f"https://www.themoviedb.org/movie/{tmdb_id}")
        elif mt == "tv":
            add_link("tmdb", "TMDB", f"https://www.themoviedb.org/tv/{tmdb_id}")
        elif mt == "person":
            add_link("tmdb", "TMDB", f"https://www.themoviedb.org/person/{tmdb_id}")

    # 2. IMDb Links
    imdb_id = external_ids.get("imdb") or external_ids.get("imdb_id")
    if imdb_id:
        if mt in ("movie", "tv", "scene"):
            add_link("imdb", "IMDb", f"https://www.imdb.com/title/{imdb_id}")
        elif mt == "person":
            add_link("imdb", "IMDb", f"https://www.imdb.com/name/{imdb_id}")

    # 3. Dynamic adult/mainstream provider links from Registry
    from app.modules.scrapers.support.registry import ProviderRegistry
    for provider in ProviderRegistry.get_all_providers():
        cfg = ProviderRegistry.get_config(provider)
        if not cfg or not cfg.web_base_url:
            continue

        keys_to_try = [cfg.prefix] + cfg.aliases
        if cfg.prefix == "stashdb":
            keys_to_try.append("stash")

        source = (external_ids.get("source") or "").lower()
        resolved_source = ProviderRegistry.resolve_prefix(source)

        prov_id = None
        if resolved_source == provider:
            prov_id = external_ids.get("stash_id") or external_ids.get("stashdb_id")

        if not prov_id:
            for k in keys_to_try:
                prov_id = external_ids.get(f"{k}_id") or external_ids.get(k)
                if prov_id:
                    break

        if prov_id:
            if mt == "scene":
                add_link(cfg.prefix, cfg.display_name, f"{cfg.web_base_url}/scenes/{prov_id}")
            elif mt == "person":
                add_link(cfg.prefix, cfg.display_name, f"{cfg.web_base_url}/performers/{prov_id}")
            elif mt == "movie" and cfg.prefix != "tmdb":
                add_link(cfg.prefix, cfg.display_name, f"{cfg.web_base_url}/movies/{prov_id}")

    # Data18
    data18_id = external_ids.get("data18_id")
    if data18_id:
        if mt == "person":
            add_link("data18", "Data18", f"https://www.data18.com/star/{data18_id}")
        elif mt in ("movie", "scene"):
            add_link("data18", "Data18", f"https://www.data18.com/scenes/{data18_id}")

    # 4. Social media links
    for key, name, domain in [
        ("instagram", "Instagram", "https://instagram.com/"),
        ("facebook", "Facebook", "https://facebook.com/"),
        ("twitter", "Twitter", "https://twitter.com/")
    ]:
        val = external_ids.get(f"{key}_id") or external_ids.get(key)
        if val:
            val_clean = str(val).split("/")[-1]
            if val_clean:
                add_link(key, name, f"{domain}{val_clean}")

    # 5. Homepage / Website
    if homepage:
        add_link("website", "Website", homepage)

    return links
