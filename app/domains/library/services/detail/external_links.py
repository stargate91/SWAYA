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

    # 3. Adult scraper links (StashDB, FansDB, PornDB, Data18)
    stash_id = external_ids.get("stash_id") or external_ids.get("stashdb_id")
    if stash_id:
        source = external_ids.get("source") or ""
        source = source.lower()
        if source == "fansdb":
            if mt == "scene":
                add_link("fansdb", "FansDB", f"https://fansdb.cc/scenes/{stash_id}")
            elif mt == "person":
                add_link("fansdb", "FansDB", f"https://fansdb.cc/performers/{stash_id}")
        elif source in ("porndb", "theporndb"):
            if mt == "scene":
                add_link("porndb", "ThePornDB", f"https://theporndb.net/scenes/{stash_id}")
            elif mt == "person":
                add_link("porndb", "ThePornDB", f"https://theporndb.net/performers/{stash_id}")
            elif mt == "movie":
                add_link("porndb", "ThePornDB", f"https://theporndb.net/movies/{stash_id}")
        else:
            if mt == "scene":
                add_link("stashdb", "StashDB", f"https://stashdb.org/scenes/{stash_id}")
            elif mt == "person":
                add_link("stashdb", "StashDB", f"https://stashdb.org/performers/{stash_id}")
            elif mt == "movie":
                add_link("stashdb", "StashDB", f"https://stashdb.org/movies/{stash_id}")

    # Direct FansDB link
    fansdb_id = external_ids.get("fansdb_id")
    if fansdb_id:
        if mt == "person":
            add_link("fansdb", "FansDB", f"https://fansdb.cc/performers/{fansdb_id}")
        elif mt == "scene":
            add_link("fansdb", "FansDB", f"https://fansdb.cc/scenes/{fansdb_id}")

    # Direct PornDB/ThePornDB link
    porndb_id = external_ids.get("porndb_id") or external_ids.get("theporndb_id")
    if porndb_id:
        if mt == "person":
            add_link("porndb", "ThePornDB", f"https://theporndb.net/performers/{porndb_id}")
        elif mt == "scene":
            add_link("porndb", "ThePornDB", f"https://theporndb.net/scenes/{porndb_id}")
        elif mt == "movie":
            add_link("porndb", "ThePornDB", f"https://theporndb.net/movies/{porndb_id}")

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
