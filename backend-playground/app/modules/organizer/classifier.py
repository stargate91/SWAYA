import re
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

# Keywords that force a video file into the "ExtraFile" category
FORCED_EXTRA_KEYWORDS_MAINSTREAM = re.compile(
    r"\b(sample|samples|extra|extras|trailer|trailers|bonus|featurette|behindthescenes|promo|clip|deleted)\b",
    re.IGNORECASE
)

FORCED_EXTRA_KEYWORDS_ADULT = re.compile(
    r"\b(sample|samples|trailer|trailers)\b",
    re.IGNORECASE
)

# Part / CD Split file regex pattern (e.g. Inception.cd1.avi or movie.pt2.mkv)
PART_NUMBER_PATTERN = re.compile(r"\b(?:cd|dvd|part|pt|disc)\s*([0-9]+)\b", re.IGNORECASE)

# Subtitle language code pattern (e.g. Inception.hu.srt or movie.eng.vtt)
SUBTITLE_LANG_PATTERN = re.compile(r"\.(hu|hun|en|eng|de|ger|fr|fra|es|spa|it|ita|ru|rus|ja|jpn|zh|chs|cht)\.[a-z0-9]+$", re.IGNORECASE)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
SUBTITLE_EXTENSIONS = {".srt", ".vtt", ".ass", ".ssa", ".sub", ".idx"}

class FileClassifier:
    """
    Top-tier Core File Classifier for Swaya (Shared by Library Scanner & File Organizer).
    Inspects file paths, extensions, and names to classify:
    - Main MediaItems vs Forced Extras (Samples, Trailers, Promos)
    - Subtitle Language Codes (e.g. .hu.srt -> "hu")
    - Image Asset Types (poster, backdrop, logo, banner, thumb)
    - CD/Part Numbers (e.g. cd1, part2)
    - Disc Folder Structures (BDMV, VIDEO_TS)
    """

    @classmethod
    def is_forced_extra(cls, file_path: Path, is_adult: bool = False) -> bool:
        """Checks if any parent folder or filename contains extra/sample keywords."""
        path_str = str(file_path).replace("\\", "/").lower()
        pattern = FORCED_EXTRA_KEYWORDS_ADULT if is_adult else FORCED_EXTRA_KEYWORDS_MAINSTREAM
        return bool(pattern.search(path_str))

    @classmethod
    def is_disc_folder(cls, folder_path: Path) -> bool:
        """Detects raw optical disc structures (BDMV or VIDEO_TS)."""
        name = folder_path.name.upper()
        return name in ("BDMV", "VIDEO_TS", "CERTIFICATE")

    @classmethod
    def parse_part_number(cls, file_path: Path) -> Tuple[Optional[int], Optional[int]]:
        """
        Extracts part number from split video filenames (e.g. Inception.cd1.avi -> (1, None)).
        Returns (part_number, total_parts).
        """
        match = PART_NUMBER_PATTERN.search(file_path.name)
        if match:
            try:
                return int(match.group(1)), None
            except ValueError:
                pass
        return None, None

    @classmethod
    def parse_subtitle_language(cls, file_path: Path) -> Optional[str]:
        """
        Extracts language code from subtitle file names.
        1. Fast regex suffix match (.hu.srt, .eng.vtt).
        2. Guessit NLP fallback for full language names (Inception.Hungarian.srt).
        """
        if file_path.suffix.lower() not in SUBTITLE_EXTENSIONS:
            return None
            
        # 1. Fast regex suffix check
        match = SUBTITLE_LANG_PATTERN.search(file_path.name)
        if match:
            lang_code = match.group(1).lower()
            code_map = {"hun": "hu", "eng": "en", "ger": "de", "fra": "fr", "spa": "es", "ita": "it", "rus": "ru", "jpn": "ja"}
            return code_map.get(lang_code, lang_code)

        # 2. Guessit NLP fallback for full language names
        try:
            from guessit import guessit
            guess = guessit(file_path.name)
            lang = guess.get("subtitle_language") or guess.get("language")
            if isinstance(lang, (list, tuple, set)) and len(lang) > 0:
                lang = lang[0]
            if lang:
                return str(getattr(lang, "alpha2", lang)).lower()
        except Exception:
            pass

        return None

    @classmethod
    def categorize_image(cls, file_path: Path) -> str:
        """Categorizes image asset type based on filename conventions."""
        if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
            return "unknown"

        name = file_path.name.lower()
        if any(k in name for k in ("poster", "cover", "front")):
            return "poster"
        if any(k in name for k in ("backdrop", "fanart", "background")):
            return "backdrop"
        if "logo" in name:
            return "logo"
        if "banner" in name:
            return "banner"
        if any(k in name for k in ("thumb", "landscape", "still")):
            return "thumb"
        return "image"

    @classmethod
    def determine_extra_type(cls, file_path: Path) -> str:
        """Determines the specific extra type string (e.g. sample, trailer, featurette)."""
        name = file_path.name.lower()
        if "sample" in name:
            return "sample"
        if "trailer" in name:
            return "trailer"
        if "featurette" in name:
            return "featurette"
        if "behind" in name:
            return "behind_the_scenes"
        if "deleted" in name:
            return "deleted_scenes"
        return "extra"
