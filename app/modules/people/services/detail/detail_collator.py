import logging
from typing import Optional, Any
from sqlalchemy.orm import Session

from app.core.enums import Provider
from app.modules.people.models import Person, ExternalSourceLink
from app.core.language import LanguageService



from app.modules.people.services.filmography_service import FilmographyService
from app.modules.people.schemas import PersonDetailDTO
from app.modules.people.helpers import merge_images
from app.modules.people.services.detail.performer_stats_calculator import PerformerStatsCalculator
from app.modules.people.services.detail.profile_merger import ProfileMerger

logger = logging.getLogger(__name__)

class PersonDetailCollator:
    def __init__(self, db: Session, scrapers: Any, tmdb: Any, resolver: Optional[Any] = None, image_service: Any = None, filmography_service: FilmographyService = None, image_downloader: Optional[Any] = None):
        self.db = db
        self.scrapers = scrapers
        self.tmdb = tmdb
        if resolver is None:
            from app.modules.library.services.media_item_service import MediaItemService
            resolver = MediaItemService(db)
        self.resolver = resolver
        self.image_service = image_service
        self.filmography_service = filmography_service
        self.stats_calculator = PerformerStatsCalculator()
        self.profile_merger = ProfileMerger()
        self.image_downloader = image_downloader

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def get_person_detail(self, person: Person, user_id: int, ui_lang: str) -> PersonDetailDTO:
        """Collates database objects, overrides, statistics, and scraper details to assemble a performer's profile."""
        db = self.db
        person = db.merge(person)
        person_id = person.id
        override_dict = self.resolver.get_person_user_override(user_id, person_id)
        
        loc = LanguageService.get_best_localization(person.localizations, ui_lang)

        ext_ids = person.external_ids or {}
        tmdb_id = ext_ids.get("tmdb") or ext_ids.get("tmdb_id")
        if not tmdb_id:
            for link in person.external_links:
                if link.provider.value == "tmdb":
                    tmdb_id = link.external_id
                    break
        if not tmdb_id and not person.is_adult and str(person_id).isdigit() and person_id < 100000000:
            tmdb_id = person_id
            
        if tmdb_id:
            has_local_details = (
                person.birthday is not None
                and person.place_of_birth is not None
                and loc is not None
                and loc.biography is not None
            )
            if not has_local_details:
                try:
                    tmdb_details = self.tmdb.get_person_details(int(tmdb_id), language=ui_lang)
                    if tmdb_details:
                        person.birthday = tmdb_details.get("birthday") or person.birthday
                        person.place_of_birth = tmdb_details.get("place_of_birth") or person.place_of_birth
                        person.deathday = tmdb_details.get("deathday") or person.deathday
                        person.profile_path = tmdb_details.get("profile_path") or person.profile_path
                        person.known_for_department = tmdb_details.get("known_for_department") or person.known_for_department
                        person.homepage = tmdb_details.get("homepage") or person.homepage
                        
                        if tmdb_details.get("also_known_as"):
                            aliases = list(person.aliases or [])
                            for alias in tmdb_details["also_known_as"]:
                                if alias not in aliases:
                                    aliases.append(alias)
                            person.aliases = aliases
                        
                        profiles = tmdb_details.get("images", {}).get("profiles") or []
                        new_imgs = [p.get("file_path") for p in profiles if p.get("file_path")]
                        if person.profile_path:
                            new_imgs.insert(0, person.profile_path)
                        person.images = merge_images(person.images, new_imgs)
                        
                        from app.modules.people.models import PersonLocalization
                        if tmdb_details.get("biography"):
                            if not loc:
                                loc = PersonLocalization(person_id=person.id, locale=ui_lang, biography=tmdb_details["biography"])
                                db.add(loc)
                            else:
                                loc.biography = tmdb_details["biography"]
                        
                        tmdb_link = next((x for x in person.external_links if x.provider == Provider.TMDB), None)
                        if not tmdb_link:
                            tmdb_link = ExternalSourceLink(
                                person_id=person.id,
                                provider=Provider.TMDB,
                                external_id=str(tmdb_id),
                            )
                            db.add(tmdb_link)
                            person.external_links.append(tmdb_link)
                        
                        tmdb_link.source_data = {
                            "birthday": tmdb_details.get("birthday"),
                            "deathday": tmdb_details.get("deathday"),
                            "place_of_birth": tmdb_details.get("place_of_birth"),
                            "gender": tmdb_details.get("gender"),
                            "biography": tmdb_details.get("biography"),
                            "profile_path": tmdb_details.get("profile_path"),
                        }
                        
                        ext_ids_from_tmdb = tmdb_details.get("external_ids") or {}
                        imdb_id_from_tmdb = tmdb_details.get("imdb_id") or ext_ids_from_tmdb.get("imdb_id")
                        current_ids = dict(person.external_ids or {})
                        updated = False
                        if imdb_id_from_tmdb and current_ids.get("imdb_id") != imdb_id_from_tmdb:
                            current_ids["imdb_id"] = imdb_id_from_tmdb
                            updated = True
                        for key in ["facebook_id", "instagram_id", "twitter_id"]:
                            val = ext_ids_from_tmdb.get(key)
                            if val and current_ids.get(key) != val:
                                current_ids[key] = val
                                updated = True
                        if tmdb_id and current_ids.get("tmdb") != str(tmdb_id):
                            current_ids["tmdb"] = str(tmdb_id)
                            current_ids["tmdb_id"] = str(tmdb_id)
                            updated = True
                        if updated:
                            person.external_ids = current_ids

                        db.commit()
                        person = db.merge(person)
                except Exception as e:
                    logger.error(f"Failed to dynamically enrich person {person_id}: {e}")
        if person.is_adult:
            links = db.query(ExternalSourceLink).filter(ExternalSourceLink.person_id == person_id).all()
            has_been_enriched = (len(links) > 0 and any(x.source_data is not None for x in links)) or person.hair_color is not None or person.eye_color is not None
            if not has_been_enriched:
                try:
                    from app.modules.people.services.people_enricher import PeopleEnricher
                    enricher = PeopleEnricher(db, scrapers=self.scrapers)
                    
                    ext_ids = person.external_ids or {}
                    link_data = [{"provider": x.provider, "external_id": x.external_id} for x in links]
                    
                    for prov_name, ext_id in ext_ids.items():
                        try:
                             prov = Provider(prov_name.lower())
                             if not any(ld["provider"] == prov for ld in link_data):
                                 link_data.append({"provider": prov, "external_id": str(ext_id)})
                        except Exception as e:
                             logger.debug(f"Swallowed exception: {e}", exc_info=True)
    
                    fetched_data = enricher.fetch_external_details(person.name, ext_ids, link_data, is_adult=True)
                    if fetched_data:
                        enricher.apply_enriched_data(person, fetched_data)
                        db.commit()
                        person = db.merge(person)
                        db.refresh(person)
                        loc = LanguageService.get_best_localization(person.localizations, ui_lang)
                except Exception as e:
                    logger.error(f"Failed to dynamically enrich adult performer {person_id}: {e}", exc_info=True)


        
        movies, tv, scenes, known_for = self.filmography_service.get_combined_filmography(
            person_id,
            tmdb_id=tmdb_id,
            ui_lang=ui_lang,
            tmdb_client=self.tmdb,
            is_adult=person.is_adult,
            known_for_department=person.known_for_department,
            person_name=person.name
        )

        effective_backdrop, source_tmdb_id, source_media_type = self.profile_merger.resolve_effective_backdrop(
            db=self.db,
            tmdb_client=self.tmdb,
            person=person,
            override_dict=override_dict,
            known_for=known_for,
            ui_lang=ui_lang
        )

        local_file_exists = False
        if person.local_backdrop_path:
            from app.modules.media_assets.services.images import image_processing_service
            local_file_exists = image_processing_service.resolve_image_url(
                person.local_backdrop_path, "backdrops", size="original"
            ) is not None

        # Enqueue profile image download if remote and not yet cached locally
        effective_profile = person.profile_path
        local_profile_exists = False
        if person.local_profile_path:
            from app.modules.media_assets.services.images import image_processing_service
            local_profile_exists = image_processing_service.resolve_image_url(
                person.local_profile_path, "people", size="w500"
            ) is not None

        if effective_profile and self.image_downloader and not local_profile_exists:
            is_remote_profile = False
            profile_url = None
            if effective_profile.startswith(("http://", "https://")):
                is_remote_profile = True
                profile_url = effective_profile
            elif effective_profile.startswith("/"):
                is_remote_profile = True
                profile_url = self.image_downloader.get_download_url(effective_profile, "people") or f"https://image.tmdb.org/t/p/h632{effective_profile}"

            if is_remote_profile and profile_url:
                import os
                ext = os.path.splitext(profile_url)[1].lower() or ".jpg"
                if ext == ".jpeg":
                    ext = ".jpg"

                existing_file = None
                tmdb_id = (person.external_ids or {}).get("tmdb")
                if tmdb_id:
                    clean_path = effective_profile.lstrip("/")
                    profile_filename = f"tmdb_{tmdb_id}_{clean_path}"
                else:
                    ext_id = person.id
                    prov_val = "person"
                    if person.external_ids:
                        for k, v in person.external_ids.items():
                            if k != "urls" and v:
                                prov_val = k
                                ext_id = v
                                break
                    stem_filename = f"{prov_val}_{ext_id}"
                    from app.modules.media_assets.services.images import image_processing_service, image_path_resolver
                    existing_file = image_path_resolver.find_existing_file_by_stem(image_processing_service.image_root, "original", "people", stem_filename) or image_path_resolver.find_existing_file_by_stem(image_processing_service.image_root, "thumbnails", "people", stem_filename)
                    if existing_file:
                        profile_filename = existing_file.name
                    else:
                        profile_filename = f"{stem_filename}{ext}"

                person.local_profile_path = f"people/{profile_filename}"
                try:
                    self.db.commit()
                    if not existing_file:
                        self.image_downloader.enqueue_download(profile_url, "people", profile_filename)
                except Exception as e:
                    logger.error(f"Failed to save and enqueue person profile image: {e}")

        if effective_backdrop and self.image_downloader and not local_file_exists:
            is_remote = False
            url = None
            if effective_backdrop.startswith(("http://", "https://")):
                is_remote = True
                url = effective_backdrop
            elif effective_backdrop.startswith("/"):
                is_remote = True
                url = self.image_downloader.get_download_url(effective_backdrop, "backdrops") or f"https://image.tmdb.org/t/p/original{effective_backdrop}"
            
            if is_remote and url:
                import os
                import re
                from urllib.parse import urlparse
                basename = os.path.basename(urlparse(url).path)
                ext = os.path.splitext(basename)[1].lower() or ".jpg"
                if ext == ".jpeg":
                    ext = ".jpg"
                safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", person.name).strip("_")
                filename = f"person_backdrop_{person.id}_{safe_name}{ext}"
                
                person.backdrop_path = effective_backdrop
                person.local_backdrop_path = f"backdrops/{filename}"
                try:
                    self.db.commit()
                    self.image_downloader.enqueue_download(url, "backdrops", filename)
                    effective_backdrop = url
                except Exception as e:
                    logger.error(f"Failed to save and enqueue person backdrop: {e}")

        external_ids = self.profile_merger.build_external_ids(person)
        suggested_tags = self.profile_merger.build_suggested_tags(person)
        stats = self.stats_calculator.format_credits_stats(movies, tv, scenes)

        finish_count = 0
        last_finish_at = None
        finishes = []
        if person.is_adult:
            from app.modules.history.models import PlaybackPeakLog
            from app.modules.metadata.models import MetadataMatch
            from app.modules.people.models import MediaPersonLink
            from sqlalchemy import desc

            peaks = (
                db.query(PlaybackPeakLog, MetadataMatch.original_title)
                .join(MetadataMatch, MetadataMatch.media_item_id == PlaybackPeakLog.media_item_id)
                .join(MediaPersonLink, MediaPersonLink.match_id == MetadataMatch.id)
                .filter(MediaPersonLink.person_id == person_id)
                .order_by(desc(PlaybackPeakLog.created_at))
                .all()
            )
            finish_count = len(peaks)
            if peaks:
                last_finish_at = peaks[0][0].created_at.isoformat()
                for peak, title in peaks:
                    resolved_snapshot = None
                    if peak.snapshot_path:
                        snap_path = peak.snapshot_path
                        if not snap_path.startswith("/media/"):
                            if snap_path.startswith("snapshots/"):
                                snap_path = f"/media/images/{snap_path}"
                            else:
                                snap_path = f"/media/images/snapshots/{snap_path}"
                        resolved_snapshot = self.image_service.resolve_image_url(snap_path, "snapshots")
                    
                    finishes.append({
                        "id": peak.id,
                        "media_item_id": peak.media_item_id,
                        "video_position": peak.video_position,
                        "created_at": peak.created_at.isoformat(),
                        "snapshot_path": resolved_snapshot,
                        "media_title": title or "Unknown Video"
                    })

        result = {
            "id": person.id,
            "finish_count": finish_count,
            "last_finish_at": last_finish_at,
            "finishes": finishes,
            "suggested_tags": suggested_tags,
            "name": person.name,
            "alternate_names": person.aliases or [],
            "biography": loc.biography if loc else None,
            "birthday": person.birthday,
            "deathday": person.deathday,
            "place_of_birth": person.place_of_birth,
            "gender": person.gender,
            "popularity": person.popularity or 0.0,
            "scene_count": person.scene_count,
            "rating_porndb": person.rating_porndb,
            "known_for_department": person.known_for_department,
            "is_adult": person.is_adult,
            "profile_path": (
                self._resolve_img(override_dict.get("custom_poster"), "people")
                if override_dict and override_dict.get("custom_poster")
                else (self._resolve_img(person.local_profile_path, "people") or self._resolve_img(person.profile_path, "people"))
            ),
            "backdrop_path": self._resolve_img(effective_backdrop, "backdrops", size="original"),
            "backdrop_source_tmdb_id": source_tmdb_id,
            "backdrop_source_media_type": source_media_type,
            "is_active": person.is_active,
            "is_favorite": override_dict.get("is_favorite") if override_dict else False,
            "user_rating": override_dict.get("user_rating") if override_dict else None,
            "user_comment": override_dict.get("user_comment") if override_dict else None,
            "custom_tags": override_dict.get("custom_tags") if override_dict else [],
            "homepage": person.homepage,
            "external_ids": external_ids,
            "images": [self._resolve_img(img, "people") for img in (person.images or [])],
            "hair_color": person.hair_color,
            "eye_color": person.eye_color,
            "ethnicity": person.ethnicity,
            "height": person.height,
            "weight": person.weight,
            "measurements": person.measurements,
            "cup_size": person.cup_size,
            "band_size": person.band_size,
            "waist": person.waist,
            "hip": person.hip,
            "breast_type": person.breast_type,
            "breast_size": person.breast_size,
            "butt_shape": person.butt_shape,
            "butt_size": person.butt_size,
            "tattoos": person.tattoos,
            "piercings": person.piercings,
            "same_sex_only": person.same_sex_only,
            "socials": person.socials or {},
            "career_start_year": person.career_start_year,
            "career_end_year": person.career_end_year,
            "known_for": [
                {
                    **item,
                    "poster_path": self._resolve_img(item.get("poster_path"), "posters") if item.get("poster_path") else None,
                    "backdrop_path": self._resolve_img(item.get("backdrop_path"), "backdrops", size="original") if item.get("backdrop_path") else None,
                }
                for item in known_for[:10]
            ],
            **stats,
            "external_links": [],
            "primary_provider": person.primary_provider.value if person.primary_provider else None,
            "field_routing": person.field_routing
        }

        result["external_links"] = self.profile_merger.build_external_links(person, external_ids)
        return PersonDetailDTO(**result)
