import json
from typing import Optional, Union, List

def normalize_episode_numbers(episode_number: Union[int, float, str, list]) -> List[int]:
    """
    Normalizes an episode number input (string, list, number) into a sorted list of integers.
    Handles JSON arrays, comma-separated lists, dash ranges, and plain numbers.
    """
    if episode_number is None:
        return []
        
    if isinstance(episode_number, (int, float)):
        return [int(episode_number)]
        
    if isinstance(episode_number, list):
        nums = []
        for n in episode_number:
            try:
                nums.append(int(float(n)))
            except (ValueError, TypeError):
                pass
        return sorted(list(set(nums)))

    if isinstance(episode_number, str):
        trimmed = episode_number.strip()
        if not trimmed:
            return []

        if trimmed.startswith('[') and trimmed.endswith(']'):
            try:
                parsed = json.loads(trimmed)
                return normalize_episode_numbers(parsed)
            except Exception:
                return []

        if ',' in trimmed:
            try:
                return normalize_episode_numbers([x.strip() for x in trimmed.split(',')])
            except Exception:
                pass

        if '-' in trimmed:
            try:
                parts = [int(x.strip()) for x in trimmed.split('-') if x.strip().lstrip('-').isdigit()]
                if len(parts) >= 2:
                    # Return all integers in the range
                    return list(range(parts[0], parts[-1] + 1))
                return parts
            except Exception:
                pass

        try:
            return [int(float(trimmed))]
        except Exception:
            return []

    return []

def format_episode_code(season_number: Optional[Union[int, str]], episode_number: Optional[Union[int, str, list]]) -> Optional[str]:
    """
    Formats a full episode code like S01E05 or S02E01-03.
    """
    if season_number is None or str(season_number).strip() == "":
        return None
    try:
        s_val = int(season_number)
    except (ValueError, TypeError):
        return None

    s_str = f"S{s_val:02d}"
    normalized = normalize_episode_numbers(episode_number)
    if not normalized:
        return s_str
    if len(normalized) == 1:
        return f"{s_str}E{normalized[0]:02d}"
    
    first = f"{normalized[0]:02d}"
    last = f"{normalized[-1]:02d}"
    return f"{s_str}E{first}-{last}"
