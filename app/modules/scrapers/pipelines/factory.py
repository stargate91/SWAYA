import inspect
from typing import Optional
from app.core.enums import Provider, ScanMode, MediaType

def get_resolver_pipeline(
    mode: ScanMode,
    mainstream_resolver,
    adult_resolver,
    porndb_movie_resolver,
    include_adult: bool = False,
    provider: Optional[str] = None,
):
    profile = mode.profile
    from app.modules.scrapers.support.registry import ProviderRegistry
    
    m_type = profile.default_media_type
    p_val = ProviderRegistry.get_provider_by_prefix(provider) if provider else Provider(profile.default_provider)

    return get_manual_resolver_pipeline(
        provider=p_val,
        media_type=m_type,
        mainstream_resolver=mainstream_resolver,
        adult_resolver=adult_resolver,
        porndb_movie_resolver=porndb_movie_resolver,
        include_adult=include_adult
    )


def get_manual_resolver_pipeline(
    provider: Provider,
    media_type: str,
    mainstream_resolver,
    adult_resolver,
    porndb_movie_resolver,
    include_adult: bool = False,
):
    normalized_type = str(media_type or '').lower()
    from app.modules.scrapers.support.registry import MediaTypeRegistry
    
    try:
        m_enum = MediaType(normalized_type)
    except ValueError:
        m_enum = MediaType.MOVIE

    cfg = MediaTypeRegistry.get_config(m_enum)
    if cfg:
        pipeline_cls = cfg.get_resolver_pipeline(provider)
        if pipeline_cls:
            sig = inspect.signature(pipeline_cls)
            params = sig.parameters
            
            # Map parameters by name to appropriate constructor arguments
            kwargs = {}
            if "adult_resolver" in params:
                kwargs["adult_resolver"] = adult_resolver
            if "porndb_movie_resolver" in params:
                kwargs["porndb_movie_resolver"] = porndb_movie_resolver
            if "mainstream_resolver" in params:
                kwargs["mainstream_resolver"] = mainstream_resolver
            if "include_adult" in params:
                kwargs["include_adult"] = include_adult
                
            return pipeline_cls(**kwargs)

    # Fallback to mainstream
    from app.modules.scrapers.pipelines.tmdb_omdb import TmdbOmdbResolverPipeline
    return TmdbOmdbResolverPipeline(mainstream_resolver, include_adult)
