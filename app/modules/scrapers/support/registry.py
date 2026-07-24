import re
import enum
from typing import Dict, List, Optional, Tuple, Any
from app.core.enums import Provider, MediaType

class ProviderCapability(str, enum.Enum):
    PERSON_DETAILS = "person_details"
    PERSON_FILMOGRAPHY = "person_filmography"
    PERSON_ENRICHMENT = "person_enrichment"

class ProviderConfig:
    def __init__(
        self,
        provider: Provider,
        prefix: str,
        is_adult: bool,
        id_pattern: str,
        default_endpoint: Optional[str] = None,
        auth_header_type: Optional[str] = None,
        uses_flat_measurements: bool = False,
        aliases: Optional[List[str]] = None,
        priority: int = 0,
        web_base_url: Optional[str] = None,
        display_name: Optional[str] = None,
        capabilities: Optional[set[ProviderCapability]] = None,
        resolver_loader: Optional[Any] = None,
        scraper_loader: Optional[Any] = None
    ):
        self.provider = provider
        self.prefix = prefix
        self.is_adult = is_adult
        self.id_pattern = re.compile(id_pattern)
        self.default_endpoint = default_endpoint
        self.auth_header_type = auth_header_type  # "ApiKey", "Bearer"
        self.uses_flat_measurements = uses_flat_measurements
        self.aliases = aliases or []
        self.priority = priority
        self.web_base_url = web_base_url
        self.display_name = display_name or prefix.capitalize()
        self.capabilities = capabilities or set()
        self.resolver_loader = resolver_loader
        self.scraper_loader = scraper_loader

class ProviderRegistry:
    _configs: Dict[Provider, ProviderConfig] = {}
    _prefix_map: Dict[str, ProviderConfig] = {}

    @classmethod
    def register(cls, config: ProviderConfig):
        cls._configs[config.provider] = config
        cls._prefix_map[config.prefix] = config
        for alias in config.aliases:
            cls._prefix_map[alias] = config

    @classmethod
    def get_config(cls, provider: Provider) -> Optional[ProviderConfig]:
        return cls._configs.get(provider)

    @classmethod
    def is_valid_prefix(cls, prefix: str) -> bool:
        return prefix.lower() in cls._prefix_map

    @classmethod
    def is_adult_provider(cls, provider: Provider) -> bool:
        config = cls._configs.get(provider)
        return config.is_adult if config else False

    @classmethod
    def get_adult_providers(cls) -> List[Provider]:
        return [p for p, cfg in cls._configs.items() if cfg.is_adult]

    @classmethod
    def get_all_providers(cls) -> List[Provider]:
        return list(cls._configs.keys())

    @classmethod
    def get_provider_by_prefix(cls, prefix: str) -> Optional[Provider]:
        config = cls._prefix_map.get(prefix.lower())
        return config.provider if config else None

    @classmethod
    def resolve_prefix(cls, prefix: str) -> Optional[Provider]:
        """Resolves any prefix or alias to its Provider enum."""
        return cls.get_provider_by_prefix(prefix)

    @classmethod
    def get_all_prefixes(cls) -> List[str]:
        return list(cls._prefix_map.keys())

    @classmethod
    def supports(cls, provider: Provider, capability: ProviderCapability) -> bool:
        cfg = cls._configs.get(provider)
        return cfg is not None and capability in cfg.capabilities

    @classmethod
    def get_providers_with(cls, capability: ProviderCapability) -> List[Provider]:
        return [p for p, cfg in cls._configs.items() if capability in cfg.capabilities]

    @classmethod
    def clean_id(cls, prefixed_id: str) -> Tuple[Provider, str]:
        """
        Parses and validates a prefixed ID string (e.g. 'stashdb_8f93...').
        Returns (Provider, clean_id_value).
        Raises ValueError if format or prefix is invalid.
        """
        if not prefixed_id or "_" not in prefixed_id:
            raise ValueError(f"Invalid prefixed ID format: {prefixed_id}. Expected '{{prefix}}_{{id}}'.")
        
        prefix, val = prefixed_id.split("_", 1)
        prefix_lower = prefix.lower()
        if prefix_lower not in cls._prefix_map:
            raise ValueError(f"Unsupported provider prefix: '{prefix}'.")
        
        config = cls._prefix_map[prefix_lower]
        if not config.id_pattern.match(val):
            raise ValueError(f"Invalid ID format for provider '{config.provider.value}': '{val}'.")
            
        return config.provider, val

    @classmethod
    def build_target_path(cls, media_type: str, provider: Optional[Any], external_id: Optional[Any]) -> Optional[str]:
        """
        Generates standard target paths for library items.
        """
        if not external_id:
            return None

        m_type = str(media_type).lower()
        prov_str = (provider.value if hasattr(provider, "value") else str(provider or "")).lower()
        config = cls._prefix_map.get(prov_str)

        if m_type == "movie":
            prefix = config.prefix if config else "tmdb"
            return f"/library/movie/{prefix}_{external_id}"

        elif m_type in ("tv", "episode", "season"):
            return f"/library/tv/{external_id}"

        elif m_type == "scene":
            prefix = "stash"
            if config:
                prefix = "stash" if "stash" in config.aliases or config.prefix == "stashdb" else config.prefix
            return f"/library/scene/{prefix}_{external_id}"

        elif m_type == "video":
            return f"/library/video/{external_id}"

        elif m_type == "person":
            return f"/library/people/{external_id}"

        return None

