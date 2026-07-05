import logging
from typing import Optional, Any
from sqlalchemy.orm import Session, selectinload

from app.domains.library.models import MediaItem
from app.domains.metadata.models import MetadataMatch, MediaCollection
from app.domains.users.models import UserOverride
from app.shared_kernel.enums import ItemStatus, MediaType
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.language import LanguageService as LangHelper
from app.shared_kernel.ports.settings_port import SettingsPort
from app.shared_kernel.ports.image_download_port import ImageDownloadPort
from app.domains.library.schemas import MovieCollectionsResponse

logger = logging.getLogger(__name__)

class LibraryCollectionService:
    def __init__(self, db_session: Session, settings_port: Optional[SettingsPort] = None, image_downloader: Optional[ImageDownloadPort] = None, tmdb_scraper: Optional[Any] = None):
        self.db = db_session
        self.settings = settings_port
        self.image_downloader = image_downloader
        self.tmdb_scraper = tmdb_scraper


    def get_movie_collections(
        self,
        page: int = 1,
        page_size: Optional[int] = 40,
        search: str = "",
        tab: str = "movies",
        include_adult: bool = False,
    ) -> MovieCollectionsResponse:
        """
        Retrieves a paginated and filtered list of movie collections in the library.
        """
        # Get ui language
        ui_lang = DEFAULT_FALLBACK_LANGUAGE
        try:
            val = self.settings.get_setting("ui_language")
            if val:
                ui_lang = LangHelper.clean_locale(val)
        except Exception as e:
            logger.debug(f"Swallowed exception in domains/library/services/library_collection_service.py:42: {e}", exc_info=True)

        lib_statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]
        
        query = self.db.query(MetadataMatch).join(
            MediaItem, MetadataMatch.media_item_id == MediaItem.id
        ).filter(
            MediaItem.status.in_(lib_statuses),
            MetadataMatch.collection_id.isnot(None)
        )

        query = query.filter(MetadataMatch.is_adult == include_adult)

        if tab in ("movies", "adult"):
            query = query.filter(MetadataMatch.media_type == MediaType.MOVIE)

        matches = query.options(
            selectinload(MetadataMatch.collection).selectinload(MediaCollection.localizations),
            selectinload(MetadataMatch.localizations),
            selectinload(MetadataMatch.overrides)
        ).all()

        tmdb_scraper = self.tmdb_scraper

        collections_map = {}
        normalized_search = search.strip().lower() if search else ""

        for match in matches:
            collection = match.collection
            if not collection:
                continue

            col_loc = LangHelper.get_best_localization(collection.localizations, ui_lang) if collection.localizations else None
            
            if not col_loc and tmdb_scraper:
                try:
                    col_id_int = int(collection.external_id)
                    details = tmdb_scraper.get_collection_details(col_id_int, language=ui_lang) or {}
                    if details:
                        if details.get("backdrop_path"):
                            collection.backdrop_path = details["backdrop_path"]
                        from app.domains.metadata.models import MediaCollectionLocalization
                        lang_code = LangHelper.clean_locale(ui_lang)
                        col_loc = MediaCollectionLocalization(
                            collection=collection,
                            locale=lang_code,
                            title=details.get("name") or f"Collection {col_id_int}",
                            overview=details.get("overview"),
                            poster_path=details.get("poster_path")
                        )
                        self.db.add(col_loc)
                        
                        try:
                            if self.image_downloader:
                                def queue_image(path: str, subfolder: str, prefix: str) -> Optional[str]:
                                    url = self.image_downloader.get_download_url(path, subfolder)
                                    if not url:
                                        return None
                                    import os
                                    import re
                                    from urllib.parse import urlparse
                                    basename = os.path.basename(urlparse(path).path)
                                    ext = os.path.splitext(basename)[1].lower() or ".jpg"
                                    safe_prefix = re.sub(r"[^A-Za-z0-9_.-]+", "_", prefix).strip("_")
                                    filename = f"{safe_prefix}_{basename}{ext}"
                                    self.image_downloader.enqueue_download(url, subfolder, filename)
                                    return f"{subfolder}/{filename}"
                                
                                asset_prefix = f"tmdb_{collection.external_id}"
                                if col_loc.poster_path and not col_loc.local_poster_path:
                                    col_loc.local_poster_path = queue_image(col_loc.poster_path, "posters", asset_prefix)
                        except Exception as e:
                            logger.error(f"Failed to queue image download for collection: {e}")
                        
                        self.db.commit()
                except Exception as e:
                    self.db.rollback()
                    logger.error(f"Failed to fetch/save collection details on-the-fly: {e}")

            collection_title = col_loc.title if col_loc and col_loc.title else f"Collection {collection.external_id}"

            if normalized_search and normalized_search not in collection_title.lower():
                continue

            col_id = collection.id
            entry = collections_map.get(col_id)
            if not entry:
                total_parts = 0
                if tmdb_scraper:
                    try:
                        col_id_int = int(collection.external_id)
                        details = tmdb_scraper.get_collection_details(col_id_int, language=ui_lang) or {}
                        total_parts = len(details.get("parts", []) or [])
                    except Exception as e:
                        logger.error(f"Failed to get collection parts count: {e}")

                from app.shared_kernel.user_context import get_current_user_id
                current_uid = get_current_user_id()
                col_override = self.db.query(UserOverride).filter(
                    UserOverride.user_id == current_uid,
                    UserOverride.collection_id == collection.id
                ).first()

                final_poster = (col_override.custom_poster if (col_override and col_override.custom_poster) else None) or ((col_loc.local_poster_path or col_loc.poster_path) if col_loc else None)
                final_backdrop = (col_override.custom_backdrop if (col_override and col_override.custom_backdrop) else None) or collection.backdrop_path

                entry = {
                    "id": f"collection_{collection.external_id}",
                    "tmdb_id": int(collection.external_id) if collection.external_id.isdigit() else 0,
                    "title": collection_title,
                    "overview": col_loc.overview if col_loc else None,
                    "poster_path": final_poster,
                    "has_local_poster": bool(col_override.custom_poster) if (col_override and col_override.custom_poster) else bool(col_loc and col_loc.local_poster_path),
                    "poster_remote_path": col_loc.poster_path if col_loc else None,
                    "backdrop_path": final_backdrop,
                    "owned_count": 0,
                    "total_count": total_parts,
                    "type": "collection",
                    "movies": []
                }
                collections_map[col_id] = entry

            loc = match.localizations[0] if match.localizations else None
            item = match.media_item
            
            from app.shared_kernel.user_context import get_current_user_id
            current_uid = get_current_user_id()
            o = match.overrides if (match.overrides and match.overrides.user_id == current_uid) else None
            
            title = (o.custom_title if (o and o.custom_title) else None) or (loc.title if loc else (item.filename if item else "Unknown"))
            poster_path = (o.custom_poster if (o and o.custom_poster) else None) or (loc.poster_path if loc else None)
            backdrop_path = (o.custom_backdrop if (o and o.custom_backdrop) else None) or (match.backdrop_path or None)
            rating = (o.user_rating if (o and o.user_rating is not None) else None)
            if rating is None:
                rating = match.rating_porndb or match.rating_tmdb or 0.0

            entry["owned_count"] += 1
            entry["movies"].append({
                "id": item.id if item else None,
                "title": title,
                "year": match.release_date.year if match.release_date else None,
                "poster_path": poster_path,
                "backdrop_path": backdrop_path,
                "rating": rating,
                "rating_porndb": match.rating_porndb,
                "rating_imdb": match.rating_imdb,
                "type": match.media_type.value,
                "tmdb_id": int(match.external_id) if match.external_id.isdigit() else 0,
                "path": item.current_path if item else None,
                "is_favorite": o.is_favorite if o else False,
                "user_rating": o.user_rating if o else None
            })

        # Apply config filtering
        collection_mode = self.settings.get_setting("folder_collection_mode")
        threshold = self.settings.get_setting("folder_collection_threshold")
        create_collection_dir = self.settings.get_setting("folder_create_collection_dir")

        if not collection_mode:
            if create_collection_dir is False:
                collection_mode = "never"
            else:
                collection_mode = "threshold"

        try:
            threshold = max(1, int(threshold or 3))
        except (TypeError, ValueError):
            threshold = 3

        filtered_collections = []
        for col in collections_map.values():
            col["total_count"] = max(col["total_count"], col["owned_count"])
            if collection_mode == "never":
                continue
            elif collection_mode == "threshold":
                if col["owned_count"] >= threshold:
                    filtered_collections.append(col)
            else:
                if col["owned_count"] >= 1:
                    filtered_collections.append(col)

        sorted_collections = sorted(
            filtered_collections,
            key=lambda c: (-c["owned_count"], str(c["title"]).lower(), c["tmdb_id"])
        )

        total_items = len(sorted_collections)
        total_pages = (total_items + page_size - 1) // page_size if page_size and total_items > 0 else 1
        current_page = max(1, min(page, total_pages))
        
        start_idx = (current_page - 1) * page_size if page_size else 0
        end_idx = start_idx + page_size if page_size else total_items
        paged_collections = sorted_collections[start_idx:end_idx]

        return MovieCollectionsResponse(
            items=paged_collections,
            total_items=total_items,
            page=current_page,
            page_size=page_size,
            total_pages=total_pages
        )
