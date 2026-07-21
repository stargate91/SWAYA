import logging
from typing import Optional, List, Any
from sqlalchemy.orm import Session

from app.modules.library.models import MediaItem
from app.modules.metadata.models import MetadataMatch
from app.core.enums import ItemStatus, Provider, ScanMode
from app.modules.scrapers.resolvers.adult.confidence_calculator import AdultConfidenceCalculator
from app.modules.scrapers.resolvers.adult.match_collator import AdultMatchCollator
from app.modules.scrapers.resolvers.adult.scorer import validate_hash_match
from app.modules.scrapers.resolvers.adult.persister import persist_scene_match
from app.modules.scrapers.resolvers.adult.resolver_factory import AdultResolverFactory

logger = logging.getLogger(__name__)

class AdultResolutionOrchestrator:
    def __init__(self):
        self.factory = AdultResolverFactory()
        self.confidence_calculator = AdultConfidenceCalculator()
        self.match_collator = AdultMatchCollator()

    def _extract_scene_search_queries(self, item: MediaItem) -> List[str]:
        """Extracts potential scene titles from parsed file metadata."""
        parsed = item.parsed_info or {}
        queries = []
        for key in ('fn', 'fd', 'it'):
            data = parsed.get(key) or {}
            unique_title = data.get('alternative_title') or data.get('episode_title')
            if unique_title:
                if isinstance(unique_title, list):
                    for t in unique_title:
                        if isinstance(t, str) and t.strip() and t not in queries:
                            queries.append(t)
                elif isinstance(unique_title, str) and unique_title.strip() and unique_title not in queries:
                    queries.append(unique_title)
        return queries

    def resolve_adult_item(
        self,
        db: Session,
        scraper_gateway: Any,
        scraper_log_repo: Any,
        item: MediaItem,
        mode: ScanMode = ScanMode.SCENES,
        task_id: Optional[int] = None,
        preferred_provider: Optional[Provider] = None
    ):
        """Orchestrates query matching logic against available providers using hash or title fallbacks."""
        existing_match = db.query(MetadataMatch).filter(
            MetadataMatch.media_item_id == item.id
        ).first()
        preserve_existing_match = preferred_provider is not None and item.status == ItemStatus.MATCHED and existing_match is not None
        previous_status = item.status

        scrapers_to_try = self.factory.build_scrapers_to_try(db, scraper_gateway, preferred_provider)
        logger.info('[adult:%s] Resolving %s | file=%s | oshash=%s | phash=%s', mode.value, item.id, item.filename, (item.hash_oshash or '')[:12], (item.hash_phash or '')[:12])
        logger.info('[adult:%s] Providers to try: %s', mode.value, [provider.value for _resolver, provider in scrapers_to_try])

        if not scrapers_to_try:
            logger.warning('No adult metadata provider API key configured.')
            item.status = previous_status if preserve_existing_match else ItemStatus.NO_MATCH
            db.flush()
            return

        for resolver, provider in scrapers_to_try:
            scene_data = None
            matched_hash_type = None
            hash_status = None

            if provider in (Provider.STASHDB, Provider.FANSDB):
                for hash_type, hash_value in [('oshash', item.hash_oshash), ('phash', item.hash_phash)]:
                    if scene_data or not hash_value:
                        continue
                    logger.info('[adult:%s] Trying %s %s lookup for %s', mode.value, provider.value, hash_type.upper(), item.filename)
                    scene_data, hash_status = resolver.resolve_by_hash(item, hash_type, hash_value, validate_hash_match)
                    if scene_data:
                        matched_hash_type = hash_type
            elif provider == Provider.PORNDB:
                for hash_type, hash_value in [('oshash', item.hash_oshash)]:
                    if scene_data or not hash_value:
                        continue
                    scene_data, hash_status = resolver.resolve_by_hash(item, hash_type, hash_value, validate_hash_match)
                    if scene_data:
                        matched_hash_type = hash_type

            if scene_data and hash_status:
                logger.info('[adult:%s] Hash lookup matched %s -> provider=%s external_id=%s title=%s status=%s', mode.value, item.filename, provider.value, scene_data.get('id'), scene_data.get('title'), hash_status.value)
                persist_scene_match(
                    db,
                    item=item,
                    provider=provider,
                    scraper=resolver.scraper,
                    scene_data=scene_data,
                    confidence=1.0,
                    status=hash_status,
                    media_item_id=item.id,
                )
                scraper_log_repo.log_search(
                    task_id=task_id,
                    media_item_id=item.id,
                    provider=provider,
                    search_query=f'hash: oshash={item.hash_oshash}, phash={item.hash_phash}',
                    result_count=1,
                    details={
                        'hash_match': True,
                        'hash_type': matched_hash_type,
                        'matched_scene_id': str(scene_data['id']),
                        'final_status': hash_status.value if hash_status else None
                    },
                )
                db.flush()
                return

            search_queries = self._extract_scene_search_queries(item)
            logger.info('[adult:%s] Scene fallback queries for %s -> %s', mode.value, item.filename, search_queries)
            if not search_queries:
                continue

            all_candidates = []
            for search_title in search_queries:
                scenes = resolver.search_by_text(search_title)
                for scene in scenes:
                    score = self.confidence_calculator.calculate_title_score(search_title, scene.get('title'))
                    if score >= 0.5:
                        all_candidates.append((score, scene, search_title, scenes))

            if not all_candidates:
                continue

            matched_candidates, uncertain_candidates = self.match_collator.collate_candidates(
                item, all_candidates, self.confidence_calculator
            )

            # 1. Check matched candidates
            if matched_candidates:
                if len(matched_candidates) == 1:
                    score, best_scene, best_query, best_scenes = matched_candidates[0]
                    persist_scene_match(
                        db,
                        item=item,
                        provider=provider,
                        scraper=resolver.scraper,
                        scene_data=best_scene,
                        confidence=score,
                        status=ItemStatus.MATCHED,
                        media_item_id=item.id,
                    )
                    scraper_log_repo.log_search(
                        task_id=task_id,
                        media_item_id=item.id,
                        provider=provider,
                        search_query=best_query,
                        result_count=len(best_scenes),
                        details={
                            'hash_match': False,
                            'best_score': score,
                            'matched_scene_id': str(best_scene['id']),
                            'final_status': 'matched',
                        },
                    )
                    db.flush()
                    return
                else:
                    db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).delete()
                    seen_ids = set()
                    for score, scene, q, s in matched_candidates:
                        scene_id = scene.get("id")
                        if not scene_id or scene_id in seen_ids:
                            continue
                        seen_ids.add(scene_id)
                        persist_scene_match(
                            db,
                            item=item,
                            provider=provider,
                            scraper=resolver.scraper,
                            scene_data=scene,
                            confidence=score,
                            is_active=False,
                            clear_existing=False,
                            status=ItemStatus.MULTIPLE,
                            media_item_id=item.id,
                        )
                    scraper_log_repo.log_search(
                        task_id=task_id,
                        media_item_id=item.id,
                        provider=provider,
                        search_query=matched_candidates[0][2],
                        result_count=len(matched_candidates[0][3]),
                        details={
                            'hash_match': False,
                            'best_score': matched_candidates[0][0],
                            'candidate_count': len(matched_candidates),
                            'matched_scene_ids': list(seen_ids),
                            'final_status': 'multiple',
                        },
                    )
                    db.flush()
                    return

            # 2. Check uncertain candidates
            if uncertain_candidates:
                if len(uncertain_candidates) == 1:
                    score, best_scene, best_query, best_scenes = uncertain_candidates[0]
                    persist_scene_match(
                        db,
                        item=item,
                        provider=provider,
                        scraper=resolver.scraper,
                        scene_data=best_scene,
                        confidence=score,
                        status=ItemStatus.UNCERTAIN,
                        media_item_id=item.id,
                    )
                    scraper_log_repo.log_search(
                        task_id=task_id,
                        media_item_id=item.id,
                        provider=provider,
                        search_query=best_query,
                        result_count=len(best_scenes),
                        details={
                            'hash_match': False,
                            'best_score': score,
                            'matched_scene_id': str(best_scene['id']),
                            'final_status': 'uncertain',
                        },
                    )
                    db.flush()
                    return
                else:
                    db.query(MetadataMatch).filter(MetadataMatch.media_item_id == item.id).delete()
                    seen_ids = set()
                    for score, scene, q, s in uncertain_candidates:
                        scene_id = scene.get("id")
                        if not scene_id or scene_id in seen_ids:
                            continue
                        seen_ids.add(scene_id)
                        persist_scene_match(
                            db,
                            item=item,
                            provider=provider,
                            scraper=resolver.scraper,
                            scene_data=scene,
                            confidence=score,
                            is_active=False,
                            clear_existing=False,
                            status=ItemStatus.MULTIPLE,
                            media_item_id=item.id,
                        )
                    scraper_log_repo.log_search(
                        task_id=task_id,
                        media_item_id=item.id,
                        provider=provider,
                        search_query=uncertain_candidates[0][2],
                        result_count=len(uncertain_candidates[0][3]),
                        details={
                            'hash_match': False,
                            'best_score': uncertain_candidates[0][0],
                            'candidate_count': len(uncertain_candidates),
                            'matched_scene_ids': list(seen_ids),
                            'final_status': 'multiple',
                        },
                    )
                    db.flush()
                    return

        if preserve_existing_match:
            logger.info(
                '[adult:%s] No match for %s on preferred provider %s, keeping existing match',
                mode.value,
                item.filename,
                preferred_provider.value,
            )
            item.status = previous_status
        else:
            logger.info('[adult:%s] No match for %s after all providers', mode.value, item.filename)
            item.status = ItemStatus.NO_MATCH
        db.flush()
