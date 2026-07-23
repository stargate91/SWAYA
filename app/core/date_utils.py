import logging
from datetime import date, datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

def parse_date(value: Any) -> Optional[date]:
    """
    Safely parses a string, date, or datetime object into a datetime.date object.
    Supports ISO format (YYYY-MM-DD) or datetime objects.
    """
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.strptime(value.split("T")[0].strip(), "%Y-%m-%d").date()
        except ValueError:
            pass
    return None

def calculate_age_at_release(birthday_str: Optional[str], release_date_str: Optional[str]) -> Optional[int]:
    """
    Calculates age at the time of movie/scene release.
    Accepts date strings (e.g. YYYY-MM-DD) or datetime objects.
    """
    if not birthday_str or not release_date_str:
        return None
    try:
        # Convert to string and slice just in case we get a string or datetime
        b_str = str(birthday_str)[:10].strip()
        r_str = str(release_date_str)[:10].strip()
        
        b_date = datetime.strptime(b_str, "%Y-%m-%d")
        r_date = datetime.strptime(r_str, "%Y-%m-%d")
        
        age = r_date.year - b_date.year
        if (r_date.month, r_date.day) < (b_date.month, b_date.day):
            age -= 1
        return age
    except Exception as e:
        logger.debug(f"Failed to calculate age at release: {e}", exc_info=True)
        return None
