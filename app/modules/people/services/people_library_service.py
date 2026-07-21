import logging
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload

from app.modules.people.models import Person, MediaPersonLink
from app.core.user_context import get_current_user_id
from app.modules.people.schemas import PeopleGroupItem



logger = logging.getLogger(__name__)


class PeopleLibraryService:
    """
    Service for retrieving people (actors, directors, writers) in the context
    of the user's media library. Lives in the people domain since it primarily
    queries and formats Person entities.
    """

    def __init__(self, db_session: Session, library_port: Any, user_id: Optional[int] = None, image_service: Optional[ImageServicePort] = None):
        self.db = db_session
        if user_id is None:
            user_id = get_current_user_id()
        self.user_id = user_id
        if library_port is None:
            raise ValueError("library_port is required")
        self.library_port = library_port
        if image_service is None:
            from app.modules.media_assets.services.images import image_processing_service
            image_service = image_processing_service
        self.image_service = image_service

    def get_people_group(
        self,
        role: str,
        filter_status: str = "active",
        tab: str = "people",
        include_adult: bool = False,
    ) -> List[PeopleGroupItem]:
        """
        Retrieves list of actors, directors, or creators grouped by role.
        """
        normalized_role = "all"
        role_lower = str(role or "all").strip().lower()
        if role_lower in ("actors", "actor"):
            normalized_role = "actor"
        elif role_lower in ("directors", "director"):
            normalized_role = "director"
        elif role_lower in ("writers", "writer"):
            normalized_role = "writer"
        elif role_lower in ("sound", "composer", "composers"):
            normalized_role = "sound"

        # Resolve which matches are in the library using the port
        all_valid_match_ids = self.library_port.get_active_match_ids()

        # Fetch link counts
        links = self.db.query(
            MediaPersonLink.person_id,
            MediaPersonLink.match_id
        ).filter(
            MediaPersonLink.match_id.in_(all_valid_match_ids)
        ).all()
        
        person_projects = {}
        for person_id, match_id in links:
            if person_id not in person_projects:
                person_projects[person_id] = set()
            person_projects[person_id].add(match_id)
            
        project_counts = {
            pid: len(matches_set)
            for pid, matches_set in person_projects.items()
        }

        # Calculate watch, tag and finish counts for sorting/display
        from app.modules.metadata.models import MetadataMatch
        from app.modules.history.models import PlaybackLog, PlaybackPeakLog
        from sqlalchemy import func

        match_media_map = {}
        if all_valid_match_ids:
            match_media_map = dict(
                self.db.query(MetadataMatch.id, MetadataMatch.media_item_id)
                .filter(MetadataMatch.id.in_(all_valid_match_ids))
                .all()
            )

        person_media_items = {}
        for person_id, match_id in links:
            media_item_id = match_media_map.get(match_id)
            if media_item_id:
                if person_id not in person_media_items:
                    person_media_items[person_id] = set()
                person_media_items[person_id].add(media_item_id)

        all_linked_media_item_ids = set()
        for media_ids in person_media_items.values():
            all_linked_media_item_ids.update(media_ids)

        media_watch_counts = {}
        media_last_watch = {}
        media_finish_counts = {}
        media_last_finish = {}

        if all_linked_media_item_ids:
            playback_logs = self.db.query(
                PlaybackLog.media_item_id,
                PlaybackLog.watched_at
            ).filter(
                PlaybackLog.media_item_id.in_(list(all_linked_media_item_ids)),
                PlaybackLog.user_id == self.user_id
            ).all()

            for media_id, watched_at in playback_logs:
                media_watch_counts[media_id] = media_watch_counts.get(media_id, 0) + 1
                if media_id not in media_last_watch or watched_at > media_last_watch[media_id]:
                    media_last_watch[media_id] = watched_at

            peak_logs = self.db.query(
                PlaybackPeakLog.media_item_id,
                PlaybackPeakLog.created_at
            ).filter(
                PlaybackPeakLog.media_item_id.in_(list(all_linked_media_item_ids)),
                PlaybackPeakLog.user_id == self.user_id
            ).all()

            for media_id, created_at in peak_logs:
                media_finish_counts[media_id] = media_finish_counts.get(media_id, 0) + 1
                if media_id not in media_last_finish or created_at > media_last_finish[media_id]:
                    media_last_finish[media_id] = created_at

        person_watch_counts = {}
        person_last_watch = {}
        person_finish_counts = {}
        person_last_finish = {}

        for pid, media_ids in person_media_items.items():
            w_count = 0
            l_watch = None
            for mid in media_ids:
                w_count += media_watch_counts.get(mid, 0)
                watched = media_last_watch.get(mid)
                if watched:
                    if l_watch is None or watched > l_watch:
                        l_watch = watched
            person_watch_counts[pid] = w_count
            person_last_watch[pid] = l_watch

            f_count = 0
            l_finish = None
            for mid in media_ids:
                f_count += media_finish_counts.get(mid, 0)
                finished = media_last_finish.get(mid)
                if finished:
                    if l_finish is None or finished > l_finish:
                        l_finish = finished
            person_finish_counts[pid] = f_count
            person_last_finish[pid] = l_finish

        from app.modules.users.models import UserOverride, user_override_tags
        tag_counts = dict(
            self.db.query(
                UserOverride.person_id,
                func.count(user_override_tags.c.tag_id)
            ).join(
                user_override_tags, UserOverride.id == user_override_tags.c.user_override_id
            ).filter(
                UserOverride.person_id.isnot(None),
                UserOverride.user_id == self.user_id
            ).group_by(
                UserOverride.person_id
            ).all()
        )

        # Fetch people
        query = self.db.query(Person).options(
            selectinload(Person.media_links)
        )

        if filter_status == "active":
            query = query.filter(Person.is_active)
        elif filter_status == "inactive":
            query = query.filter(~Person.is_active)

        query = query.filter(Person.is_adult == include_adult)

        fallback_name = "Unknown Person"
        if normalized_role == "actor":
            query = query.filter(Person.known_for_department == "Acting")
            fallback_name = "Unknown Actor"
        elif normalized_role == "director":
            query = query.filter(Person.known_for_department.in_(["Directing", "Creator"]))
            fallback_name = "Unknown Director"
        elif normalized_role == "writer":
            query = query.filter(Person.known_for_department == "Writing")
            fallback_name = "Unknown Writer"
        elif normalized_role == "sound":
            query = query.filter(Person.known_for_department == "Sound")
            fallback_name = "Unknown Composer"

        people = query.distinct().all()

        people_list = []
        for person in people:
            override_dict = self.library_port.get_person_user_override(self.user_id, person.id)
            
            raw_poster = (override_dict.get("custom_poster") if override_dict else None) or person.local_profile_path or person.profile_path
            poster_path = self.image_service.resolve_image_url(raw_poster, "people")
            
            people_list.append(PeopleGroupItem(
                id=person.id,
                name=person.name or fallback_name,
                year=None,
                poster_path=poster_path,
                rating=(
                    person.rating_porndb
                    if person.is_adult and person.rating_porndb is not None
                    else person.popularity or 0.0
                ),
                popularity=person.popularity or 0.0,
                scene_count=person.scene_count,
                rating_porndb=person.rating_porndb,
                type="person",
                is_active=person.is_active,
                is_favorite=override_dict.get("is_favorite") if override_dict else False,
                user_rating=override_dict.get("user_rating") if override_dict else None,
                user_comment=override_dict.get("user_comment") if override_dict else None,
                birthday=person.birthday or "",
                gender=person.gender,
                library_count=project_counts.get(person.id, 0),
                people_role=person.known_for_department.lower() if person.known_for_department else "person",
                is_adult_person=person.is_adult,
                external_ids=person.external_ids or {},
                cup_size=person.cup_size,
                band_size=person.band_size,
                waist=person.waist,
                hip=person.hip,
                height=person.height,
                weight=person.weight,
                hair_color=person.hair_color,
                ethnicity=person.ethnicity,
                eye_color=person.eye_color,
                tattoos=person.tattoos,
                piercings=person.piercings,
                breast_type=person.breast_type,
                breast_size=person.breast_size,
                butt_shape=person.butt_shape,
                butt_size=person.butt_size,
                last_watched_at=person_last_watch.get(person.id).isoformat() if person_last_watch.get(person.id) else None,
                watch_count=person_watch_counts.get(person.id, 0),
                tag_count=tag_counts.get(person.id, 0),
                finish_count=person_finish_counts.get(person.id, 0),
                last_finish_at=person_last_finish.get(person.id).isoformat() if person_last_finish.get(person.id) else None,
            ))

        return people_list
