import logging
import asyncio
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.modules.metadata.models import MetadataMatch
from app.core.enums import Provider, MediaType
from app.core.language import get_user_ui_language, get_user_fallback_language
from app.modules.settings.adapters.db_settings_adapter import DbSettingsAdapter
from app.modules.scrapers.support.gateway import scraper_gateway
from app.modules.scrapers.enrichment.mainstream_enricher import MainstreamEnricher

logger = logging.getLogger(__name__)

class MetadataSyncService:
    def trigger_sync(self, db: Session, scrapers: Any, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Creates and starts a background task to synchronize metadata language for all matched items."""
        from app.modules.tasks import task_manager
        
        task_id = task_manager.create_task(name="metadata_language_sync")
        
        # Start background task wrapper
        task_manager.start_task(task_id, self.run_sync_task)
        
        return {
            "status": "success",
            "message": "Metadata language sync started in the background",
            "task_id": task_id
        }

    def get_sync_status(self) -> Dict[str, Any]:
        """Provides status (compatibility stub for routes/dashboard)."""
        return {
            "active": False,
            "progress": 100,
            "phase": "idle",
            "status": "success"
        }

    async def run_sync_task(self, task_id: int):
        """Asynchronously updates metadata language and assets for matched items in the background."""
        from app.modules.tasks import task_manager
        from app.core.database import SessionLocal

        logger.info(f"Background metadata language sync task {task_id} starting.")
        
        db = SessionLocal()
        try:
            # Query all active TMDB matches linked to local files
            matches = db.query(MetadataMatch).filter(
                MetadataMatch.provider == Provider.TMDB,
                MetadataMatch.is_active == True,
                MetadataMatch.media_item_id.isnot(None),
                MetadataMatch.media_type.in_([MediaType.MOVIE, MediaType.TV, MediaType.EPISODE])
            ).all()

            total = len(matches)
            if total == 0:
                logger.info("No active TMDB matches found to sync.")
                task_manager.update_progress(task_id, 100.0)
                return

            settings_port = DbSettingsAdapter(db)
            primary_lang = get_user_ui_language(settings_port)
            fallback_lang = get_user_fallback_language(settings_port)

            enricher = MainstreamEnricher(db)

            for idx, match in enumerate(matches):
                if task_manager.is_cancelled(task_id):
                    logger.info(f"Sync task {task_id} was cancelled by user.")
                    break

                try:
                    logger.debug(f"Syncing match {match.id} (type: {match.media_type.value}, ext_id: {match.external_id}) to {primary_lang}")
                    enricher.enrich_match(match, language=primary_lang, fallback_language=fallback_lang, commit=True)
                except Exception as e:
                    logger.error(f"Failed to sync language for match {match.id}: {e}", exc_info=True)
                    db.rollback()

                progress = ((idx + 1) / total) * 100.0
                task_manager.update_progress(task_id, progress)

                # Small sleep to yield execution and allow other tasks to run / avoid rate limits
                await asyncio.sleep(0.05)

            logger.info(f"Sync task {task_id} completed successfully.")
        except Exception as e:
            logger.error(f"Sync task {task_id} failed: {e}", exc_info=True)
            raise
        finally:
            db.close()
