import logging
from datetime import date, datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

def parse_datetime_utc(value: Any) -> datetime:
    """
    Safely parses a datetime string (handling ISO formats and 'Z' suffix) or object.
    Defaults to the current UTC time if value is empty.
    Raises ValueError if parsing fails.
    """
    if not value:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value
    try:
        normalized = str(value).strip().replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except Exception as e:
        logger.warning(f"Failed to parse datetime value '{value}': {e}")
        raise ValueError(f"Failed to parse datetime value '{value}': {e}") from e

def parse_date(value: Any, formats: Optional[list[str]] = None) -> Optional[date]:
    """
    Safely parses a string, date, or datetime object into a datetime.date object.
    Supports ISO format (YYYY-MM-DD), datetime objects, and optional custom formats.
    """
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        clean_str = value.split("T")[0].strip()
        fmts = formats or ["%Y-%m-%d"]
        for fmt in fmts:
            try:
                return datetime.strptime(clean_str, fmt).date()
            except ValueError:
                pass
    return None


def get_year_from_date(value: Any) -> Optional[int]:
    """
    Safely extracts the year from a string, date, or datetime object.
    Supports partial dates (YYYY-MM-DD, YYYY-MM, or YYYY) and numeric years.
    """
    if not value:
        return None
    if isinstance(value, (date, datetime)):
        return value.year
    if isinstance(value, str):
        try:
            parsed = parse_date(value)
            if parsed:
                return parsed.year
            clean_str = value.split("T")[0].strip()
            first_part = clean_str.split("-")[0].strip()
            if first_part.isdigit() and len(first_part) == 4:
                return int(first_part)
        except Exception:
            pass
    try:
        return int(value)
    except (ValueError, TypeError):
        pass
    return None

def calculate_age_at_release(birthday_str: Optional[Any], release_date_str: Optional[Any]) -> Optional[int]:
    """
    Calculates age at the time of movie/scene release.
    Accepts date strings (e.g. YYYY-MM-DD), date, or datetime objects.
    """
    b_date = parse_date(birthday_str)
    r_date = parse_date(release_date_str)
    if not b_date or not r_date:
        return None
    try:
        age = r_date.year - b_date.year
        if (r_date.month, r_date.day) < (b_date.month, b_date.day):
            age -= 1
        return age
    except Exception as e:
        logger.debug(f"Failed to calculate age at release: {e}", exc_info=True)
        return None


def parse_duration_seconds(value: Any) -> Optional[int]:
    """
    Safely parses a duration value (numeric, float string, or HH:MM:SS / MM:SS string)
    and returns the duration in seconds as an integer.
    """
    if not value:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        val = value.strip()
        if not val:
            return None
        if val.isdigit():
            return int(val)
        if "." in val and val.replace(".", "", 1).isdigit():
            return int(float(val))
        if ":" in val:
            parts = val.split(":")
            try:
                if len(parts) == 2:
                    return int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            except ValueError as e:
                logger.debug(f"Failed parsing colon duration '{value}': {e}", exc_info=True)
    return None
