from typing import List, Dict, Optional

class ScanProfile:
    """
    Declarative default configuration for a ScanMode.
    
    These are fallback defaults only — actual runtime values come from SystemSettings
    via the existing ScanThresholdConfig keys (e.g. 'min_video_size_mb', 'adult_min_video_size_mb').
    """
    def __init__(
        self,
        id: str,
        name: str,
        pipeline_type: str,
        default_media_type: str,
        default_provider: str,
        default_scrapers: List[str],
        requires_adult: bool = False,
        size_setting_key: str = "min_video_size_mb",
        duration_setting_key: str = "min_video_duration_minutes",
        default_min_size_mb: float = 50.0,
        default_min_duration_minutes: float = 12.0,
        collect_progress_weight: float = 50.0,
    ):
        self.id = id
        self.name = name
        self.pipeline_type = pipeline_type
        self.default_media_type = default_media_type
        self.default_provider = default_provider
        self.default_scrapers = default_scrapers
        self.requires_adult = requires_adult
        self.size_setting_key = size_setting_key
        self.duration_setting_key = duration_setting_key
        self.default_min_size_mb = default_min_size_mb
        self.default_min_duration_minutes = default_min_duration_minutes
        self.collect_progress_weight = collect_progress_weight


class ScanProfileRegistry:
    """Central registry for scan profile defaults."""
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


# ── Built-in defaults (aligned with existing ScanThresholdConfig values) ──

ScanProfileRegistry.register(ScanProfile(
    id="movies_tv",
    name="Movies & TV Shows",
    pipeline_type="mainstream",
    default_media_type="movie",
    default_provider="tmdb",
    default_scrapers=["tmdb", "omdb", "porndb"],
    requires_adult=False,
    size_setting_key="min_video_size_mb",
    duration_setting_key="min_video_duration_minutes",
    default_min_size_mb=50.0,
    default_min_duration_minutes=12.0,
    collect_progress_weight=50.0,
))

ScanProfileRegistry.register(ScanProfile(
    id="scenes",
    name="Scenes & Adult",
    pipeline_type="scene",
    default_media_type="scene",
    default_provider="stashdb",
    default_scrapers=["stashdb", "porndb", "fansdb"],
    requires_adult=True,
    size_setting_key="adult_min_video_size_mb",
    duration_setting_key="adult_min_video_duration_minutes",
    default_min_size_mb=1.0,
    default_min_duration_minutes=1.0,
    collect_progress_weight=50.0,
))

ScanProfileRegistry.register(ScanProfile(
    id="offline",
    name="Offline Local NFO & Metadata",
    pipeline_type="offline",
    default_media_type="video",
    default_provider="manual",
    default_scrapers=[],
    requires_adult=False,
    size_setting_key="min_video_size_mb",
    duration_setting_key="min_video_duration_minutes",
    default_min_size_mb=1.0,
    default_min_duration_minutes=0.1,
    collect_progress_weight=90.0,
))