# Register default providers
ProviderRegistry.register(ProviderConfig(
    provider=Provider.TMDB,
    prefix="tmdb",
    is_adult=False,
    id_pattern=r"^\d+$",
    priority=4,
    web_base_url="https://www.themoviedb.org",
    display_name="TMDB",
    capabilities={ProviderCapability.PERSON_DETAILS, ProviderCapability.PERSON_FILMOGRAPHY, ProviderCapability.PERSON_ENRICHMENT},
    scraper_loader=lambda: __import__("app.modules.scrapers.providers.tmdb", fromlist=["TMDBScraper"]).TMDBScraper
))
ProviderRegistry.register(ProviderConfig(
    provider=Provider.OMDB,
    prefix="omdb",
    is_adult=False,
    id_pattern=r"^tt\d+$",
    priority=0,
    web_base_url="https://www.omdbapi.com",
    display_name="OMDb",
    scraper_loader=lambda: __import__("app.modules.scrapers.providers.omdb", fromlist=["OMDBScraper"]).OMDBScraper
))
ProviderRegistry.register(ProviderConfig(
    provider=Provider.STASHDB,
    prefix="stashdb",
    is_adult=True,
    id_pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
    default_endpoint="https://stashdb.org/graphql",
    auth_header_type="ApiKey",
    uses_flat_measurements=True,
    aliases=["stash"],
    priority=3,
    web_base_url="https://stashdb.org",
    display_name="StashDB",
    capabilities={ProviderCapability.PERSON_ENRICHMENT, ProviderCapability.PERSON_FILMOGRAPHY, ProviderCapability.PERSON_DETAILS},
    resolver_loader=lambda: __import__("app.modules.scrapers.resolvers.adult.stashdb_resolver", fromlist=["StashDbResolver"]).StashDbResolver,
    scraper_loader=lambda: __import__("app.modules.scrapers.providers.stashdb", fromlist=["StashDBScraper"]).StashDBScraper
))
ProviderRegistry.register(ProviderConfig(
    provider=Provider.FANSDB,
    prefix="fansdb",
    is_adult=True,
    id_pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
    default_endpoint="https://fansdb.cc/graphql",
    auth_header_type="ApiKey",
    uses_flat_measurements=True,
    priority=2,
    web_base_url="https://fansdb.cc",
    display_name="FansDB",
    capabilities={ProviderCapability.PERSON_ENRICHMENT, ProviderCapability.PERSON_FILMOGRAPHY, ProviderCapability.PERSON_DETAILS},
    resolver_loader=lambda: __import__("app.modules.scrapers.resolvers.adult.fansdb_resolver", fromlist=["FansDbResolver"]).FansDbResolver,
    scraper_loader=lambda: __import__("app.modules.scrapers.providers.fansdb", fromlist=["FansDBScraper"]).FansDBScraper
))
ProviderRegistry.register(ProviderConfig(
    provider=Provider.PORNDB,
    prefix="porndb",
    is_adult=True,
    id_pattern=r"^[a-zA-Z0-9\-\_]+$",  # PornDB IDs can be UUIDs, numeric, or alphanumeric slugs
    default_endpoint="https://theporndb.net/graphql",
    auth_header_type="Bearer",
    aliases=["theporndb"],
    priority=1,
    web_base_url="https://theporndb.net",
    display_name="ThePornDB",
    capabilities={ProviderCapability.PERSON_ENRICHMENT, ProviderCapability.PERSON_FILMOGRAPHY, ProviderCapability.PERSON_DETAILS},
    resolver_loader=lambda: __import__("app.modules.scrapers.resolvers.adult.porndb_resolver", fromlist=["PornDbResolver"]).PornDbResolver,
    scraper_loader=lambda: __import__("app.modules.scrapers.providers.porndb", fromlist=["PornDBScraper"]).PornDBScraper
))
ProviderRegistry.register(ProviderConfig(
    provider=Provider.MANUAL,
    prefix="manual",
    is_adult=False,
    id_pattern=r"^[a-zA-Z0-9\-\_]+$",
    priority=0,
    display_name="Manual"
))


class MediaTypeConfig:
    def __init__(
        self,
        media_type: MediaType,
        strictly_adult: bool,
        display_name: str,
        allowed_providers: List[str],
        card_aspect_ratio: str = "poster",
        image_subfolder: str = "posters",
        resolver_pipelines: Optional[Dict[Provider, Any]] = None,
        detail_loader: Optional[Any] = None
    ):
        self.media_type = media_type
        self.strictly_adult = strictly_adult
        self.display_name = display_name
        self.allowed_providers = allowed_providers
        self.card_aspect_ratio = card_aspect_ratio
        self.image_subfolder = image_subfolder
        self._resolver_pipelines = resolver_pipelines or {}
        self.detail_loader = detail_loader

    def get_resolver_pipeline(self, provider: Provider) -> Optional[Any]:
        loader = self._resolver_pipelines.get(provider)
        if loader and not isinstance(loader, type) and callable(loader):
            return loader()
        return loader


