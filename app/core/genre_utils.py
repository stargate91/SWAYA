def split_genres(genres: list[str]) -> list[str]:
    result = []
    seen_keys = set()

    genre_aliases = {
        "scifi": "Sci-Fi",
        "sciencefiction": "Sci-Fi",
        "sciencefictionfantasy": "Sci-Fi & Fantasy",
        "actionadventure": "Action & Adventure",
    }

    def _canonicalize_genre_label(raw_genre: str) -> str:
        cleaned = str(raw_genre or "").strip()
        if not cleaned:
            return ""

        normalized_key = "".join(ch for ch in cleaned.casefold() if ch.isalnum())
        alias = genre_aliases.get(normalized_key)
        if alias:
            return alias

        if len(cleaned) == 1:
            return cleaned.upper()
        return cleaned[0].upper() + cleaned[1:]

    for g in genres:
        if not g:
            continue

        target_g = _canonicalize_genre_label(g)

        parts = [target_g]
        for sep in [" & ", " and ", " és ", " / ", "/", ";", ","]:
            if sep in target_g:
                parts = target_g.split(sep)
                break
        
        for part in parts:
            part_clean = _canonicalize_genre_label(part)
            if not part_clean:
                continue

            part_key = "".join(ch for ch in part_clean.casefold() if ch.isalnum())
            if part_key in seen_keys:
                continue

            seen_keys.add(part_key)
            result.append(part_clean)
    return result
