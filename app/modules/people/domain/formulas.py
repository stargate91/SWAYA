import logging
from typing import Optional, Any
from datetime import timedelta
from app.core.date_utils import parse_date

logger = logging.getLogger(__name__)

def calculate_underage_threshold(birthday: Any) -> Optional[Any]:
    """
    Safely calculates the 18 years + 14 days child protection threshold date.
    Handles leap years (February 29 births).
    """
    dt = parse_date(birthday)
    if not dt:
        return None

    try:
        try:
            threshold = dt.replace(year=dt.year + 18)
        except ValueError:
            # Leap year birth -> map to Feb 28 of target year
            threshold = dt.replace(year=dt.year + 18, day=28)
        return threshold + timedelta(days=14)
    except Exception:
        return None

def calculate_butt_size(height: Any, waist: Any, hip: Any) -> Optional[str]:
    """
    Calculates the butt size classification (SMALL, MEDIUM, BIG, EXTRA_BIG)
    based on height, waist, and hip measurements.
    """
    if height is None or waist is None or hip is None:
        return None
    try:
        w_in = float(waist)
        if w_in >= 50:
            w_in /= 2.54
        h_in = float(hip)
        if h_in >= 50:
            h_in /= 2.54

        height_in = float(height) / 2.54
        if height_in <= 0 or h_in <= 0 or w_in <= 0:
            return None

        fah = h_in / (height_in * 0.53)
        whr = w_in / h_in
        ccf = 0.72 / whr
        bcs = h_in * fah * ccf

        if bcs < 33:
            return "SMALL"
        elif bcs < 40:
            return "MEDIUM"
        elif bcs < 50:
            return "BIG"
        else:
            return "EXTRA_BIG"
    except (ValueError, TypeError, ZeroDivisionError) as e:
        logger.debug(f"Failed to calculate butt size: {e}", exc_info=True)
        return None

def calculate_breast_size(cup_size: Any, band_size: Any, height: Any) -> Optional[str]:
    """
    Calculates the breast size classification (SMALL, MEDIUM, BIG, EXTRA_BIG)
    based on cup size, band size, and height measurements.
    """
    if not cup_size or not band_size:
        return None
    try:
        cup_str = str(cup_size).strip().upper()
        cup_map = {
            "A": 1, "B": 2, "C": 3, "D": 4, "DD": 5, "E": 5,
            "DDD": 6, "F": 6, "DDDD": 7, "G": 7, "H": 8, "I": 9, "J": 10, "K": 11
        }
        cup_val = cup_map.get(cup_str, 0)
        if cup_val == 0:
            if cup_str.startswith("A"):
                cup_val = 1
            elif cup_str.startswith("B"):
                cup_val = 2
            elif cup_str.startswith("C"):
                cup_val = 3
            elif cup_str.startswith("D"):
                cup_val = 4
            elif "E" in cup_str:
                cup_val = 5
            elif "F" in cup_str:
                cup_val = 6
            elif "G" in cup_str:
                cup_val = 7
            elif "H" in cup_str:
                cup_val = 8
            else:
                cup_val = 4

        band_val = float(band_size)
        height_val = float(height) if height is not None else 165.0

        index = cup_val + (band_val - 32.0) * 0.5 - (height_val - 165.0) * 0.05

        if index < 2.5:
            return "SMALL"
        elif index < 4.5:
            return "MEDIUM"
        elif index < 6.5:
            return "BIG"
        else:
            return "EXTRA_BIG"
    except (ValueError, TypeError) as e:
        logger.debug(f"Failed to calculate breast size: {e}", exc_info=True)
        return None

def is_underage_performer(birthday: Any) -> bool:
    """
    Returns True if the performer is underage (under 18 years + 14 days child protection threshold).
    """
    from datetime import date
    threshold = calculate_underage_threshold(birthday)
    if threshold:
        return threshold > date.today()
    return False

