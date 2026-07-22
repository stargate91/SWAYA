import logging
from typing import Dict, Any, Optional

from app.core.enums import Provider, MediaType, ItemStatus
from app.modules.metadata.models import MetadataMatch
from app.modules.metadata.schemas import MetadataResolveRequest, BulkResolveRequest


logger = logging.getLogger(__name__)

class MetadataResolver:
    def __init__(self, db: Any, scrapers: Any, tmdb: Any, media_resolver: Optional[Any] = None, metadata_repo: Optional[Any] = None):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = tmdb
        if media_resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            media_resolver = MediaItemService(db)
        self.media_resolver = media_resolver
        if metadata_repo is None:
            from app.modules.metadata.services.metadata_service import MetadataService
            metadata_repo = MetadataService(db, scrapers)
        self.metadata_repo = metadata_repo

    def resolve_item(self, request: MetadataResolveRequest) -> Dict[str, Any]:
        db = self.db
        item_id = request.item_id
        external_id = request.tmdb_id or request.external_id
        media_type_str = request.type or request.media_type or "movie"
        season_number = request.season_number
        episode_number = request.episode_number
        provider_str = request.provider or "tmdb"

        if not item_id or not external_id:
            from app.core.exceptions import BadRequestException
            raise BadRequestException("item_id and external_id (tmdb_id) are required")

        if not self.media_resolver:
            from app.core.exceptions import BadRequestException
            raise BadRequestException("media_resolver must be configured to resolve items")

        item = self.media_resolver.get_item_by_id(int(item_id))
        if not item:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Media item not found")

        # Delete any existing metadata match mappings for this physical item
        self.metadata_repo.delete_matches_by_item_id(item.id)
        db.flush()

        # Parse provider and media type
        try:
            provider = Provider(provider_str.lower())
        except ValueError:
            provider = Provider.TMDB

        try:
            mtype = MediaType(media_type_str.lower())
        except ValueError:
            mtype = MediaType.MOVIE

        # Promote TV show match to EPISODE if the item is an episode or we have season/episode numbers
        inferred_type = str((item.parsed_info or {}).get("type") or "").lower()
        if mtype == MediaType.TV and (inferred_type == "episode" or season_number is not None or episode_number is not None):
            parsed = item.parsed_info or {}
            fn_data = parsed.get("fn") or {}
            it_data = parsed.get("it") or {}
            fd_data = parsed.get("fd") or {}
            if season_number is None:
                season_number = parsed.get("season") or fn_data.get("season") or it_data.get("season") or fd_data.get("season")
            if episode_number is None:
                episode_number = parsed.get("episode") or fn_data.get("episode") or it_data.get("episode") or fd_data.get("episode")
            
            if season_number is not None:
                try:
                    season_number = int(season_number)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Swallowed exception in app/modules/metadata/services/metadata_resolver.py:62: {e}", exc_info=True)
            if episode_number is not None:
                try:
                    if isinstance(episode_number, list):
                        episode_number = [int(x) for x in episode_number if str(x).isdigit()]
                    elif str(episode_number).isdigit():
                        episode_number = int(episode_number)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Swallowed exception in app/modules/metadata/services/metadata_resolver.py:70: {e}", exc_info=True)

            if season_number is not None and episode_number is not None:
                mtype = MediaType.EPISODE

        from app.modules.scrapers.support.registry import ProviderRegistry
        if ProviderRegistry.is_adult_provider(provider):
            scraper = self.scrapers.adult(provider, db)

            if not scraper:
                from app.core.exceptions import BadRequestException
                raise BadRequestException("Selected adult scraper is not configured")

            if provider == Provider.PORNDB and mtype == MediaType.MOVIE:
                movie_data = scraper.fetch_movie(str(external_id))
                if not movie_data:
                    from app.core.exceptions import BadRequestException
                    raise BadRequestException(f"Failed to fetch movie details from {provider.value}")

                normalized = self.scrapers.normalize_porndb_movie(movie_data)
                match = self.scrapers.persist_adult_scene(
                    db, provider, str(movie_data["id"]), normalized, media_type=MediaType.MOVIE, media_item_id=item.id
                )
                item.status = ItemStatus.MATCHED
                db.commit()
                return {"status": "success", "item_id": item.id, "match_id": match.id}

            scene_data = scraper.fetch_scene(str(external_id))
            if not scene_data:
                from app.core.exceptions import BadRequestException
                raise BadRequestException(f"Failed to fetch scene details from {provider.value}")

            normalized = self.scrapers.normalize_adult_scene(provider, scene_data)
            match = self.scrapers.persist_adult_scene(db, provider, str(scene_data["id"]), normalized, media_item_id=item.id)
            item.status = ItemStatus.MATCHED
            db.commit()
            return {"status": "success", "item_id": item.id, "match_id": match.id}

        # Otherwise standard TMDB resolution
        # Check if match with same provider, external_id, and media_type already exists
        match = self.metadata_repo.get_match_by_item_and_provider_info(
            item.id, provider, external_id, mtype
        )

        if match:
            match.is_active = True
            if request.is_adult:
                match.is_adult = True
            if season_number is not None:
                match.season_number = season_number
            if episode_number is not None:
                match.episode_number = episode_number
        else:
            match = MetadataMatch(
                media_item_id=item.id,
                provider=provider,
                external_id=str(external_id),
                media_type=mtype,
                season_number=season_number,
                episode_number=episode_number,
                confidence_score=1.0,
                is_active=True,
                is_adult=bool(request.is_adult)
            )
            db.add(match)
        db.flush()

        # Promote or mark status based on TV show S/E requirements
        is_tv_without_se = (mtype == MediaType.TV)
        is_episode_without_se = (mtype == MediaType.EPISODE and (season_number is None or episode_number is None))
        if is_tv_without_se or is_episode_without_se:
            item.status = ItemStatus.UNCERTAIN
        else:
            item.status = ItemStatus.MATCHED


        # Enrich item metadata
        from app.core.language import get_user_ui_language
        from app.modules.settings.services.settings_service import SettingsService
        settings = SettingsService(db)
        ui_lang = get_user_ui_language(settings)
        try:
            self.scrapers.enrich_mainstream(db, item, ui_lang, commit=True)
        except Exception as e:
            logger.error(f"Enrichment failed during manual resolve: {e}")
            db.rollback()

        return {"status": "success", "item_id": item.id, "match_id": match.id}

    def bulk_resolve(self, request: BulkResolveRequest) -> Dict[str, Any]:
        resolutions = request.resolutions or []
        count = 0
        for res in resolutions:
            try:
                ret = self.resolve_item(res)
                if "error" not in ret:
                    count += 1
            except Exception as e:
                logger.error(f"Bulk resolve error for item {res.item_id}: {e}")
        return {"status": "success", "resolved_count": count}
