import logging
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.shared_kernel.enums import MediaType
from app.domains.metadata.models import MetadataMatch

logger = logging.getLogger(__name__)

class TvEpisodeShifter:
    def shift_tv_episode_match(
        self,
        db: Session,
        item: Any,
        parsed: dict,
        new_season: Any,
        new_episode: Any,
        custom_language: Optional[str],
        reset_match: bool
    ) -> None:
        """Shifts an episode's metadata match to a different season/episode and triggers re-enrichment."""
        if reset_match:
            return
        active_match = next((m for m in item.matches if m.is_active), None) or next((m for m in item.matches), None)
        if active_match and active_match.media_type in (MediaType.SEASON, MediaType.EPISODE, MediaType.TV):
            tv_match = None
            current = active_match
            while current:
                if current.media_type == MediaType.TV:
                    tv_match = current
                    break
                current = current.parent
                if not current and active_match.parent_id is not None:
                    current = db.query(MetadataMatch).filter(MetadataMatch.id == active_match.parent_id).first()
            
            if tv_match:
                try:
                    ns_num = int(new_season) if new_season is not None and str(new_season).isdigit() else (int(parsed.get("season")) if str(parsed.get("season")).isdigit() else 1)
                    ne_num = int(new_episode) if new_episode is not None and str(new_episode).isdigit() else (int(parsed.get("episode")) if str(parsed.get("episode")).isdigit() else 1)
                    
                    season_match = db.query(MetadataMatch).filter(
                        MetadataMatch.provider == tv_match.provider,
                        MetadataMatch.parent_id == tv_match.id,
                        MetadataMatch.media_type == MediaType.SEASON,
                        MetadataMatch.season_number == ns_num
                    ).first()
                    if not season_match:
                        season_match = MetadataMatch(
                            provider=tv_match.provider,
                            external_id=f"{tv_match.external_id}-s{ns_num}",
                            media_type=MediaType.SEASON,
                            season_number=ns_num,
                            parent_id=tv_match.id,
                            confidence_score=1.0,
                            is_adult=tv_match.is_adult
                        )
                        db.add(season_match)
                        db.flush()
                        
                    episode_match = db.query(MetadataMatch).filter(
                        MetadataMatch.provider == tv_match.provider,
                        MetadataMatch.parent_id == season_match.id,
                        MetadataMatch.media_type == MediaType.EPISODE,
                        MetadataMatch.episode_number == ne_num
                    ).first()
                    if not episode_match:
                        episode_match = db.query(MetadataMatch).filter(
                            MetadataMatch.media_item_id == item.id,
                            MetadataMatch.provider == tv_match.provider,
                            MetadataMatch.external_id == tv_match.external_id,
                            MetadataMatch.media_type == MediaType.EPISODE
                        ).first()
                        
                        if episode_match:
                            episode_match.parent_id = season_match.id
                            episode_match.season_number = ns_num
                            episode_match.episode_number = ne_num
                            episode_match.is_active = True
                            episode_match.is_adult = tv_match.is_adult
                        else:
                            episode_match = MetadataMatch(
                                provider=tv_match.provider,
                                external_id=tv_match.external_id,
                                media_type=MediaType.EPISODE,
                                season_number=ns_num,
                                episode_number=ne_num,
                                parent_id=season_match.id,
                                confidence_score=1.0,
                                media_item_id=item.id,
                                is_active=True,
                                is_adult=tv_match.is_adult
                            )
                            db.add(episode_match)
                            db.flush()
                    else:
                        episode_match.media_item_id = item.id
                        episode_match.is_active = True
                        episode_match.is_adult = tv_match.is_adult
                        
                    for m in item.matches:
                        if m.id != episode_match.id:
                            m.is_active = False
                            m.media_item_id = None
                            
                    from app.infrastructure.scrapers.enrichment.mainstream_enricher import MainstreamEnricher
                    enricher = MainstreamEnricher(db)
                    enricher.enrich_matched_item(item, language=custom_language or "en")
                except Exception as e:
                    logger.error(f"Error shifting TV episode match: {e}")
