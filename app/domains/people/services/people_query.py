from typing import Optional, Any
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.shared_kernel.enums import MediaType, RoleType, ItemStatus
from app.domains.people.models import Person, MediaPersonLink
from app.domains.metadata.models import MetadataMatch
from app.domains.people.schemas import PeopleSearchResponse

class PeopleQueryBuilder:
    def __init__(self, db: Session, library_port: Any, image_service: Any):
        self.db = db
        self.library_port = library_port
        self.image_service = image_service

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def get_people(
        self,
        search: str = None,
        role: str = None,
        sort_by: str = "library_count",
        include_inactive: bool = False,
        adult_only: bool = False,
        gender: str = "all",
        offset: int = 0,
        limit: int = 20,
    ) -> PeopleSearchResponse:
        db = self.db
        statuses = [ItemStatus.RENAMED, ItemStatus.ORGANIZED]

        matched_match_ids = self.library_port.get_matched_match_ids(statuses)
        
        join_cond = (MediaPersonLink.person_id == Person.id)
        if matched_match_ids:
            join_cond = join_cond & (MediaPersonLink.match_id.in_(matched_match_ids))
        else:
            join_cond = join_cond & (False)

        library_key = case(
            (
                MetadataMatch.media_type.in_([MediaType.TV, MediaType.EPISODE, MediaType.SEASON]),
                -func.coalesce(MetadataMatch.parent_id, MetadataMatch.id)
            ),
            else_=MetadataMatch.id
        )
        query = db.query(
            Person,
            func.count(func.distinct(library_key)).label("library_count"),
            func.max(
                case(
                    (MetadataMatch.is_adult, 1),
                    else_=0
                )
            ).label("linked_adult_flag")
        ).select_from(Person).outerjoin(
            MediaPersonLink, join_cond
        ).outerjoin(
            MetadataMatch, MediaPersonLink.match_id == MetadataMatch.id
        )
        
        if role == "Actor":
            query = query.filter((MediaPersonLink.role == RoleType.ACTOR) | (Person.known_for_department == "Acting"))
        elif role == "Director":
            query = query.filter((MediaPersonLink.role == RoleType.DIRECTOR) | (Person.known_for_department.in_(["Directing", "Creator"])))
        elif role == "Writer":
            query = query.filter((MediaPersonLink.role == RoleType.WRITER) | (Person.known_for_department == "Writing"))
        elif role == "Sound":
            query = query.filter((MediaPersonLink.role == RoleType.SOUND) | (Person.known_for_department == "Sound"))
            
            
        if gender == "female":
            query = query.filter(Person.gender == 1)
        elif gender == "male":
            query = query.filter(Person.gender == 2)

        if adult_only:
            query = query.filter(Person.is_adult)
        else:
            query = query.filter(~Person.is_adult)

        if search:
            query = query.filter(Person.name.ilike(f"%{search}%"))

        if not include_inactive:
            query = query.filter(Person.is_active)

        if sort_by in ("height", "height_asc", "height_desc"):
            query = query.filter(Person.height.isnot(None), Person.height > 0)
        elif sort_by in ("weight", "weight_asc", "weight_desc"):
            query = query.filter(Person.weight.isnot(None), Person.weight > 0)
        elif sort_by in ("cup_size", "cup_size_asc", "cup_size_desc"):
            query = query.filter(Person.cup_size.isnot(None), Person.cup_size != "")
        elif sort_by in ("waist", "waist_asc", "waist_desc"):
            query = query.filter(Person.waist.isnot(None), Person.waist > 0)
        elif sort_by in ("hip", "hip_asc", "hip_desc"):
            query = query.filter(Person.hip.isnot(None), Person.hip > 0)
        elif sort_by in ("hourglass_ratio", "hourglass_ratio_asc", "hourglass_ratio_desc", "body_slender", "body_slender_asc", "body_slender_desc", "body_curvy", "body_curvy_asc", "body_curvy_desc"):
            query = query.filter(Person.waist.isnot(None), Person.waist > 0, Person.hip.isnot(None), Person.hip > 0)

        query = query.group_by(Person.id)

        if include_inactive:
            query = query.having((Person.is_active) | (func.count(func.distinct(library_key)) > 0))

        # Build popularity score expression for SQL sorting
        popularity_score_expr = case(
            (
                (Person.is_adult) & (Person.rating_porndb is not None),
                Person.rating_porndb
            ),
            else_=func.coalesce(Person.popularity, 0.0)
        )

        cup_order = case(
            (Person.cup_size == 'A', 1),
            (Person.cup_size == 'B', 2),
            (Person.cup_size == 'C', 3),
            (Person.cup_size == 'D', 4),
            (Person.cup_size == 'DD', 5),
            (Person.cup_size == 'DDD', 6),
            (Person.cup_size == 'E', 7),
            (Person.cup_size == 'EE', 8),
            (Person.cup_size == 'F', 9),
            (Person.cup_size == 'FF', 10),
            (Person.cup_size == 'G', 11),
            (Person.cup_size == 'GG', 12),
            (Person.cup_size == 'H', 13),
            (Person.cup_size == 'HH', 14),
            (Person.cup_size == 'I', 15),
            (Person.cup_size == 'J', 16),
            (Person.cup_size == 'K', 17),
            else_=0
        )

        # Apply ordering in SQL
        if sort_by in ("library_count", "library_count_desc"):
            query = query.order_by(func.count(func.distinct(library_key)).desc(), popularity_score_expr.desc())
        elif sort_by == "library_count_asc":
            query = query.order_by(func.count(func.distinct(library_key)).asc(), popularity_score_expr.asc())
        elif sort_by in ("popularity", "popularity_desc"):
            query = query.order_by(popularity_score_expr.desc(), func.count(func.distinct(library_key)).desc())
        elif sort_by == "popularity_asc":
            query = query.order_by(popularity_score_expr.asc(), func.count(func.distinct(library_key)).asc())
        elif sort_by in ("name", "name_asc", "title_asc"):
            query = query.order_by(Person.name.asc())
        elif sort_by in ("name_desc", "title_desc"):
            query = query.order_by(Person.name.desc())
        elif sort_by in ("height", "height_asc"):
            query = query.order_by(Person.height.asc())
        elif sort_by == "height_desc":
            query = query.order_by(Person.height.desc())
        elif sort_by in ("weight", "weight_asc"):
            query = query.order_by(Person.weight.asc())
        elif sort_by == "weight_desc":
            query = query.order_by(Person.weight.desc())
        elif sort_by in ("cup_size", "cup_size_asc"):
            query = query.order_by(cup_order.asc())
        elif sort_by == "cup_size_desc":
            query = query.order_by(cup_order.desc())
        elif sort_by in ("waist", "waist_asc"):
            query = query.order_by(Person.waist.asc())
        elif sort_by == "waist_desc":
            query = query.order_by(Person.waist.desc())
        elif sort_by in ("hip", "hip_asc"):
            query = query.order_by(Person.hip.asc())
        elif sort_by == "hip_desc":
            query = query.order_by(Person.hip.desc())
        elif sort_by in ("hourglass_ratio", "hourglass_ratio_asc"):
            query = query.order_by((Person.waist * 1.0 / Person.hip).asc())
        elif sort_by == "hourglass_ratio_desc":
            query = query.order_by((Person.waist * 1.0 / Person.hip).desc())
        elif sort_by in ("body_slender", "body_slender_asc"):
            query = query.order_by((Person.waist + Person.hip).asc())
        elif sort_by == "body_slender_desc":
            query = query.order_by((Person.waist + Person.hip).desc())
        elif sort_by in ("body_curvy", "body_curvy_asc"):
            query = query.order_by((Person.waist + Person.hip).desc())
        elif sort_by == "body_curvy_desc":
            query = query.order_by((Person.waist + Person.hip).asc())

        # Get total count using subquery count in SQL
        total = db.query(func.count()).select_from(query.subquery()).scalar() or 0

        # Apply SQL-level offset and limit
        results = query.offset(offset).limit(limit).all()

        from app.domains.users.models import UserOverride
        from app.shared_kernel.user_context import get_current_user_id
        user_id = get_current_user_id() or 1

        person_ids = [person.id for person, _, _ in results]
        overrides = {}
        if person_ids:
            overrides = {
                o.person_id: o 
                for o in db.query(UserOverride).filter(
                    UserOverride.user_id == user_id, 
                    UserOverride.person_id.in_(person_ids)
                ).all()
            }

        people_list = []
        for person, library_count, linked_adult_flag in results:
            external_ids = dict(person.external_ids or {})
            for link in person.external_links:
                prov_key = link.provider.value
                if prov_key not in external_ids:
                    external_ids[prov_key] = link.external_id
                alt_key = f"{prov_key}_id" if prov_key != "porndb" else "theporndb_id"
                if alt_key not in external_ids:
                    external_ids[alt_key] = link.external_id
            if "tmdb" in external_ids and "tmdb_id" not in external_ids:
                external_ids["tmdb_id"] = external_ids["tmdb"]
            if "stashdb" in external_ids and "stashdb_id" not in external_ids:
                external_ids["stashdb_id"] = external_ids["stashdb"]
            if "porndb" in external_ids and "theporndb_id" not in external_ids:
                external_ids["theporndb_id"] = external_ids["porndb"]
            if "fansdb" in external_ids and "fansdb_id" not in external_ids:
                external_ids["fansdb_id"] = external_ids["fansdb"]

            override = overrides.get(person.id)
            people_list.append({
                "id": person.id,
                "name": person.name,
                "profile_path": self._resolve_img(person.profile_path, "people"),
                "gender": person.gender,
                "scene_count": person.scene_count,
                "rating_porndb": person.rating_porndb,
                "popularity": person.popularity or 0.0,
                "is_adult": person.is_adult,
                "is_active": person.is_active,
                "birthday": person.birthday,
                "library_count": library_count,
                "known_for": person.known_for_department,
                "external_ids": external_ids,
                "user_rating": override.user_rating if override else None,
                "user_comment": override.user_comment if override else None,
                "is_favorite": override.is_favorite if override else False,
                "cup_size": person.cup_size,
                "band_size": person.band_size,
                "waist": person.waist,
                "hip": person.hip,
                "height": person.height,
                "weight": person.weight,
                "hair_color": person.hair_color,
                "ethnicity": person.ethnicity,
                "eye_color": person.eye_color,
                "tattoos": person.tattoos,
                "piercings": person.piercings,
                "breast_type": person.breast_type,
                "butt_shape": person.butt_shape,
                "butt_size": person.butt_size,
            })

        has_more = offset + len(people_list) < total
        
        return PeopleSearchResponse(
            items=people_list,
            total=total,
            has_more=has_more,
            offset=offset,
            limit=limit
        )
