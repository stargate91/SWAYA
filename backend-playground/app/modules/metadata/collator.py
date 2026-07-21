from typing import Optional, List, Dict, Any
from app.core.image_resolver import resolve_image_url
from app.modules.metadata.models import MetadataMatch
from app.modules.metadata.schemas import MediaCardDTO, MediaDetailDTO

class MediaCollatorService:
    """
    Unified Single Collator for Swaya.
    Converts ORM MetadataMatch models into clean frontend DTOs (MediaCardDTO & MediaDetailDTO).
    Replaces hundreds of lines of legacy collator boilerplate!
    """

    @staticmethod
    def to_card(match: MetadataMatch) -> MediaCardDTO:
        # 1. Resolve localization or default fallback title
        loc = match.localizations[0] if match.localizations else None
        title = (loc and loc.title) or match.original_title or "Untitled"
        year = match.release_date.year if match.release_date else None
        
        raw_poster = match.raw_poster_source or (loc and (loc.local_poster_path or loc.poster_path))
        raw_backdrop = match.raw_backdrop_source
        poster_url = resolve_image_url(raw_poster, default_placeholder="/static/placeholders/poster.svg")
        backdrop_url = resolve_image_url(raw_backdrop, default_placeholder="/static/placeholders/backdrop.svg")
        
        # 3. Resolve user overrides (if available)
        overrides = match.overrides
        user_rating = overrides.user_rating if overrides else None
        is_favorite = overrides.is_favorite if overrides else False
        is_watched = overrides.is_watched if overrides else False

        return MediaCardDTO(
            id=match.id,
            media_item_id=match.media_item_id,
            title=title,
            year=year,
            media_type=match.media_type,
            availability_type=match.availability_type,
            is_adult=match.is_adult,
            rating=match.rating_tmdb or match.rating_porndb or match.rating_imdb,
            poster_url=poster_url,
            backdrop_url=backdrop_url,
            user_rating=user_rating,
            is_favorite=is_favorite,
            is_watched=is_watched
        )

    @classmethod
    def to_detail(cls, match: MetadataMatch) -> MediaDetailDTO:
        # Start from base card data
        card = cls.to_card(match)
        loc = match.localizations[0] if match.localizations else None
        
        # Extract cast & director
        cast_list = []
        director_name = None
        for link in match.people_links:
            if link.person:
                cast_list.append({
                    "id": link.person.id,
                    "name": link.person.name,
                    "role": link.role.value if hasattr(link.role, "value") else str(link.role),
                    "character": link.character_name,
                    "profile_url": resolve_image_url(link.person.raw_profile_source, "/static/placeholders/avatar.svg")
                })
                role_str = (link.role.value if hasattr(link.role, "value") else str(link.role)).lower()
                if "director" in role_str:
                    director_name = link.person.name

        overrides = match.overrides
        custom_tags = [t.name for t in overrides.tags] if (overrides and overrides.tags) else []

        # Extract technical file info if linked to a physical MediaItem
        file_info = None
        if match.media_item:
            mi = match.media_item
            file_info = {
                "id": mi.id,
                "filename": mi.filename,
                "relative_path": mi.relative_path,
                "size_bytes": mi.size,
                "duration_seconds": mi.duration,
                "resolution": mi.resolution,
                "video_codec": mi.video_codec,
                "audio_codec": mi.audio_codec
            }

        # Resolve stills images
        resolved_stills = [resolve_image_url(s) for s in (match.local_stills or match.stills or [])]

        return MediaDetailDTO(
            **card.model_dump(),
            release_date=match.release_date.strftime("%Y-%m-%d") if match.release_date else None,
            overview=(loc and loc.overview) or "",
            tagline=(loc and loc.tagline) or None,
            runtime=match.runtime,
            vote_count_tmdb=match.vote_count_tmdb,
            vote_count_imdb=match.vote_count_imdb,
            genres=(loc and loc.genres) or [],
            studios=[s.name for s in match.studios],
            director=director_name,
            cast=cast_list,
            stills=resolved_stills,
            provider_ids=match.provider_ids or {},
            user_comment=overrides.user_comment if overrides else None,
            custom_tags=custom_tags,
            file_info=file_info
        )
