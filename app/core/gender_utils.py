from typing import Any

def map_gender_str_to_int(gender_val: Any) -> int:
    """
    Safely maps raw string values (e.g., "female", "male", "shemale") or integer/string codes 
    into standard application gender integers:
    - 1: Female (includes Trans Female, Shemale, Ladyboy, etc.)
    - 2: Male (includes Trans Male, Transman, etc.)
    - 0: Unknown / Not Specified
    """
    if gender_val in (1, "1"):
        return 1
    if gender_val in (2, "2"):
        return 2
    
    gender_str = str(gender_val or "").upper().strip()
    if not gender_str:
        return 0
        
    # Trans Female / MtF mapping
    female_keywords = {"FEMALE", "WOMAN", "SHEMALE", "TGIRL", "LADYBOY", "FUTA", "TS"}
    if any(kw in gender_str for kw in female_keywords):
        return 1
        
    # Trans Male / FtM mapping
    male_keywords = {"MALE", "MAN"}
    if any(kw in gender_str for kw in male_keywords):
        return 2
        
    return 0
