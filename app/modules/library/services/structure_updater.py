import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.core.enums import ItemStatus
from app.modules.library.models import MediaItem, ExtraFile
from app.core.enums import ExtraSubtype, ExtraCategory, MovieEdition, MediaAudioType, MediaSource
from app.modules.library.services.tv_episode_shifter import TvEpisodeShifter

logger = logging.getLogger(__name__)

class StructureUpdater:
    def __init__(self):
        self.shifter = TvEpisodeShifter()

    def update_library_item_type_or_hierarchy(
        self,
        db: Session,
        item_id: str,
        payload: Dict[str, Any],
        resolve_ids_fn: Any
    ) -> Dict[str, Any]:
        """Updates a single library item's type, parent, custom metadata attributes or sub-hierarchy."""
        is_extra = payload.get("type") == 'extra'
        main_type = payload.get("main_type")
        parent_id = payload.get("parent_id")
        subtype = payload.get("subtype")
        language = payload.get("language")
        season = payload.get("season")
        episode = payload.get("episode")
        custom_language = payload.get("custom_language")
        reset_match = bool(payload.get("reset_match"))
        media_type_arg = payload.get("media_type")
        
        custom_edition = payload.get("custom_edition")
        custom_audio_type = payload.get("custom_audio_type")
        custom_source = payload.get("custom_source")

        if is_extra:
            extra = db.query(ExtraFile).filter(ExtraFile.id == int(item_id)).first()
            if not extra:
                from app.core.exceptions import NotFoundException
                raise NotFoundException("Target extra item not found")

            if main_type in ("movie", "episode", "scene"):
                parent_media = extra.media_item
                if parent_media:
                    parent_scan_mode = (parent_media.parsed_info or {}).get("scan_mode")
                    parsed_data = {"type": main_type}
                    if parent_scan_mode:
                        parsed_data["scan_mode"] = parent_scan_mode
                    if main_type == "episode":
                        parsed_data["season"] = season
                        parsed_data["episode"] = episode
                    new_item = MediaItem(
                        library_id=parent_media.library_id,
                        relative_path=extra.relative_path,
                        filename=extra.filename,
                        extension=extra.extension,
                        status=ItemStatus.NEW,
                        parsed_info=parsed_data,
                        custom_edition=MovieEdition.NONE if (custom_edition == "none" or not custom_edition) else MovieEdition(custom_edition.lower()) if custom_edition else MovieEdition.NONE,
                        custom_source=MediaSource.NONE if (custom_source == "none" or not custom_source) else MediaSource(custom_source.lower()) if custom_source else MediaSource.NONE,
                        custom_audio_type=MediaAudioType.NONE if (custom_audio_type == "none" or not custom_audio_type) else MediaAudioType(custom_audio_type.lower()) if custom_audio_type else MediaAudioType.NONE,
                    )
                    db.add(new_item)
                    db.delete(extra)
                    db.flush()
                    db.commit()
                    return {"status": "success", "item_id": item_id, "new_item_id": new_item.id, "converted": True}

            if parent_id is not None:
                extra.media_item_id = int(parent_id)
            if subtype is not None:
                try:
                    extra.subtype = ExtraSubtype(subtype.lower())
                except ValueError as e:
                    logger.debug(f"Swallowed exception: {e}", exc_info=True)
            if language is not None:
                extra.language = language

            db.commit()
            return {"status": "success", "item_id": item_id, "converted": False}

        media_item_id, _ = resolve_ids_fn(item_id, media_type=media_type_arg)
        item = None
        if media_item_id:
            item = db.query(MediaItem).filter(MediaItem.id == media_item_id).first()

        if not item:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Target media item not found")

        if main_type == "bonus" and parent_id is not None:
            parent_item = db.query(MediaItem).filter(MediaItem.id == int(parent_id)).first()
            if parent_item:
                for extra in list(item.extras):
                    extra.media_item = parent_item
                item.extras.clear()
                db.flush()
            new_extra = ExtraFile(
                media_item_id=int(parent_id),
                relative_path=item.relative_path,
                filename=item.filename,
                extension=item.extension,
                category=ExtraCategory.VIDEO,
                subtype=ExtraSubtype(subtype.lower()) if (subtype and subtype != "none") else None,
                language=language
            )
            db.add(new_extra)
            db.delete(item)
            db.commit()
            return {"status": "success", "item_id": item_id, "converted": True}

        if main_type in ("movie", "episode", "scene"):
            parsed = dict(item.parsed_info) if item.parsed_info else {}
            old_type = parsed.get("type")
            if not old_type:
                active_m = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
                if active_m:
                    old_type = active_m.media_type.value if hasattr(active_m.media_type, "value") else active_m.media_type
                else:
                    fn_data = parsed.get("fn") or {}
                    it_data = parsed.get("it") or {}
                    fd_data = parsed.get("fd") or {}
                    old_type = fn_data.get("type") or it_data.get("type") or fd_data.get("type") or "movie"

            if str(old_type).lower() != main_type.lower():
                item.status = ItemStatus.NEW
                parsed["type"] = main_type
                for match in item.matches:
                    match.is_active = False
                    match.media_item_id = None
                
                if main_type == "movie":
                    parsed.pop("season", None)
                    parsed.pop("episode", None)
                    for k in ["fn", "it", "fd"]:
                        if k in parsed and isinstance(parsed[k], dict):
                            parsed[k].pop("season", None)
                            parsed[k].pop("episode", None)
                            parsed[k]["type"] = "movie"
                elif main_type == "episode":
                    for k in ["fn", "it", "fd"]:
                        if k in parsed and isinstance(parsed[k], dict):
                            parsed[k]["type"] = "episode"
            
            item.parsed_info = parsed

        if custom_edition is not None:
            item.custom_edition = MovieEdition.NONE if (custom_edition == "none" or not custom_edition) else MovieEdition(custom_edition.lower())
        if custom_audio_type is not None:
            item.custom_audio_type = MediaAudioType.NONE if (custom_audio_type == "none" or not custom_audio_type) else MediaAudioType(custom_audio_type.lower())
        if custom_source is not None:
            item.custom_source = MediaSource.NONE if (custom_source == "none" or not custom_source) else MediaSource(custom_source.lower())

        if season is not None or episode is not None:
            parsed = dict(item.parsed_info) if item.parsed_info else {}
            if season is not None:
                parsed["season"] = season
                for k in ["fn", "it", "fd"]:
                    if k in parsed and isinstance(parsed[k], dict):
                        parsed[k]["season"] = season
            if episode is not None:
                parsed["episode"] = episode
                for k in ["fn", "it", "fd"]:
                    if k in parsed and isinstance(parsed[k], dict):
                        parsed[k]["episode"] = episode
            item.parsed_info = parsed
            self.shifter.shift_tv_episode_match(db, item, parsed, season, episode, custom_language, reset_match)

        if reset_match:
            item.status = ItemStatus.NEW
            for match in item.matches:
                match.is_active = False
                match.media_item_id = None

        db.commit()
        return {"status": "success", "item_id": item_id, "converted": False}

    def bulk_update_library_items(
        self,
        db: Session,
        item_ids: List[str],
        is_extra: bool,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Performs bulk updates for media item custom attributes, genres, types, or parent assignments."""
        parent_id = payload.get("parent_id")
        subtype = payload.get("subtype")
        language = payload.get("language")
        main_type = payload.get("main_type")
        season = payload.get("season")
        episode = payload.get("episode")
        reset_match = bool(payload.get("reset_match"))
        
        custom_edition = payload.get("custom_edition")
        custom_audio_type = payload.get("custom_audio_type")
        custom_source = payload.get("custom_source")

        count = 0
        for item_id in item_ids:
            if is_extra:
                extra = db.query(ExtraFile).filter(ExtraFile.id == int(item_id)).first()
                if extra:
                    if parent_id is not None:
                        extra.media_item_id = int(parent_id)
                    if subtype is not None:
                        try:
                            extra.subtype = ExtraSubtype(subtype.lower())
                        except ValueError as e:
                            logger.debug(f"Swallowed exception: {e}", exc_info=True)
                    if language is not None:
                        extra.language = language

                    if main_type in ("movie", "episode", "scene"):
                        parent_media = extra.media_item
                        if parent_media:
                            parsed_data = {"type": main_type}
                            if main_type == "episode":
                                parsed_data["season"] = season
                                parsed_data["episode"] = episode
                            new_item = MediaItem(
                                library_id=parent_media.library_id,
                                relative_path=extra.relative_path,
                                filename=extra.filename,
                                extension=extra.extension,
                                status=ItemStatus.NEW,
                                parsed_info=parsed_data,
                                custom_edition=MovieEdition.NONE if (custom_edition == "none" or not custom_edition) else MovieEdition(custom_edition.lower()) if custom_edition else MovieEdition.NONE,
                                custom_source=MediaSource.NONE if (custom_source == "none" or not custom_source) else MediaSource(custom_source.lower()) if custom_source else MediaSource.NONE,
                                custom_audio_type=MediaAudioType.NONE if (custom_audio_type == "none" or not custom_audio_type) else MediaAudioType(custom_audio_type.lower()) if custom_audio_type else MediaAudioType.NONE,
                            )
                            db.add(new_item)
                            db.delete(extra)
                    count += 1
            else:
                item = db.query(MediaItem).filter(MediaItem.id == int(item_id)).first()
                if item:
                    if main_type == "bonus" and parent_id is not None:
                        parent_item = db.query(MediaItem).filter(MediaItem.id == int(parent_id)).first()
                        if parent_item:
                            for extra in list(item.extras):
                                extra.media_item = parent_item
                            item.extras.clear()
                            db.flush()
                        new_extra = ExtraFile(
                            media_item_id=int(parent_id),
                            relative_path=item.relative_path,
                            filename=item.filename,
                            extension=item.extension,
                            category=ExtraCategory.VIDEO,
                            subtype=ExtraSubtype(subtype.lower()) if (subtype and subtype != "none") else ExtraSubtype.OTHER,
                            language=language
                        )
                        db.add(new_extra)
                        db.delete(item)
                    else:
                        if main_type in ("movie", "episode", "scene"):
                            parsed = dict(item.parsed_info) if item.parsed_info else {}
                            old_type = parsed.get("type")
                            if not old_type:
                                active_m = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
                                if active_m:
                                    old_type = active_m.media_type.value if hasattr(active_m.media_type, "value") else active_m.media_type
                                else:
                                    fn_data = parsed.get("fn") or {}
                                    it_data = parsed.get("it") or {}
                                    fd_data = parsed.get("fd") or {}
                                    old_type = fn_data.get("type") or it_data.get("type") or fd_data.get("type") or "movie"

                            if str(old_type).lower() != main_type.lower():
                                item.status = ItemStatus.NEW
                                parsed["type"] = main_type
                                for match in item.matches:
                                    match.is_active = False
                                    match.media_item_id = None

                                if main_type == "movie":
                                    parsed.pop("season", None)
                                    parsed.pop("episode", None)
                                    for k in ["fn", "it", "fd"]:
                                        if k in parsed and isinstance(parsed[k], dict):
                                            parsed[k].pop("season", None)
                                            parsed[k].pop("episode", None)
                                            parsed[k]["type"] = "movie"
                                elif main_type == "episode":
                                    for k in ["fn", "it", "fd"]:
                                        if k in parsed and isinstance(parsed[k], dict):
                                            parsed[k]["type"] = "episode"

                            item.parsed_info = parsed

                        if custom_edition is not None:
                            item.custom_edition = MovieEdition.NONE if (custom_edition == "none" or not custom_edition) else MovieEdition(custom_edition.lower())
                        if custom_audio_type is not None:
                            item.custom_audio_type = MediaAudioType.NONE if (custom_audio_type == "none" or not custom_audio_type) else MediaAudioType(custom_audio_type.lower())
                        if custom_source is not None:
                            item.custom_source = MediaSource.NONE if (custom_source == "none" or not custom_source) else MediaSource(custom_source.lower())
                        
                        if season is not None or episode is not None:
                            parsed = dict(item.parsed_info) if item.parsed_info else {}
                            if season is not None:
                                parsed["season"] = season
                                for k in ["fn", "it", "fd"]:
                                    if k in parsed and isinstance(parsed[k], dict):
                                        parsed[k]["season"] = season
                            if episode is not None:
                                parsed["episode"] = episode
                                for k in ["fn", "it", "fd"]:
                                    if k in parsed and isinstance(parsed[k], dict):
                                        parsed[k]["episode"] = episode
                            item.parsed_info = parsed
                            self.shifter.shift_tv_episode_match(db, item, parsed, season, episode, payload.get("custom_language"), reset_match)

                        if reset_match:
                            for match in item.matches:
                                match.is_active = False
                    count += 1
        
        db.commit()
        return {"status": "success", "count": count}
