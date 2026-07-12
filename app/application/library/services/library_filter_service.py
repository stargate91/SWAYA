import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.domains.metadata.models import MetadataMatch, MetadataLocalization
from app.domains.users.models import Tag
from app.domains.library.schemas import FilterOptionsResponse, TagGroupItem
from app.shared_kernel.ports.user_repository_port import UserRepositoryPort

logger = logging.getLogger(__name__)

class LibraryFilterService:
    def __init__(self, db_session: Session, user_repository: Optional[UserRepositoryPort] = None):
        self.db = db_session
        self.user_repository = user_repository

    def get_library_filter_options(self, params) -> FilterOptionsResponse:
        """
        Retrieves filter options available for the specified library tab.
        """
        tab = params.tab
        is_adult = "adult" in tab.lower() or tab.lower() == "scenes"
        
        from app.domains.library.models import MediaItem
        from app.shared_kernel.enums import ItemStatus, MediaType
        from sqlalchemy import select
        
        lib_statuses = [ItemStatus.ORGANIZED, ItemStatus.RENAMED]
        
        # Use query builders to dynamically construct the filtered MetadataMatch IDs list
        if tab == "movies":
            from app.domains.library.services.listing.builders.movie import MovieQueryBuilder
            q, _, _ = MovieQueryBuilder(self.db).build_query(params)
            match_ids_subquery = q.with_entities(MetadataMatch.id).scalar_subquery()
        elif tab in ("scenes", "adult_scenes"):
            from app.domains.library.services.listing.builders.scene import SceneQueryBuilder
            q, _, _ = SceneQueryBuilder(self.db).build_query(params)
            match_ids_subquery = q.with_entities(MetadataMatch.id).scalar_subquery()
        elif tab in ("tv", "series", "tv_shows", "adult_tv", "adult_series"):
            from app.domains.library.services.listing.builders.tv import TvQueryBuilder
            q, _, _ = TvQueryBuilder(self.db).build_query(params)
            match_ids_subquery = q.with_entities(MetadataMatch.id).scalar_subquery()
        elif tab in ("videos", "adult_videos"):
            from app.domains.library.services.listing.builders.video import VideoQueryBuilder
            q, _, _ = VideoQueryBuilder(self.db).build_query(params)
            match_ids_subquery = q.with_entities(MetadataMatch.id).scalar_subquery()
        else:
            # Fallback static query if tab is unknown
            match_ids_subquery = select(MetadataMatch.id).join(MediaItem).filter(
                MediaItem.status.in_(lib_statuses),
                MetadataMatch.is_active,
                MetadataMatch.is_adult == is_adult
            ).scalar_subquery()
            
        # 1. Fetch years
        query_years = self.db.query(MetadataMatch.release_date).filter(
            MetadataMatch.id.in_(match_ids_subquery),
            MetadataMatch.release_date.isnot(None)
        ).distinct().all()
        
        years = sorted(list(set(r.release_date.year for r in query_years if r.release_date)), reverse=True)

        # 2. Fetch genres
        from app.shared_kernel.genre_utils import split_genres as _split_genres
        query_genres = self.db.query(MetadataLocalization.genres).filter(
            MetadataLocalization.match_id.in_(match_ids_subquery),
            MetadataLocalization.genres.isnot(None)
        ).all()
        
        genres_set = set()
        for row in query_genres:
            if row.genres and isinstance(row.genres, list):
                for genre in _split_genres(row.genres):
                    if genre:
                        genres_set.add(genre.strip())
        genres = sorted(list(genres_set))

        tags_query = self.db.query(Tag).filter(Tag.is_adult == is_adult).all()
        tags = [
            {
                "id": t.id,
                "name": t.name,
                "color": t.color,
                "is_adult": t.is_adult
            }
            for t in tags_query
        ]

        performers = []
        studios = []
        hair_colors = []
        ethnicities = []
        eye_colors = []
        tattoos = []
        piercings = []
        breast_types = []
        butt_shapes = []
        butt_sizes = []
        if True:
            from app.domains.people.models import Person, MediaPersonLink
            from app.domains.metadata.models import Studio
            from app.infrastructure.settings.db_settings_adapter import DbSettingsAdapter

            settings_adapter = DbSettingsAdapter(self.db)
            gender_pref = settings_adapter.get_setting("adult_gender_preference") if is_adult else "all"

            if "people" in tab.lower():
                people_q = select(Person.id).filter(
                    Person.is_adult == is_adult,
                    Person.is_active == True
                )

                # Apply role filter
                if params.people_role and params.people_role != "all":
                    role_lower = params.people_role.strip().lower()
                    if role_lower in ("actor", "actors"):
                        people_q = people_q.filter(Person.known_for_department == "Acting")
                    elif role_lower in ("director", "directors"):
                        people_q = people_q.filter(Person.known_for_department.in_(["Directing", "Creator"]))
                    elif role_lower in ("writer", "writers"):
                        people_q = people_q.filter(Person.known_for_department == "Writing")
                    elif role_lower == "sound":
                        people_q = people_q.filter(Person.known_for_department == "Sound")

                # Apply gender filter
                if params.filter_gender and params.filter_gender != "all":
                    if params.filter_gender == "female":
                        people_q = people_q.filter(Person.gender.in_([1, "1"]))
                    elif params.filter_gender == "male":
                        people_q = people_q.filter(Person.gender.in_([2, "2"]))

                # Apply favorite filter
                if params.filter_favorite and params.filter_favorite != "all":
                    from app.domains.users.models import UserOverride
                    fav_person_ids = select(UserOverride.person_id).filter(
                        UserOverride.person_id.isnot(None),
                        UserOverride.is_favorite == True
                    ).scalar_subquery()
                    if params.filter_favorite == "favorite":
                        people_q = people_q.filter(Person.id.in_(fav_person_ids))
                    elif params.filter_favorite == "not_favorite":
                        people_q = people_q.filter(~Person.id.in_(fav_person_ids))

                # Apply attribute filters
                def _apply_attr_filter(q, column, value):
                    if not value:
                        return q
                    from sqlalchemy import or_
                    val_str = str(value).strip()
                    return q.filter(
                        column.isnot(None),
                        column != "",
                        or_(
                            column.ilike(val_str),
                            column.ilike(val_str.replace("_", " ")),
                            column.ilike(val_str.replace(" ", "_"))
                        )
                    )

                people_q = _apply_attr_filter(people_q, Person.hair_color, params.filter_hair_color)
                people_q = _apply_attr_filter(people_q, Person.ethnicity, params.filter_ethnicity)
                people_q = _apply_attr_filter(people_q, Person.eye_color, params.filter_eye_color)
                people_q = _apply_attr_filter(people_q, Person.breast_type, params.filter_breast_type)
                people_q = _apply_attr_filter(people_q, Person.butt_shape, params.filter_butt_shape)
                people_q = _apply_attr_filter(people_q, Person.butt_size, params.filter_butt_size)

                # Apply tattoos/piercings (yes/no toggle)
                if params.filter_tattoos:
                    if params.filter_tattoos.lower() == "yes":
                        people_q = people_q.filter(Person.tattoos.isnot(None), Person.tattoos != "", ~Person.tattoos.in_(["No", "None", "Nincs", "no", "none", "nincs"]))
                    else:
                        from sqlalchemy import or_
                        people_q = people_q.filter(or_(Person.tattoos.is_(None), Person.tattoos == "", Person.tattoos.in_(["No", "None", "Nincs", "no", "none", "nincs"])))

                if params.filter_piercings:
                    if params.filter_piercings.lower() == "yes":
                        people_q = people_q.filter(Person.piercings.isnot(None), Person.piercings != "", ~Person.piercings.in_(["No", "None", "Nincs", "no", "none", "nincs"]))
                    else:
                        from sqlalchemy import or_
                        people_q = people_q.filter(or_(Person.piercings.is_(None), Person.piercings == "", Person.piercings.in_(["No", "None", "Nincs", "no", "none", "nincs"])))

                # Apply tags filter
                if params.selected_tags:
                    from app.domains.users.models import UserOverride, Tag as UserTag, user_override_tags
                    tagged_person_ids = select(UserOverride.person_id).join(
                        user_override_tags, UserOverride.id == user_override_tags.c.user_override_id
                    ).join(
                        UserTag, UserTag.id == user_override_tags.c.tag_id
                    ).filter(
                        UserTag.name.in_(params.selected_tags),
                        UserOverride.person_id.isnot(None)
                    ).scalar_subquery()
                    people_q = people_q.filter(Person.id.in_(tagged_person_ids))

                active_people_ids = people_q.scalar_subquery()
            else:
                active_people_ids = select(MediaPersonLink.person_id).filter(
                    MediaPersonLink.match_id.in_(match_ids_subquery)
                ).scalar_subquery()

            performers_query = self.db.query(Person.id, Person.name).join(
                MediaPersonLink, MediaPersonLink.person_id == Person.id
            ).filter(
                MediaPersonLink.match_id.in_(match_ids_subquery)
            )

            if gender_pref == "female":
                performers_query = performers_query.filter(Person.gender.in_([1, "1"]))
            elif gender_pref == "male":
                performers_query = performers_query.filter(Person.gender.in_([2, "2"]))

            performers_query = performers_query.distinct().order_by(Person.name.asc()).all()
            performers = [{"id": r.id, "name": r.name} for r in performers_query]

            active_studios = self.db.query(Studio).join(
                Studio.matches
            ).filter(
                MetadataMatch.id.in_(match_ids_subquery)
            ).distinct().all()
            
            studio_map = {}
            for s in active_studios:
                studio_map[s.id] = s
                if s.parent_studio_id:
                    if s.parent_studio_id not in studio_map:
                        parent = s.parent_studio or self.db.query(Studio).filter(Studio.id == s.parent_studio_id).first()
                        if parent:
                            studio_map[parent.id] = parent
            
            # Group into parents and children
            parents = [s for s in studio_map.values() if s.parent_studio_id is None]
            children = [s for s in studio_map.values() if s.parent_studio_id is not None]
            
            # Sort parents alphabetically
            parents.sort(key=lambda x: (x.name or "").lower())
            
            # Group children by their parent_studio_id
            children_by_parent = {}
            for c in children:
                children_by_parent.setdefault(c.parent_studio_id, []).append(c)
                
            # Sort each group of children alphabetically
            for p_id in children_by_parent:
                children_by_parent[p_id].sort(key=lambda x: (x.name or "").lower())
                
            hierarchical_studios = []
            for p in parents:
                hierarchical_studios.append((p, False))
                # Add children of this parent
                if p.id in children_by_parent:
                    for c in children_by_parent[p.id]:
                        hierarchical_studios.append((c, True))
                        
            # Add any orphaned children that didn't find their parent in parents list
            orphaned_children = [c for c in children if c.parent_studio_id not in studio_map]
            if orphaned_children:
                orphaned_children.sort(key=lambda x: (x.name or "").lower())
                for c in orphaned_children:
                    hierarchical_studios.append((c, False))
                    
            # Build final list with indentation for children
            studios = []
            for s, is_child in hierarchical_studios:
                name = s.name or ""
                if is_child:
                    name = f"  ↳ {name}"
                studios.append({"id": s.id, "name": name})

            def normalize_options(raw_list):
                seen = set()
                result = []
                for val in raw_list:
                    if not val:
                        continue
                    cleaned = str(val).replace("_", " ").strip().title()
                    if cleaned.upper() in ("NA", "N/A"):
                        cleaned = "N/A"
                    if cleaned and cleaned not in seen:
                        seen.add(cleaned)
                        result.append(cleaned)
                return sorted(result)

            hair_colors_query = self.db.query(Person.hair_color).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.hair_color.isnot(None),
                Person.hair_color != ""
            ).distinct().all()
            hair_colors = normalize_options([r[0] for r in hair_colors_query])

            ethnicities_query = self.db.query(Person.ethnicity).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.ethnicity.isnot(None),
                Person.ethnicity != ""
            ).distinct().all()
            ethnicities = normalize_options([r[0] for r in ethnicities_query])

            eye_colors_query = self.db.query(Person.eye_color).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.eye_color.isnot(None),
                Person.eye_color != ""
            ).distinct().all()
            eye_colors = normalize_options([r[0] for r in eye_colors_query])

            from sqlalchemy import or_
            _no_values = ["No", "None", "Nincs", "no", "none", "nincs"]

            _tattoo_yes = self.db.query(Person.id).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.tattoos.isnot(None),
                Person.tattoos != "",
                ~Person.tattoos.in_(_no_values)
            ).first() is not None
            _tattoo_no = self.db.query(Person.id).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                or_(Person.tattoos.is_(None), Person.tattoos == "", Person.tattoos.in_(_no_values))
            ).first() is not None
            if _tattoo_yes:
                tattoos.append("yes")
            if _tattoo_no:
                tattoos.append("no")

            _piercing_yes = self.db.query(Person.id).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.piercings.isnot(None),
                Person.piercings != "",
                ~Person.piercings.in_(_no_values)
            ).first() is not None
            _piercing_no = self.db.query(Person.id).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                or_(Person.piercings.is_(None), Person.piercings == "", Person.piercings.in_(_no_values))
            ).first() is not None
            if _piercing_yes:
                piercings.append("yes")
            if _piercing_no:
                piercings.append("no")

            breast_types_query = self.db.query(Person.breast_type).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.breast_type.isnot(None),
                Person.breast_type != ""
            ).distinct().all()
            breast_types = normalize_options([r[0] for r in breast_types_query])

            butt_shapes_query = self.db.query(Person.butt_shape).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.butt_shape.isnot(None),
                Person.butt_shape != ""
            ).distinct().all()
            butt_shapes = normalize_options([r[0] for r in butt_shapes_query])

            butt_sizes_query = self.db.query(Person.butt_size).filter(
                Person.id.in_(active_people_ids),
                Person.is_adult == is_adult,
                Person.butt_size.isnot(None),
                Person.butt_size != ""
            ).distinct().all()
            butt_sizes = normalize_options([r[0] for r in butt_sizes_query])

        return FilterOptionsResponse(
            genres=genres,
            years=years,
            tags=tags,
            performers=performers,
            studios=studios,
            hair_colors=hair_colors,
            ethnicities=ethnicities,
            eye_colors=eye_colors,
            tattoos=tattoos,
            piercings=piercings,
            breast_types=breast_types,
            butt_shapes=butt_shapes,
            butt_sizes=butt_sizes
        )

    def get_tag_groups(self, is_adult: bool = False) -> List[TagGroupItem]:
        """
        Retrieves available tag groups, with each tag enriched with its associated items.
        """
        # Self-healing: Mark tags as adult if they are linked to adult items/performers
        if self.user_repository:
            self.user_repository.auto_heal_adult_tags()

        from app.shared_kernel.enums import MediaType
        from app.domains.metadata.models import MetadataMatch, MetadataLocalization
        from app.domains.people.models import Person
        from app.domains.media_assets.services.images import image_processing_service

        tags_query = self.db.query(Tag).filter(Tag.is_adult == is_adult).all()
        if not tags_query:
            return []

        tags = []
        for t in tags_query:
            tag_data = {
                "id": t.id,
                "name": t.name,
                "color": t.color,
                "is_adult": t.is_adult,
                "movies": [],
                "tv": [],
                "people": [],
                "adult": [],
                "adult_tv": [],
                "adult_people": [],
                "adult_scenes": [],
                "videos": [],
                "adult_videos": [],
            }

            for o in t.overrides:
                if o.person_id:
                    person = self.db.query(Person).filter(Person.id == o.person_id).first()
                    if person:
                        p_img = image_processing_service.resolve_image_url(person.profile_path, "people")
                        
                        # Dynamically resolve an automatic backdrop from the person's linked media items
                        p_backdrop = None
                        for link in person.media_links:
                            if link.match and (link.match.local_backdrop_path or link.match.backdrop_path):
                                p_backdrop = image_processing_service.resolve_image_url(
                                    link.match.local_backdrop_path or link.match.backdrop_path, 
                                    "backdrops"
                                )
                                break

                        p_item = {
                            "id": person.id,
                            "title": person.name,
                            "name": person.name,
                            "poster_path": p_img,
                            "profile_path": p_img,
                            "backdrop_path": p_backdrop,
                            "type": "person",
                        }
                        if person.is_adult:
                            tag_data["adult_people"].append(p_item)
                        else:
                            tag_data["people"].append(p_item)
                else:
                    match = None
                    if o.metadata_match_id:
                        match = self.db.query(MetadataMatch).filter(MetadataMatch.id == o.metadata_match_id).first()
                    elif o.media_item_id:
                        match = self.db.query(MetadataMatch).filter(
                            MetadataMatch.media_item_id == o.media_item_id,
                            MetadataMatch.is_active
                        ).first()

                    if match:
                        loc = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == match.id).first()
                        item = match.media_item

                        title = (o.custom_title if o.custom_title else None) or (loc.title if loc else (item.filename if item else "Unknown"))
                        poster_path = (o.custom_poster if o.custom_poster else None) or (loc.local_poster_path if (loc and loc.local_poster_path) else (loc.poster_path if loc else None))
                        resolved_poster = image_processing_service.resolve_image_url(poster_path, "posters")

                        resolved_backdrop = image_processing_service.resolve_image_url(
                            match.local_backdrop_path or match.backdrop_path, 
                            "backdrops"
                        )
                        resolved_still = image_processing_service.resolve_image_url(
                            match.local_still_path or match.still_path, 
                            "stills"
                        )

                        p_list = []
                        if match.people_links:
                            for pl in match.people_links:
                                if pl.person:
                                    p_list.append({
                                        "id": pl.person.id,
                                        "name": pl.person.name,
                                        "gender": pl.person.gender
                                    })

                        m_item = {
                            "id": item.id if item else f"stash_{match.external_id}" if match.media_type == MediaType.SCENE else f"tmdb_{match.external_id}",
                            "title": title,
                            "poster_path": resolved_poster,
                            "backdrop_path": resolved_backdrop,
                            "still_path": resolved_still or resolved_backdrop,
                            "type": match.media_type.value,
                            "year": match.release_date.year if match.release_date else None,
                            "release_date": match.release_date.isoformat() if match.release_date else None,
                            "is_favorite": o.is_favorite,
                            "user_rating": o.user_rating,
                            "is_adult": bool(match.is_adult),
                            "is_home_video": bool(match.is_home_video),
                            "people": p_list,
                            "last_air_date": match.last_air_date.isoformat() if (hasattr(match, "last_air_date") and match.last_air_date) else None,
                            "release_status": match.release_status if hasattr(match, "release_status") else None,
                        }

                        if match.media_type == MediaType.MOVIE:
                            if match.is_adult:
                                tag_data["adult"].append(m_item)
                            else:
                                tag_data["movies"].append(m_item)
                        elif match.media_type == MediaType.TV:
                            if match.is_adult:
                                tag_data["adult_tv"].append(m_item)
                            else:
                                tag_data["tv"].append(m_item)
                        elif match.media_type == MediaType.SCENE:
                            if match.is_home_video:
                                if match.is_adult:
                                    tag_data["adult_videos"].append(m_item)
                                else:
                                    tag_data["videos"].append(m_item)
                            else:
                                tag_data["adult_scenes"].append(m_item)

            tags.append(tag_data)

        return [
            TagGroupItem(
                id=1,
                name="General" if not is_adult else "Adult",
                tags=tags
            )
        ]
