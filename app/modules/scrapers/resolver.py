import re
import unicodedata
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch, MetadataLocalization

from app.core.enums import MediaType, ItemStatus, ScanMode
from app.modules.scrapers.resolve_pipelines import get_resolver_pipeline
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE

def _has_episode_value(episode) -> bool:
    if isinstance(episode, list):
        return len(episode) > 0
    return episode not in (None, "")

def determine_resolved_media_shape(media_kind: Any, season=None, episode=None):
    if media_kind in (MediaType.MOVIE, "movie"):
        return MediaType.MOVIE, ItemStatus.MATCHED
    if media_kind in (MediaType.SCENE, "scene"):
        return MediaType.SCENE, ItemStatus.MATCHED

    has_season = season not in (None, "")
    has_episode = _has_episode_value(episode)

    if has_season and has_episode:
        return MediaType.EPISODE, ItemStatus.MATCHED
    
    return MediaType.EPISODE, ItemStatus.UNCERTAIN

def normalize_title(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]", "", normalized.lower())

def normalize_title_words(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return " ".join(re.findall(r"[a-z0-9]+", normalized.lower()))



class Resolver:
    """
    Dispatcher facade that delegates resolution to MainstreamResolver or AdultResolver.
    """

    def __init__(self, db_session: Session):
        self.db = db_session
        from app.modules.scrapers.resolvers.mainstream_resolver import MainstreamResolver
        from app.modules.scrapers.resolvers.adult_resolver import AdultResolver
        from app.modules.scrapers.resolvers.porndb_movie_resolver import PornDBMovieResolver
        self.mainstream = MainstreamResolver(db_session)
        self.adult = AdultResolver(db_session)
        self.porndb_movies = PornDBMovieResolver(db_session)

    def resolve_item(
        self,
        item: MediaItem,
        mode: ScanMode = ScanMode.MOVIES_TV,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
        include_adult: Optional[bool] = None,
        provider: Optional[str] = None,
    ):
        """Resolves MediaItem search candidates and populates matches."""
        if include_adult is None:
            include_adult = self._adult_access_enabled()

        pipeline = get_resolver_pipeline(
            mode,
            self.mainstream,
            self.adult,
            self.porndb_movies,
            include_adult=include_adult,
            provider=provider,
        )
        pipeline.resolve_item(
            item,
            language=language,
            task_id=task_id,
        )

    def _adult_access_enabled(self, user_id: int = 1) -> bool:
        from app.modules.settings.services.settings_service import SettingsService
        val = SettingsService(self.db).get_setting("include_adult", user_id=user_id)
        return str(val).strip().lower() in ("true", "1")

    def _resolve_adult_item(self, item: MediaItem, mode: ScanMode, task_id: Optional[int] = None):
        """Resolves adult items by delegating to AdultResolver."""
        self.adult.resolve_adult_item(item, mode, task_id)

    def propagate_match(self, source_item: MediaItem):
        """
        Copies the active match to other files sharing the same group_hash.
        """
        if not source_item.group_hash:
            return

        active_match = self.db.query(MetadataMatch).filter(
            MetadataMatch.media_item_id == source_item.id
        ).first()

        if not active_match:
            return

        # Find other files with the same group hash
        siblings = self.db.query(MediaItem).filter(
            MediaItem.group_hash == source_item.group_hash,
            MediaItem.id != source_item.id
        ).all()

        for sib in siblings:
            # Delete old matches
            self.db.query(MetadataMatch).filter(MetadataMatch.media_item_id == sib.id).delete()
            
            # Create new match
            from app.core.episode_utils import extract_season_from_parsed_info, extract_episode_from_parsed_info
            s_num = extract_season_from_parsed_info(sib.parsed_info) or active_match.season_number
            ep_num = extract_episode_from_parsed_info(sib.parsed_info) or active_match.episode_number

            new_match = MetadataMatch(
                media_item_id=sib.id,
                provider=active_match.provider,
                external_id=active_match.external_id,
                media_type=active_match.media_type,
                season_number=s_num,
                episode_number=ep_num,
                release_date=active_match.release_date,
                last_air_date=active_match.last_air_date,
                confidence_score=active_match.confidence_score,
                rating_tmdb=active_match.rating_tmdb,
                rating_porndb=active_match.rating_porndb,
                is_adult=active_match.is_adult,
                original_title=active_match.original_title,
                runtime=active_match.runtime,
                suggested_tags=active_match.suggested_tags,
                raw_metadata=active_match.raw_metadata,
                vote_count_tmdb=active_match.vote_count_tmdb,
                backdrop_path=active_match.backdrop_path,
                local_backdrop_path=active_match.local_backdrop_path,
                still_path=active_match.still_path,
                local_still_path=active_match.local_still_path,
                stills=active_match.stills,
                local_stills=active_match.local_stills,
            )
            self.db.add(new_match)
            self.db.flush()

            # Copy localizations
            for loc in active_match.localizations:
                new_loc = MetadataLocalization(
                    match_id=new_match.id,
                    locale=loc.locale,
                    title=loc.title,
                    tagline=loc.tagline,
                    overview=loc.overview,
                    poster_path=loc.poster_path,
                    genres=loc.genres
                )
                self.db.add(new_loc)
            
            _, sib_status = determine_resolved_media_shape(
                new_match.media_type,
                new_match.season_number,
                new_match.episode_number
            )
            sib.status = sib_status
        
        self.db.flush()


