import logging
from typing import Any
from sqlalchemy.orm import Session
from app.core.gender_utils import map_gender_str_to_int

logger = logging.getLogger(__name__)

def should_exclude_adult_performer(db: Session, gender: Any, is_adult: bool = True) -> bool:
    """
    Returns True if the performer should be excluded based on the adult_gender_preference setting.
    Handles both integer gender codes (1=female, 2=male) and raw strings.
    """
    if not is_adult:
        return False

    from app.modules.settings.services.settings_service import SettingsService
    gender_pref = SettingsService(db).get_setting("adult_gender_preference") or "all"
    if gender_pref == "all":
        return False

    gender_int = map_gender_str_to_int(gender)

    if gender_pref == "female" and gender_int != 1:
        return True
    if gender_pref == "male" and gender_int != 2:
        return True

    return False

