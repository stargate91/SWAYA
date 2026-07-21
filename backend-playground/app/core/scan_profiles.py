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
        min_size_mb: float = 50.0,
        min_duration_minutes: float = 12.0,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.name = name
        self.pipeline_type = pipeline_type
        self.scrapers = scrapers
        self.requires_adult = requires_adult
        self.parse_nfo = parse_nfo
        self.auto_match = auto_match
        self.min_size_mb = min_size_mb
        self.min_duration_minutes = min_duration_minutes
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
    requires_adult=False,
    min_size_mb=50.0,
    min_duration_minutes=12.0
))

ScanProfileRegistry.register(ScanProfile(
    id="scenes",
    name="Scenes & Adult",
    pipeline_type="scene",
    scrapers=["stashdb", "porndb", "fansdb"],
    requires_adult=True,
    min_size_mb=1.0,
    min_duration_minutes=1.0
))

ScanProfileRegistry.register(ScanProfile(
    id="anime",
    name="Anime & OVA",
    pipeline_type="anime",
    scrapers=["anilist", "mal", "anidb"],
    requires_adult=False,
    min_size_mb=30.0,
    min_duration_minutes=3.0
))

ScanProfileRegistry.register(ScanProfile(
    id="jav",
    name="JAV & Asian Content",
    pipeline_type="scene",
    scrapers=["r18", "porndb"],
    requires_adult=True,
    min_size_mb=10.0,
    min_duration_minutes=1.0
))

ScanProfileRegistry.register(ScanProfile(
    id="offline",
    name="Offline Local NFO & Metadata",
    pipeline_type="offline",
    scrapers=[],
    requires_adult=False,
    min_size_mb=1.0,
    min_duration_minutes=0.0
))
