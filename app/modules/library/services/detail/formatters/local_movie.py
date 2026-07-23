import logging
from typing import Any
from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse

from app.core.enums import Provider, MediaType
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch, MediaCollection
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.core.language import LanguageService
from app.core.genre_utils import split_genres as _split_genres
from app.modules.library.schemas import MovieDetailResponse
from app.modules.library.services.detail.formatters.base import MovieDetailFormatter
from app.modules.library.services.detail.detail_mixins import OverrideResolver, PlaybackResolver, ExternalLinksBuilder

logger = logging.getLogger(__name__)

class LocalMovieFormatter(MovieDetailFormatter):
    def __init__(self):
        super().__init__()
        from app.modules.library.services.detail.formatters.movie.local_credits_formatter import LocalCreditsFormatter
        from app.modules.library.services.detail.formatters.movie.local_metadata_resolver import LocalMetadataResolver
        self.credits_formatter = LocalCreditsFormatter()
        self.metadata_resolver = LocalMetadataResolver()

    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        try:
            item_id_int = int(item_id)
        except ValueError:
            return JSONResponse(status_code=400, content={"error": "Invalid item ID"})
        
        item = db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MetadataMatch.localizations),
            joinedload(MediaItem.matches).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.parent).joinedload(MetadataMatch.localizations),
            joinedload(MediaItem.matches).joinedload(MetadataMatch.studios),
            joinedload(MediaItem.matches).joinedload(MetadataMatch.collection).joinedload(MediaCollection.localizations),
            joinedload(MediaItem.extras),
            joinedload(MediaItem.playback_logs),
            joinedload(MediaItem.overrides),
        ).filter(MediaItem.id == item_id_int).first()
        
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})
        
        active_match = next((m for m in item.matches if m.media_item_id == item.id and m.is_active), None)
        if not active_match:
            active_match = next((m for m in item.matches if m.media_item_id == item.id), None)
        if not active_match and item.matches:
            active_match = item.matches[0]
            
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        loc = LanguageService.get_best_localization(active_match.localizations, ui_lang) if active_match else None
        
        cast, directors, writers = self.credits_formatter.format_credits(
            db=db,
            active_match=active_match,
            current_uid=current_uid,
            resolve_img_fn=self._resolve_img
        )
        
        technical = {
            "resolution": item.resolution,
            "video_codec": item.video_codec,
            "audio_codec": item.audio_codec,
            "audio_channels": item.audio_channels,
            "hdr_type": item.hdr_type,
            "bit_depth": item.bit_depth,
            "framerate": item.framerate,
            "duration": item.duration,
            "size_bytes": item.size,
            "source": item.source.value if hasattr(item.source, "value") else str(item.source),
            "edition": item.edition.value if hasattr(item.edition, "value") else str(item.edition),
            "audio_type": item.audio_type.value if hasattr(item.audio_type, "value") else str(item.audio_type),
        }
        
        metadata_override, physical_override = OverrideResolver.resolve_overrides(
            db, current_uid, match=active_match, media_item_id=item.id
        )

        override = metadata_override or item.overrides or physical_override
            
        title = (override.custom_title if (override and override.custom_title) else None) or (loc.title if loc else item.filename)
        overview = (override.custom_overview if (override and override.custom_overview) else None) or (loc.overview if loc else None)
        
        collection_data = None
        if active_match and active_match.collection:
            col = active_match.collection
            col_loc = LanguageService.get_best_localization(col.localizations, ui_lang) if col.localizations else None
            collection_data = {
                "tmdb_id": int(col.external_id) if col.external_id.isdigit() else col.id,
                "title": col_loc.title if col_loc else "Collection",
                "poster_path": self._resolve_img(col_loc.local_poster_path or col_loc.poster_path if col_loc else None, "posters"),
                "backdrop_path": self._resolve_img(col.local_backdrop_path or col.backdrop_path, "backdrops"),
            }

        keywords_list, trailer_key = self.metadata_resolver.resolve_keywords_and_trailer(
            db=db,
            active_match=active_match,
            loc=loc,
            scrapers=scrapers,
            ui_lang=ui_lang
        )

        extras_list = [
            {
                "id": ex.id,
                "name": ex.filename,
                "path": ex.current_path,
                "category": ex.category.value if hasattr(ex.category, "value") else str(ex.category),
                "subtype": ex.subtype.value if (ex.subtype and hasattr(ex.subtype, "value")) else (str(ex.subtype) if ex.subtype else None),
                "language": ex.language,
            }
            for ex in item.extras
        ] if item.extras else []

        is_watched, watch_count, resume_position, last_watched_at_dt = OverrideResolver.merge_watch_state(
            metadata_override=metadata_override, physical_override=physical_override,
            fallback_override=override
        )

        playback_logs = [
            {"id": log.id, "watched_at": log.watched_at.isoformat()}
            for log in sorted(item.playback_logs or [], key=lambda x: x.watched_at, reverse=True)
        ]

        suggested_tags = active_match.suggested_tags if (active_match and active_match.suggested_tags) else keywords_list

        tv_title = None
        still_path = None
        season_number = None
        episode_number = None
        if active_match and active_match.media_type == MediaType.EPISODE:
            season_number = active_match.season_number
            episode_number = active_match.episode_number
            still_path = active_match.local_still_path or active_match.still_path
            
            # Resolve parent show title
            tv_match = None
            if active_match.parent and active_match.parent.parent:
                tv_match = active_match.parent.parent
            elif active_match.parent:
                tv_match = active_match.parent
            if tv_match:
                tv_loc = LanguageService.get_best_localization(tv_match.localizations, ui_lang) if tv_match.localizations else None
                tv_title = tv_loc.title if tv_loc else tv_match.original_title

        result = {
            "id": item.id,
            "title": title,
            "tv_title": tv_title,
            "episode_title": title,
            "still_path": self._resolve_img(still_path, "stills") if still_path else None,
            "season_number": season_number,
            "episode_number": episode_number,
            "keywords": keywords_list,
            "trailer_key": trailer_key,
            "extras": extras_list,
            "logo_path": self._resolve_img(override.custom_logo if (override and override.custom_logo) else (loc.logo_path if loc else None), "logos"),
            "original_title": active_match.original_title if active_match else None,
            "tagline": loc.tagline if loc else None,
            "overview": overview,
            "genres": _split_genres(loc.genres) if (loc and loc.genres) else [],
            "year": active_match.release_date.year if (active_match and active_match.release_date) else None,
            "release_date": active_match.release_date.isoformat() if (active_match and active_match.release_date) else None,
            "runtime": active_match.runtime if active_match else None,
            "rating_tmdb": active_match.rating_tmdb if (active_match and active_match.rating_tmdb is not None) else None,
            "rating_imdb": active_match.rating_imdb if active_match else None,
            "rating_rotten": active_match.rating_rotten if active_match else None,
            "rating_meta": active_match.rating_meta if active_match else None,
            "rating_porndb": active_match.rating_porndb if active_match else None,
            "vote_count_tmdb": active_match.vote_count_tmdb if (active_match and active_match.vote_count_tmdb is not None) else None,
            "budget": active_match.budget if active_match else None,
            "revenue": active_match.revenue if active_match else None,
            "companies": [{"name": s.name, "logo_path": self._resolve_img(s.logo_path, "logos")} for s in active_match.studios] if active_match else [],
            "networks": [],
            "poster_path": self._resolve_img(override.custom_poster if (override and override.custom_poster) else (loc.poster_path if loc else None), "posters"),
            "backdrop_path": self._resolve_img(override.custom_backdrop if (override and override.custom_backdrop) else (active_match.backdrop_path if active_match else None), "backdrops", size="original"),
            "original_language": loc.original_language if loc else DEFAULT_FALLBACK_LANGUAGE,
            "type": (active_match.media_type.value if hasattr(active_match.media_type, "value") else active_match.media_type) if active_match else "movie",
            "tmdb_id": int(active_match.external_id) if (active_match and active_match.provider == Provider.TMDB and active_match.external_id.isdigit()) else None,
            "imdb_id": active_match.imdb_id if active_match else None,
            "collection_data": collection_data,
            "cast": cast,
            "cast_total": len(cast),
            "people_complete": True,
            "directors": directors,
            "writers": writers,
            "is_adult": active_match.is_adult if active_match else False,
            "is_favorite": override.is_favorite if override else False,
            "user_rating": override.user_rating if override else None,
            "user_comment": override.user_comment if override else None,
            "custom_tags": [t.name for t in override.tags if t.is_adult == bool(active_match.is_adult if active_match else False)] if (override and override.tags) else [],
            "suggested_tags": suggested_tags,
            "technical": technical,
            "in_library": True,
            "path": item.current_path,
            "filename": item.filename,
            "watch_count": watch_count,
            "is_watched": is_watched,
            "resume_position": resume_position,
            "last_watched_at": last_watched_at_dt.isoformat() if last_watched_at_dt else None,
            "playback_logs": playback_logs,
        }

        peaks_count, peaks_history = PlaybackResolver.get_peaks(db, current_uid, item.id)
        result["peaks_count"] = peaks_count
        result["peaks_history"] = peaks_history
        
        ext_ids = {}
        if active_match:
            p_val = active_match.provider.value if hasattr(active_match.provider, "value") else str(active_match.provider)
            p_val = p_val.lower()
            from app.modules.scrapers.support.registry import ProviderRegistry
            p_enum = ProviderRegistry.get_provider_by_prefix(p_val)
            if p_enum:
                cfg = ProviderRegistry.get_config(p_enum)
                if cfg:
                    if cfg.prefix == "tmdb":
                        ext_ids["tmdb"] = active_match.external_id
                    else:
                        ext_ids[f"{cfg.prefix}_id"] = active_match.external_id
                        ext_ids["source"] = cfg.prefix
            if active_match.imdb_id:
                ext_ids["imdb"] = active_match.imdb_id

        media_type_val = result["type"]
        ExternalLinksBuilder.append_links(result, ext_ids, media_type_val)
        return MovieDetailResponse(**result)
