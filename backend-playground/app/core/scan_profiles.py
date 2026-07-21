from typing import List, Dict, Optional, Any

class ScanProfile:
    """
    Declarative Scanning & Matching Strategy Profile.
    Replaces hardcoded ScanMode Enum logic with extensible configuration.
    """
    def __init__(
        self,
        id: str,
        name: str,
        pipeline_type: str,
        scrapers: List[str],
        requires_adult: bool = False,
        parse_nfo: bool = True,
        auto_match: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.name = name
        self.pipeline_type = pipeline_type
        self.scrapers = scrapers
        self.requires_adult = requires_adult
        self.parse_nfo = parse_nfo
        self.auto_match = auto_match
        self.metadata = metadata or {}

class ScanProfileRegistry:
    """Central registry for all active scan profiles (extensible at runtime)."""
    _profiles: Dict[str, ScanProfile] = {}

    @classmethod
    def register(cls, profile: ScanProfile):
        cls._profiles[profile.id] = profile

    @classmethod
    def get(cls, profile_id: str) -> Optional[ScanProfile]:
        return cls._profiles.get(profile_id)

    @classmethod
    def list_all(cls) -> List[ScanProfile]:
        return list(cls._profiles.values())

# Register built-in default scan profiles
ScanProfileRegistry.register(ScanProfile(
    id="movies_tv",
    name="Movies & TV Shows",
    pipeline_type="mainstream",
    scrapers=["tmdb", "omdb"],
    requires_adult=False
))

ScanProfileRegistry.register(ScanProfile(
    id="scenes",
    name="Scenes & Adult",
    pipeline_type="scene",
    scrapers=["stashdb", "porndb", "fansdb"],
    requires_adult=True
))

ScanProfileRegistry.register(ScanProfile(
    id="anime",
    name="Anime & OVA",
    pipeline_type="anime",
    scrapers=["anilist", "mal", "anidb"],
    requires_adult=False
))

ScanProfileRegistry.register(ScanProfile(
    id="jav",
    name="JAV & Asian Content",
    pipeline_type="scene",
    scrapers=["r18", "porndb"],
    requires_adult=True
))

ScanProfileRegistry.register(ScanProfile(
    id="offline",
    name="Offline Local NFO & Metadata",
    pipeline_type="offline",
    scrapers=[],
    requires_adult=False
))
