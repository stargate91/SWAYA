from datetime import datetime
from typing import Optional, Dict, Any, List
from app.core.date_utils import parse_date

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
    parsed = parse_date(date_str)
    if parsed:
        return datetime(parsed.year, parsed.month, parsed.day)
    return None

