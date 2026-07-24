import re
from typing import Iterable, Set

def normalize_tag(tag: str) -> str:
    if not tag:
        return ""
    return re.sub(r'[^a-z0-9]', '', tag.lower())

TAG_SYNONYMS = {
    "bisexual": {"bisexual", "bisexuals", "bi", "bisex", "bisexuality"},
    "gay": {"gay", "gays", "maleonmale", "mm", "homosexual", "homosexuals", "homosexuality", "gaypornography", "boyonboy", "twink", "twinks"},
    "transgender": {
        "transgender", "transgenders", "transgendered", "transgenderism", "trans",
        "transexual", "transexuals", "transsexual", "transsexuals", "shemale", "shemales", "ts",
        "transwomen", "transwoman", "transgenderwomen", "transgenderwoman", "transfem",
        "transontrans", "transonfemale", "transsexuality", "transpornography", "translesbian",
        "tranimal", "tranimals", "tranny", "trannies", "tgirl", "tgirls", "ladyboy", "ladyboys",
        "crossdresser", "crossdressing", "sissy", "futa", "futanari", "transman", "transmen", "transmale"
    },
    "cuckold": {"cuckold", "cuckolds", "cuckolding", "cuck", "cucks", "cuckoldress", "bull", "hotwife"},
    "group sex": {"groupsex", "group", "orgy", "orgies", "threesome", "foursome", "gangbang", "gangbangs"},
    "gangbang": {"gangbang", "gangbanging", "gangbangs", "creampiegangbang", "reversegangbang"},
    "hentai": {"hentai", "ecchi", "anime", "cartoon", "cartoons", "doujinshi", "2d"},
    "parody": {"parody", "parodies", "spoof", "spoofs"},
    "anal": {"anal", "analsex", "analcreampie", "firstanal", "doubleanal", "anals"},
    "bdsm": {"bdsm", "sadomasochism", "bondage", "sm", "domination", "submission", "bondages", "submissive", "dominant"},
    "feet": {"feet", "foot", "footfetish", "footjob", "footjobs"},
    "pregnant": {"pregnant", "pregnancy", "preg", "preggo", "impregnation", "impregnated"},
    "cartoon": {"cartoon", "cartoons", "animated", "animation", "anime", "hentai"},
    "anime": {"anime", "hentai", "cartoon", "cartoons"},
    "fetish": {"fetish", "fetishes", "sexualfetish"},
    "ebony": {"ebony", "black", "blackwoman", "blackwomen", "blackgirl", "blackgirls"},
    "black man": {"blackman", "blackmen", "bbc", "bigblackcock"},
    "black woman": {"blackwoman", "blackwomen", "ebony", "blackgirl", "blackgirls"},
    "asian": {"asian", "asians", "oriental", "japanese", "chinese", "korean"},
    "latina": {"latina", "latinas", "hispanic", "latin"},
    "interracial": {"interracial", "interracialsex", "ir"},
    "straight": {"straight", "hetero", "heterosexual"},
    "dp": {"dp", "doublepenetration", "dped", "doubledrilling"},
    "facial": {"facial", "facials", "facialcumshot", "cumface", "cumonface", "cumonherface", "cumontoface", "cumonmouth", "cumshotfacial", "facialize", "facecumshot"},
    "bigdick": {"bigdick", "bigcock", "bigcocks", "bigdicks", "bigpenis", "fatcock", "fatdick", "largecock", "largedick", "longcock", "longdick", "hung"},
    "bbc": {"bbc", "bigblackcock", "bigblackdick", "bigblackdong", "bbcworship", "bigblackcockworship"},
    "pegging": {"pegging", "pegged", "strapon", "straponsex", "femdomanal"},
}

def expand_tags(tag_set: Iterable[str]) -> Set[str]:
    normalized_set = {normalize_tag(t) for t in tag_set if t}
    expanded = set(normalized_set)
    for tag in normalized_set:
        for key, syn_set in TAG_SYNONYMS.items():
            norm_key = normalize_tag(key)
            if tag == norm_key or tag in syn_set:
                expanded.update(syn_set)
                expanded.add(norm_key)
    return expanded

def has_word_match(text: str, word_set: Set[str]) -> bool:
    if not word_set or not text:
        return False
    words = re.findall(r'[a-zA-Z0-9]+', text)
    for w in words:
        norm_w = normalize_tag(w)
        if not norm_w:
            continue
        if norm_w in word_set:
            return True
        for b_word in word_set:
            if len(b_word) >= 4:
                if norm_w.startswith(b_word) or (len(norm_w) >= 4 and b_word.startswith(norm_w)):
                    return True
    return False

def get_expanded_blacklist(settings) -> Set[str]:
    """
    Retrieves the raw adult_tag_blacklist setting, parses it, and expands it with synonyms.
    """
    blacklist_setting = settings.get_setting("adult_tag_blacklist") or ""
    return expand_tags({t.strip() for t in blacklist_setting.split(",") if t.strip()})

