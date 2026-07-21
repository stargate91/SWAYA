import logging
from app.domains.people.models import Person, ExternalSourceLink
from app.shared_kernel.enums import Provider

logger = logging.getLogger(__name__)

def apply_enriched_data(enricher, person: Person, data: dict):
    provider_profiles = data.get("provider_profiles") or {}
    
    if data.get("urls"):
        ids = person.external_ids or {}
        existing_urls = ids.get("urls") or []
        existing_urls_set = {u.get("url") if isinstance(u, dict) else u for u in existing_urls}
        for new_url in data["urls"]:
            url_str = new_url.get("url") if isinstance(new_url, dict) else new_url
            if url_str and url_str not in existing_urls_set:
                existing_urls.append({"url": url_str})
                existing_urls_set.add(url_str)
        ids["urls"] = existing_urls
        person.external_ids = ids

    for link_to_create in data["links_to_create"]:
        prov_val = link_to_create["provider"]
        prov_enum = None
        if isinstance(prov_val, str):
            try:
                prov_enum = Provider(prov_val.lower())
            except ValueError:
                try:
                    prov_enum = Provider[prov_val.upper()]
                except KeyError as e:
                    logger.debug(f"Swallowed exception in domains/people/services/enrichment/persister.py:32: {e}", exc_info=True)
        elif isinstance(prov_val, Provider):
            prov_enum = prov_val

        if not prov_enum:
            continue

        already_added = False
        for obj in enricher.db.new:
            if (isinstance(obj, ExternalSourceLink) and 
                obj.person_id == person.id and 
                obj.provider == prov_enum and 
                obj.external_id == link_to_create["external_id"]):
                already_added = True
                break

        if already_added:
            continue

        link = enricher.db.query(ExternalSourceLink).filter(
            ExternalSourceLink.person_id == person.id,
            ExternalSourceLink.provider == prov_enum,
            ExternalSourceLink.external_id == link_to_create["external_id"]
        ).first()

        src_data = provider_profiles.get(prov_enum.value)
        profile_url = None
        if src_data and isinstance(src_data, dict):
            profile_url = src_data.get("profile_path")

        if not link:
            new_link = ExternalSourceLink(
                person_id=person.id,
                provider=prov_enum,
                external_id=link_to_create["external_id"],
                profile_url=profile_url,
                source_data=src_data if isinstance(src_data, dict) else None
            )
            enricher.db.add(new_link)
            person.external_links.append(new_link)
        else:
            if src_data and isinstance(src_data, dict):
                link.source_data = src_data
                if profile_url:
                    link.profile_url = profile_url

    for ext_link in person.external_links:
        prov_key = ext_link.provider.value
        if prov_key in provider_profiles:
            src_data = provider_profiles[prov_key]
            if isinstance(src_data, dict):
                ext_link.source_data = src_data
                profile_url = src_data.get("profile_path")
                if profile_url:
                    ext_link.profile_url = profile_url

    person.recalculate_projection(enricher.db)

    profile_path = person.profile_path
    if profile_path:
        tmdb_id = person.external_ids.get("tmdb") if person.external_ids else None
        
        from app.domains.media_assets.services.images import image_processing_service
        url = image_processing_service.get_download_url(profile_path, "people") or profile_path
        
        if tmdb_id:
            import os
            clean_path = os.path.basename(profile_path)
            filename = f"tmdb_{tmdb_id}_{clean_path}"
        else:
            import os
            ext = os.path.splitext(profile_path)[1] or ".jpg"
            if ext.lower() == ".jpeg":
                ext = ".jpg"
            ext_id = "unknown"
            prov_val = "perf"
            if person.external_ids:
                for k, v in person.external_ids.items():
                    if k != "urls" and v:
                        prov_val = k
                        ext_id = v
                        break
            stem_filename = f"{prov_val}_{ext_id}"
            from app.domains.media_assets.services.images import image_processing_service, image_path_resolver
            existing_file = image_path_resolver.find_existing_file_by_stem(image_processing_service.image_root, "original", "people", stem_filename) or image_path_resolver.find_existing_file_by_stem(image_processing_service.image_root, "thumbnails", "people", stem_filename)
            if existing_file:
                filename = existing_file.name
            else:
                filename = f"{stem_filename}{ext}"

        if enricher.image_downloader and not existing_file:
            enricher.image_downloader.enqueue_download(url, "people", filename)
        else:
            logger.warning("No image_downloader available for profile image download")
