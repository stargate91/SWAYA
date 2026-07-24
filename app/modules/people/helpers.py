from app.modules.people.domain.credits import (
    _normalize_words,
    _is_self_or_guest_credit,
    _department_matches_credit,
    _is_voice_credit,
    known_for_score,
    select_known_for,
    resolve_person_known_for_backdrop,
)
from app.modules.people.domain.formulas import (
    calculate_underage_threshold,
    calculate_butt_size,
    calculate_breast_size,
    is_underage_performer,
)
from app.modules.people.domain.images import merge_images
from app.modules.people.domain.filters import should_exclude_adult_performer
from typing import Optional

__all__ = [
    "_normalize_words",
    "_is_self_or_guest_credit",
    "_department_matches_credit",
    "_is_voice_credit",
    "known_for_score",
    "select_known_for",
    "resolve_person_known_for_backdrop",
    "calculate_underage_threshold",
    "calculate_butt_size",
    "calculate_breast_size",
    "is_underage_performer",
    "merge_images",
    "should_exclude_adult_performer",
    "resolve_and_enqueue_person_profile_image",
    "get_cup_size_sql_order",
    "query_local_profiles_by_tmdb_ids",
    "CUP_SIZE_ORDER",
]


def resolve_and_enqueue_person_profile_image(
    db,
    person,
    profile_url: str,
    image_downloader,
    provider_name: Optional[str] = None,
    external_id: Optional[str] = None,
    fallback_prov_val: str = "perf",
    ext: Optional[str] = None
) -> None:
    """
    Consolidated helper to resolve image filename (handling existing files) and enqueue download.
    """
    if not profile_url or not image_downloader:
        return

    import os
    from urllib.parse import urlparse
    from app.modules.media_assets.services.images import image_processing_service, image_path_resolver

    # 1. Normalize extension
    if not ext:
        try:
            path = urlparse(profile_url).path
            ext = os.path.splitext(path)[1].lower() if path else ".jpg"
        except Exception:
            ext = ".jpg"
    if not ext or ext == ".jpeg":
        ext = ".jpg"

    # 2. Check for TMDB specific filename
    tmdb_id = person.get_external_id("tmdb") if hasattr(person, "get_external_id") else None
    existing_file = None

    if tmdb_id:
        clean_path = os.path.basename(profile_url.lstrip("/"))
        filename = f"tmdb_{tmdb_id}_{clean_path}"
    else:
        # Resolve provider value and external ID
        prov_val = provider_name
        ext_id = external_id

        if not prov_val or not ext_id:
            if hasattr(person, "external_links") and person.external_links:
                for link in person.external_links:
                    provider_val = getattr(link.provider, "value", link.provider)
                    if provider_val and link.external_id:
                        prov_val = provider_val
                        ext_id = link.external_id
                        break
            if not prov_val or not ext_id:
                prov_val = fallback_prov_val
                ext_id = str(person.id) if person.id else "unknown"

        stem_filename = f"{prov_val}_{ext_id}"
        existing_file = image_path_resolver.find_existing_file_by_stem(
            image_processing_service.image_root, "original", "people", stem_filename
        ) or image_path_resolver.find_existing_file_by_stem(
            image_processing_service.image_root, "thumbnails", "people", stem_filename
        )
        if existing_file:
            filename = existing_file.name
        else:
            filename = f"{stem_filename}{ext}"

    person.local_profile_path = f"people/{filename}"
    try:
        db.commit()
        if not existing_file:
            url = image_downloader.get_download_url(profile_url, "people") or profile_url
            image_downloader.enqueue_download(url, "people", filename)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to resolve and enqueue performer image: {e}")

CUP_SIZE_ORDER = {
    'A': 1,
    'B': 2,
    'C': 3,
    'D': 4,
    'DD': 5,
    'E': 5,      # E is equivalent to DD
    'DDD': 6,
    'F': 6,      # F is equivalent to DDD
    'DDDD': 7,
    'G': 7,      # G is equivalent to DDDD
    'EE': 8,
    'FF': 9,
    'GG': 10,
    'H': 11,
    'HH': 12,
    'I': 13,
    'J': 14,
    'K': 15,
}

def get_cup_size_sql_order(column):
    """
    Returns a SQLAlchemy case statement representing the unified cup size sort order.
    """
    from sqlalchemy import case
    w_list = []
    for cup, val in sorted(CUP_SIZE_ORDER.items(), key=lambda x: x[1]):
        w_list.append((column == cup, val))
    return case(*w_list, else_=0)

def query_local_profiles_by_tmdb_ids(db, person_ids: set, current_uid: int) -> dict:
    """
    Queries local performer profiles matching TMDB IDs and returns custom overrides and birthdays.
    """
    local_profiles = {}
    if not person_ids:
        return local_profiles
    try:
        from app.core.enums import Provider
        from app.modules.people.models import Person, ExternalSourceLink
        from app.modules.users.models import UserOverride

        local_people = db.query(Person).join(ExternalSourceLink).filter(
            ExternalSourceLink.provider == Provider.TMDB,
            ExternalSourceLink.external_id.in_([str(pid) for pid in person_ids])
        ).all()
        
        local_person_ids = [lp.id for lp in local_people]
        overrides = db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            UserOverride.person_id.in_(local_person_ids)
        ).all()
        override_map = {ov.person_id: ov.custom_poster for ov in overrides if ov.custom_poster}

        for lp in local_people:
            tmdb_id_str = lp.get_external_id("tmdb")
            if tmdb_id_str:
                custom_img = override_map.get(lp.id)
                local_profiles[int(tmdb_id_str)] = {
                    "profile_path": custom_img or lp.local_profile_path or lp.profile_path,
                    "birthday": lp.birthday
                }
        
        missing_birthday_ids = [lp.id for lp in local_people if lp.birthday is None]
        if missing_birthday_ids:
            try:
                from app.modules.tasks import task_manager
                if task_manager.people_enrich_worker:
                    task_manager.people_enrich_worker.enqueue_people(missing_birthday_ids)
            except Exception as ex:
                import logging
                logging.getLogger(__name__).error(f"Failed to auto-enqueue missing birthdays: {ex}")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to query custom performer avatars: {e}")
    return local_profiles