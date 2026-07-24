import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.modules.metadata.models import MetadataMatch
from app.core.enums import Provider, MediaType
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE
from app.core.language import LanguageService


logger = logging.getLogger(__name__)

class MatchPersister:
    def __init__(self, db: Session, metadata_repo: Any, image_downloader: Any):
        self.db = db
        self.metadata_repo = metadata_repo
        self.image_downloader = image_downloader

    def queue_adult_assets(self, match: MetadataMatch) -> None:
        """Queues poster/backdrop downloads for adult matches."""
        asset_prefix = f"{match.provider.value if hasattr(match.provider, 'value') else match.provider}_{match.external_id}"
        backdrop_subfolder = "scene_stills" if MediaType.is_adult_type(match.media_type) else "backdrops"
        match.local_backdrop_path = self.image_downloader.queue_image(match.backdrop_path, backdrop_subfolder, asset_prefix)

        loc = next((x for x in match.localizations if x.locale == DEFAULT_FALLBACK_LANGUAGE), None)
        if not loc and match.localizations:
            loc = match.localizations[0]
        if loc and loc.poster_path:
            loc.local_poster_path = self.image_downloader.queue_image(loc.poster_path, "posters", asset_prefix)


    def persist_collection(self, coll_info: Dict[str, Any], match: MetadataMatch, language: str):
        coll_id = coll_info["external_id"]
        collection = self.metadata_repo.get_collection(Provider.TMDB, coll_id)
        if not collection:
            try:
                with self.db.begin_nested():
                    collection = self.metadata_repo.create_collection(
                        provider=Provider.TMDB,
                        external_id=coll_id,
                        backdrop_path=coll_info["backdrop_path"]
                    )
                    self.metadata_repo.flush()
            except Exception as e:
                logger.debug(f"Failed to create collection, falling back to query: {e}", exc_info=True)
                collection = self.metadata_repo.get_collection(Provider.TMDB, coll_id)
        match.collection = collection
        
        if collection:
            lang_code = LanguageService.clean_locale(language)
            loc = None
            if collection.id is not None:
                loc = self.metadata_repo.get_collection_localization(collection.id, lang_code)
            if not loc:
                loc = self.metadata_repo.create_collection_localization(
                    collection_id=collection.id,
                    locale=lang_code
                )
            loc.title = coll_info.get("name") or loc.title
            loc.poster_path = coll_info.get("poster_path") or loc.poster_path
            
            if loc.poster_path and not loc.local_poster_path:
                asset_prefix = f"tmdb_{collection.external_id}"
                loc.local_poster_path = self.image_downloader.queue_image(loc.poster_path, "posters", asset_prefix)

            if collection.backdrop_path and not collection.local_backdrop_path:
                asset_prefix = f"tmdb_{collection.external_id}"
                collection.local_backdrop_path = self.image_downloader.queue_image(collection.backdrop_path, "backdrops", asset_prefix)
