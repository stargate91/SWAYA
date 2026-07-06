from typing import Tuple, List
from sqlalchemy.orm import Session

from app.domains.people.services.people_library_service import PeopleLibraryService
from app.domains.library.services.listing.filter_params import ListingFilterParams

from app.shared_kernel.ports.library_port import LibraryPort

class PeopleQueryBuilder:
    def __init__(self, db: Session, library_port: LibraryPort):
        self.db = db
        self.library_port = library_port

    def query_people(self, params: ListingFilterParams) -> Tuple[int, List[dict]]:
        people_service = PeopleLibraryService(self.db, library_port=self.library_port)
        people_items = people_service.get_people_group(
            role=params.people_role,
            filter_status=params.filter_status,
            tab=params.tab,
            include_adult=params.include_adult,
        )

        if params.search:
            search_lower = params.search.lower()
            people_items = [
                item for item in people_items
                if search_lower in (item.name or "").lower()
            ]

        if params.filter_gender == "female":
            people_items = [item for item in people_items if item.gender == 1]
        elif params.filter_gender == "male":
            people_items = [item for item in people_items if item.gender == 2]

        def norm_cmp(val1, val2):
            if not val1 or not val2:
                return False
            return str(val1).replace("_", " ").strip().lower() == str(val2).replace("_", " ").strip().lower()

        if params.filter_hair_color:
            people_items = [item for item in people_items if norm_cmp(item.hair_color, params.filter_hair_color)]
        if params.filter_ethnicity:
            people_items = [item for item in people_items if norm_cmp(item.ethnicity, params.filter_ethnicity)]
        if params.filter_eye_color:
            people_items = [item for item in people_items if norm_cmp(item.eye_color, params.filter_eye_color)]
        if params.filter_tattoos:
            if params.filter_tattoos.lower() == "yes":
                people_items = [item for item in people_items if item.tattoos and str(item.tattoos).strip().lower() not in ("no", "none", "nincs")]
            else:
                people_items = [item for item in people_items if not item.tattoos or str(item.tattoos).strip().lower() in ("no", "none", "nincs")]
        if params.filter_piercings:
            if params.filter_piercings.lower() == "yes":
                people_items = [item for item in people_items if item.piercings and str(item.piercings).strip().lower() not in ("no", "none", "nincs")]
            else:
                people_items = [item for item in people_items if not item.piercings or str(item.piercings).strip().lower() in ("no", "none", "nincs")]
        if params.filter_breast_type:
            people_items = [item for item in people_items if norm_cmp(item.breast_type, params.filter_breast_type)]
        if params.filter_butt_shape:
            people_items = [item for item in people_items if norm_cmp(item.butt_shape, params.filter_butt_shape)]
        if params.filter_butt_size:
            people_items = [item for item in people_items if norm_cmp(item.butt_size, params.filter_butt_size)]

        if params.filter_favorite == "favorite":
            people_items = [item for item in people_items if item.is_favorite]
        elif params.filter_favorite == "not_favorite":
            people_items = [item for item in people_items if not item.is_favorite]

        if params.selected_tags:
            from app.domains.users.models import UserOverride, Tag, user_override_tags
            matching_person_ids = [
                r[0] for r in self.db.query(UserOverride.person_id).join(
                    user_override_tags, UserOverride.id == user_override_tags.c.user_override_id
                ).join(
                    Tag, Tag.id == user_override_tags.c.tag_id
                ).filter(
                    Tag.name.in_(params.selected_tags),
                    UserOverride.person_id.isnot(None)
                ).all()
            ]
            people_items = [item for item in people_items if item.id in matching_person_ids]

        # Hide performers who do not have the active sorted attribute
        if params.sort_by in ("height_desc", "height_asc"):
            people_items = [item for item in people_items if item.height and item.height > 0]
        elif params.sort_by in ("weight_desc", "weight_asc"):
            people_items = [item for item in people_items if item.weight and item.weight > 0]
        elif params.sort_by in ("cup_size_desc", "cup_size_asc"):
            people_items = [item for item in people_items if item.cup_size]
        elif params.sort_by in ("waist_desc", "waist_asc"):
            people_items = [item for item in people_items if item.waist and item.waist > 0]
        elif params.sort_by in ("hip_desc", "hip_asc"):
            people_items = [item for item in people_items if item.hip and item.hip > 0]
        elif params.sort_by in ("hourglass_ratio_desc", "hourglass_ratio_asc", "body_slender_desc", "body_slender_asc", "body_curvy_desc", "body_curvy_asc"):
            people_items = [item for item in people_items if item.waist and item.waist > 0 and item.hip and item.hip > 0]
        elif params.sort_by in ("birthday", "birthday_desc", "birthday_asc"):
            people_items = [item for item in people_items if item.birthday]

        if params.sort_by in ("library_count", "library_count_desc"):
            people_items.sort(key=lambda item: (-(item.library_count or 0), -(item.rating or 0.0), (item.name or "").lower()))
        elif params.sort_by == "library_count_asc":
            people_items.sort(key=lambda item: ((item.library_count or 0), (item.rating or 0.0), (item.name or "").lower()))
        elif params.sort_by == "watch_count_desc":
            people_items.sort(key=lambda item: (-(item.watch_count or 0), -(item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by == "watch_count_asc":
            people_items.sort(key=lambda item: ((item.watch_count or 0), (item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by == "last_watched_desc":
            people_items.sort(key=lambda item: (item.last_watched_at or "0000-00-00T00:00:00", (item.name or "").lower()), reverse=True)
        elif params.sort_by == "last_watched_asc":
            people_items.sort(key=lambda item: (item.last_watched_at or "9999-12-31T23:59:59", (item.name or "").lower()))
        elif params.sort_by == "tag_count_desc":
            people_items.sort(key=lambda item: (-(item.tag_count or 0), (item.name or "").lower()))
        elif params.sort_by == "tag_count_asc":
            people_items.sort(key=lambda item: ((item.tag_count or 0), (item.name or "").lower()))
        elif params.sort_by == "finish_count_desc":
            people_items.sort(key=lambda item: (-(item.finish_count or 0), -(item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by == "finish_count_asc":
            people_items.sort(key=lambda item: ((item.finish_count or 0), (item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by == "last_finish_desc":
            people_items.sort(key=lambda item: (item.last_finish_at or "0000-00-00T00:00:00", (item.name or "").lower()), reverse=True)
        elif params.sort_by == "last_finish_asc":
            people_items.sort(key=lambda item: (item.last_finish_at or "9999-12-31T23:59:59", (item.name or "").lower()))
        elif params.sort_by in ("rating_desc", "user_rating_desc"):
            people_items.sort(key=lambda item: (-(item.user_rating if item.user_rating is not None else item.rating or 0.0), -(item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by in ("user_rating_asc", "rating_asc"):
            people_items.sort(key=lambda item: ((item.user_rating if item.user_rating is not None else item.rating or 0.0), (item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by == "popularity_desc":
            people_items.sort(key=lambda item: (-(item.popularity or 0.0), -(item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by == "popularity_asc":
            people_items.sort(key=lambda item: ((item.popularity or 0.0), (item.library_count or 0), (item.name or "").lower()))
        elif params.sort_by in ("birthday", "birthday_desc"):
            people_items.sort(key=lambda item: (item.birthday or "0000-00-00", (item.name or "").lower()), reverse=True)
        elif params.sort_by == "birthday_asc":
            people_items.sort(key=lambda item: (item.birthday or "9999-99-99", (item.name or "").lower()))
        elif params.sort_by in ("cup_size_desc", "cup_size_asc"):
            cup_order = {
                'A': 1, 'B': 2, 'C': 3, 'D': 4, 'DD': 5, 'DDD': 6, 'E': 7, 'EE': 8, 'F': 9, 'FF': 10,
                'G': 11, 'GG': 12, 'H': 13, 'HH': 14, 'I': 15, 'J': 16, 'K': 17
            }
            def get_volume_score(item):
                cup_val = cup_order.get(str(item.cup_size or "").strip().upper(), 0)
                if cup_val == 0:
                    return None
                band_val = float(item.band_size) if item.band_size else 34.0
                return cup_val + (band_val - 30.0) / 2.0

            if params.sort_by == "cup_size_desc":
                people_items.sort(key=lambda item: (
                    -get_volume_score(item) if get_volume_score(item) is not None else 999.0,
                    (item.name or "").lower()
                ))
            else:
                people_items.sort(key=lambda item: (
                    get_volume_score(item) if get_volume_score(item) is not None else 999.0,
                    (item.name or "").lower()
                ))
        elif params.sort_by == "waist_desc":
            people_items.sort(key=lambda item: (
                -(item.waist or 0),
                (item.name or "").lower()
            ))
        elif params.sort_by == "waist_asc":
            people_items.sort(key=lambda item: (
                item.waist or 999,
                (item.name or "").lower()
            ))
        elif params.sort_by == "hip_desc":
            people_items.sort(key=lambda item: (
                -(item.hip or 0),
                (item.name or "").lower()
            ))
        elif params.sort_by == "hip_asc":
            people_items.sort(key=lambda item: (
                item.hip or 999,
                (item.name or "").lower()
            ))
        elif params.sort_by == "height_desc":
            people_items.sort(key=lambda item: (
                -(item.height or 0),
                (item.name or "").lower()
            ))
        elif params.sort_by == "height_asc":
            people_items.sort(key=lambda item: (
                item.height or 999,
                (item.name or "").lower()
            ))
        elif params.sort_by == "weight_desc":
            people_items.sort(key=lambda item: (
                -(item.weight or 0),
                (item.name or "").lower()
            ))
        elif params.sort_by == "weight_asc":
            people_items.sort(key=lambda item: (
                item.weight or 9999,
                (item.name or "").lower()
            ))
        elif params.sort_by in ("hourglass_ratio_desc", "hourglass_ratio_asc"):
            def get_whr(item):
                try:
                    w = float(item.waist) if item.waist else 0.0
                    h = float(item.hip) if item.hip else 0.0
                    if w > 0 and h > 0:
                        return w / h
                except (ValueError, TypeError):
                    pass
                return None

            if params.sort_by == "hourglass_ratio_asc":
                people_items.sort(key=lambda item: (
                    get_whr(item) if get_whr(item) is not None else 9.9,
                    (item.name or "").lower()
                ))
            else:
                people_items.sort(key=lambda item: (
                    -get_whr(item) if get_whr(item) is not None else 9.9,
                    (item.name or "").lower()
                ))
        elif params.sort_by in ("body_slender_asc", "body_slender_desc"):
            def get_slender_score(item):
                try:
                    w = float(item.waist) if item.waist else 0.0
                    height = float(item.height) if item.height else 0.0
                    if w > 0:
                        h_cm = height if height > 0 else 165.0
                        w_cm = w * 2.54
                        return w_cm / h_cm
                except (ValueError, TypeError):
                    pass
                return None

            if params.sort_by == "body_slender_asc":
                people_items.sort(key=lambda item: (
                    get_slender_score(item) if get_slender_score(item) is not None else 999.0,
                    (item.name or "").lower()
                ))
            else:
                people_items.sort(key=lambda item: (
                    -get_slender_score(item) if get_slender_score(item) is not None else -999.0,
                    (item.name or "").lower()
                ))
        elif params.sort_by in ("body_curvy_desc", "body_curvy_asc"):
            def get_curvy_score(item):
                try:
                    w = float(item.waist) if item.waist else 0.0
                    h = float(item.hip) if item.hip else 0.0
                    if w > 0 and h > 0:
                        lower_diff = (h - w) * 2.54
                        cup_order = {
                            'A': 1, 'B': 2, 'C': 3, 'D': 4, 'DD': 5, 'DDD': 6, 'E': 7, 'EE': 8, 'F': 9, 'FF': 10,
                            'G': 11, 'GG': 12, 'H': 13, 'HH': 14, 'I': 15, 'J': 16, 'K': 17
                        }
                        cup_val = cup_order.get(str(item.cup_size or "").strip().upper(), 0)
                        band_val = float(item.band_size) if item.band_size else 34.0
                        breast_score = (cup_val + (band_val - 30.0) / 2.0) if cup_val > 0 else 0.0
                        return lower_diff + breast_score
                except (ValueError, TypeError):
                    pass
                return None

            if params.sort_by == "body_curvy_desc":
                people_items.sort(key=lambda item: (
                    -get_curvy_score(item) if get_curvy_score(item) is not None else -999.0,
                    (item.name or "").lower()
                ))
            else:
                people_items.sort(key=lambda item: (
                    get_curvy_score(item) if get_curvy_score(item) is not None else 999.0,
                    (item.name or "").lower()
                ))
        elif params.sort_by in ("name_desc", "title_desc"):
            people_items.sort(key=lambda item: (item.name or "").lower(), reverse=True)
        elif params.sort_by in ("random", "random_desc", "random_asc"):
            import random
            random.shuffle(people_items)
        else:
            people_items.sort(key=lambda item: (item.name or "").lower())

        total_items = len(people_items)
        paged_people = people_items[(params.page - 1) * params.page_size: params.page * params.page_size]

        formatted_items = [
            {
                "id": item.id,
                "title": item.name,
                "name": item.name,
                "year": item.year,
                "poster_path": item.poster_path,
                "backdrop_path": None,
                "rating": item.rating,
                "popularity": item.popularity,
                "rating_porndb": item.rating_porndb,
                "rating_imdb": None,
                "type": item.type,
                "path": None,
                "duration": 0.0,
                "size": 0,
                "in_library": True,
                "release_date": None,
                "user_rating": item.user_rating,
                "user_comment": item.user_comment,
                "is_favorite": item.is_favorite,
                "is_active": item.is_active,
                "gender": item.gender,
                "birthday": item.birthday,
                "library_count": item.library_count,
                "people_role": item.people_role,
                "is_adult_person": item.is_adult_person,
                "external_ids": item.external_ids,
                "cup_size": item.cup_size,
                "band_size": item.band_size,
                "waist": item.waist,
                "hip": item.hip,
                "height": item.height,
                "weight": item.weight,
                "hair_color": item.hair_color,
                "ethnicity": item.ethnicity,
                "eye_color": item.eye_color,
                "tattoos": item.tattoos,
                "piercings": item.piercings,
                "breast_type": item.breast_type,
                "last_watched_at": item.last_watched_at,
                "watch_count": item.watch_count,
                "tag_count": item.tag_count,
                "finish_count": item.finish_count,
                "last_finish_at": item.last_finish_at,
            }
            for item in paged_people
        ]

        return total_items, formatted_items
