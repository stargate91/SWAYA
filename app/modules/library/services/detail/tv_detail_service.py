import logging
from typing import Any, Optional
from sqlalchemy.orm import Session, joinedload
from app.core.identifier_utils import parse_identifier


# Import strategy formatters
from app.modules.library.services.detail.formatters.tv_show import TvShowFormatter
from app.modules.library.services.detail.formatters.tv_season import TvSeasonFormatter
from app.core.enums import MediaType, ItemStatus, Provider
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.modules.users.models import UserOverride
from app.modules.library.services.detail.detail_mixins import OverrideResolver

logger = logging.getLogger(__name__)

class TvDetailService:
    def __init__(self, db: Session, scrapers: Any):
        self.db = db
        self.scrapers = scrapers
        self.tmdb_scraper = scrapers.get_scraper(Provider.TMDB, db)
        self.show_formatter = TvShowFormatter()
        self.season_formatter = TvSeasonFormatter()

    def get_library_tv_detail(self, tv_tmdb_id: str, seasons_limit: int = 999, initial_episodes_limit: int = 999, language: str = None):
        return self.show_formatter.format(
            tv_tmdb_id=tv_tmdb_id,
            db=self.db,
            tmdb_scraper=self.tmdb_scraper,
            seasons_limit=seasons_limit,
            initial_episodes_limit=initial_episodes_limit,
            language=language,
            omdb_scraper=self.scrapers.get_scraper(Provider.OMDB, self.db)
        )

    def get_library_tv_season_detail(self, tv_tmdb_id: str, season_number: int):
        return self.season_formatter.format(
            tv_tmdb_id=tv_tmdb_id,
            season_number=season_number,
            db=self.db,
            tmdb_scraper=self.tmdb_scraper
        )

    def get_next_episode(self, tv_tmdb_id: str, current_uid: int = 1) -> Optional[dict]:
        parsed = parse_identifier(str(tv_tmdb_id))
        if parsed:
            try:
                tv_tmdb_id_int = int(parsed.external_id)
            except ValueError:
                return None
        else:
            try:
                tv_tmdb_id_int = int(tv_tmdb_id)
            except ValueError:
                return None


        # Fetch local items for this show's episodes
        local_items = self.db.query(MediaItem).options(
            joinedload(MediaItem.matches)
        ).join(MediaItem.matches).filter(
            MetadataMatch.external_id == str(tv_tmdb_id_int),
            MetadataMatch.media_type == MediaType.EPISODE,
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
        ).all()

        if not local_items:
            return None

        # Gather metadata matches of episodes
        episode_matches = self.db.query(MetadataMatch).filter(
            MetadataMatch.provider == Provider.TMDB,
            MetadataMatch.media_type == MediaType.EPISODE,
            MetadataMatch.external_id == str(tv_tmdb_id_int)
        ).all()

        episode_match_map = {}
        for m in episode_matches:
            if m.season_number is not None and m.episode_number is not None:
                episode_match_map[(m.season_number, m.episode_number)] = m

        local_item_ids = [item.id for item in local_items]
        episode_match_ids = [m.id for m in episode_matches]

        # Gather user overrides
        overrides = self.db.query(UserOverride).filter(
            UserOverride.user_id == current_uid,
            (UserOverride.metadata_match_id.in_(episode_match_ids)) | (UserOverride.media_item_id.in_(local_item_ids))
        ).all() if (episode_match_ids or local_item_ids) else []

        metadata_override_map = {o.metadata_match_id: o for o in overrides if o.metadata_match_id}
        physical_override_map = {o.media_item_id: o for o in overrides if o.media_item_id}

        owned_episodes = []
        for item in local_items:
            for match in item.matches:
                if match.season_number is not None and match.season_number > 0 and match.episode_number is not None:
                    s_num = match.season_number
                    ep_num = match.episode_number
                    
                    # Resolve watch state
                    ep_match = episode_match_map.get((s_num, ep_num))
                    metadata_override = metadata_override_map.get(ep_match.id) if ep_match else None
                    physical_override = physical_override_map.get(item.id)

                    is_watched, watch_count, resume_position, _ = OverrideResolver.merge_watch_state(
                        metadata_override=metadata_override,
                        physical_override=physical_override
                    )

                    owned_episodes.append({
                        "id": f"tmdb_{tv_tmdb_id_int}_{s_num}_{ep_num}",
                        "media_item_id": item.id,
                        "season_number": s_num,
                        "episode_number": ep_num,
                        "resume_position": resume_position,
                        "is_watched": is_watched,
                        "title": ep_match.original_title if ep_match else f"Episode {ep_num}"
                    })

        if not owned_episodes:
            return None

        # Sort chronologically
        owned_episodes.sort(key=lambda x: (x["season_number"], x["episode_number"]))

        # 1. First in-progress
        next_ep = next((ep for ep in owned_episodes if ep["resume_position"] > 0), None)
        if next_ep:
            return next_ep

        # 2. First unwatched
        next_ep = next((ep for ep in owned_episodes if not ep["is_watched"]), None)
        if next_ep:
            return next_ep

        # 3. Fallback to first owned
        return owned_episodes[0]