class MediaTypeRegistry:
    _configs: Dict[MediaType, MediaTypeConfig] = {}

    @classmethod
    def register(cls, config: MediaTypeConfig):
        cls._configs[config.media_type] = config

    @classmethod
    def get_config(cls, media_type: MediaType) -> Optional[MediaTypeConfig]:
        return cls._configs.get(media_type)

    @classmethod
    def is_strictly_adult(cls, media_type: Any) -> bool:
        try:
            m_enum = media_type if isinstance(media_type, MediaType) else MediaType(str(media_type).lower())
            cfg = cls.get_config(m_enum)
            return cfg.strictly_adult if cfg else False
        except ValueError:
            return False


MediaTypeRegistry.register(MediaTypeConfig(
    media_type=MediaType.MOVIE,
    strictly_adult=False,
    display_name="Movie",
    allowed_providers=["tmdb", "omdb", "porndb"],
    card_aspect_ratio="poster",
    image_subfolder="posters",
    resolver_pipelines={
        Provider.TMDB: lambda: __import__("app.modules.scrapers.pipelines.tmdb_omdb", fromlist=["TmdbOmdbResolverPipeline"]).TmdbOmdbResolverPipeline,
        Provider.OMDB: lambda: __import__("app.modules.scrapers.pipelines.tmdb_omdb", fromlist=["TmdbOmdbResolverPipeline"]).TmdbOmdbResolverPipeline,
        Provider.PORNDB: lambda: __import__("app.modules.scrapers.pipelines.porndb_movie", fromlist=["PornDbMovieResolverPipeline"]).PornDbMovieResolverPipeline,
    },
    detail_loader=lambda db, scrapers, item_id, **kw: __import__("app.modules.library.services.detail.movie_detail_service", fromlist=["MovieDetailService"]).MovieDetailService(db, scrapers).get_library_item_detail(item_id, full_people=kw.get("full_people", False))
))

MediaTypeRegistry.register(MediaTypeConfig(
    media_type=MediaType.TV,
    strictly_adult=False,
    display_name="TV Show",
    allowed_providers=["tmdb"],
    card_aspect_ratio="poster",
    image_subfolder="posters",
    detail_loader=lambda db, scrapers, item_id, **kw: __import__("app.modules.library.services.detail.tv_detail_service", fromlist=["TvDetailService"]).TvDetailService(db, scrapers).get_library_tv_detail(item_id)
))

MediaTypeRegistry.register(MediaTypeConfig(
    media_type=MediaType.SCENE,
    strictly_adult=True,
    display_name="Adult Scene",
    allowed_providers=["stashdb", "porndb", "fansdb"],
    card_aspect_ratio="landscape",
    image_subfolder="scene_stills",
    resolver_pipelines={
        Provider.STASHDB: lambda: __import__("app.modules.scrapers.pipelines.scenes", fromlist=["StashDbSceneResolverPipeline"]).StashDbSceneResolverPipeline,
        Provider.PORNDB: lambda: __import__("app.modules.scrapers.pipelines.scenes", fromlist=["PornDbSceneResolverPipeline"]).PornDbSceneResolverPipeline,
        Provider.FANSDB: lambda: __import__("app.modules.scrapers.pipelines.scenes", fromlist=["FansDbSceneResolverPipeline"]).FansDbSceneResolverPipeline,
    },
    detail_loader=lambda db, scrapers, item_id, **kw: __import__("app.modules.library.services.detail.scene_detail_service", fromlist=["SceneDetailService"]).SceneDetailService(db, scrapers, image_downloader=__import__("app.modules.tasks.image_download_service", fromlist=["ImageDownloadService"]).ImageDownloadService()).get_scene_detail(item_id)
))

MediaTypeRegistry.register(MediaTypeConfig(
    media_type=MediaType.VIDEO,
    strictly_adult=False,
    display_name="Video Clip",
    allowed_providers=["manual"],
    card_aspect_ratio="landscape",
    image_subfolder="scene_stills",
    resolver_pipelines={
        Provider.MANUAL: lambda: __import__("app.modules.scrapers.pipelines.offline", fromlist=["OfflineResolverPipeline"]).OfflineResolverPipeline,
    },
    detail_loader=lambda db, scrapers, item_id, **kw: __import__("app.modules.library.services.detail.scene_detail_service", fromlist=["SceneDetailService"]).SceneDetailService(db, scrapers, image_downloader=__import__("app.modules.tasks.image_download_service", fromlist=["ImageDownloadService"]).ImageDownloadService()).get_scene_detail(item_id)
))
