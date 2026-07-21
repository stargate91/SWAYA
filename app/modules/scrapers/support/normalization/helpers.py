from datetime import datetime
from typing import Optional, Dict, Any, List

def normalize_tag_names(raw_tags: Any) -> List[str]:
    names: Dict[str, str] = {}
    for entry in raw_tags or []:
        if isinstance(entry, str):
            name = entry
        elif isinstance(entry, dict):
            nested = entry.get("tag")
            name = entry.get("name") or (nested.get("name") if isinstance(nested, dict) else None)
        else:
            name = None

        normalized = str(name or "").strip()
        if normalized:
            names.setdefault(normalized.casefold(), normalized)
    return list(names.values())

def safe_parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Safely parse date strings from APIs into datetime objects."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str[:10], "%Y-%m-%d")
        except ValueError:
            continue
    return None
