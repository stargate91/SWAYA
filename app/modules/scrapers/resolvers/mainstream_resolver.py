import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.modules.library.models import MediaItem
from app.core.enums import Provider
from app.core.date_utils import get_year_from_date


from app.core.constants import DEFAULT_FALLBACK_LANGUAGE

from app.modules.scrapers.resolvers.mainstream import (
    QuerySanitizer,
    TitleMatcher,
    CandidateScorer,
    MatchPersister,
)

logger = logging.getLogger(__name__)

class MainstreamResolver:
    """
    Scraper match resolver that scores and matches MediaItems to TMDB candidates.
    """

    def __init__(self, db_session: Session, scraper_gateway: Optional[Any] = None):
        self.db = db_session
        from app.modules.scrapers.scraper_service import ScraperService
        from app.modules.scrapers.support.gateway import scraper_gateway as default_gateway
        self.scraper_gateway = scraper_gateway or default_gateway
        self.api = self.scraper_gateway.get_scraper(Provider.TMDB, db_session)
        self.scraper_log_repo = ScraperService(db_session)

        # Helper instances
        self.sanitizer = QuerySanitizer()
        self.title_matcher = TitleMatcher()
        self.candidate_scorer = CandidateScorer(self.title_matcher)
        self.match_persister = MatchPersister(
            db=db_session,
            api=self.api,
            log_search_fn=self._log_search,
            title_matcher=self.title_matcher,
            candidate_scorer=self.candidate_scorer,
        )

    def _log_search(self, task_id: Optional[int], media_item_id: Optional[int], provider: Provider, search_query: str, result_count: int, details: dict) -> None:
        self.scraper_log_repo.log_search(
            task_id=task_id,
            media_item_id=media_item_id,
            provider=provider,
            search_query=search_query,
            result_count=result_count,
            details=details
        )

    def _sanitize_query(self, query: str) -> str:
        return self.sanitizer.sanitize_query(query)

    def _collect_candidate_titles(self, candidate: Dict[str, Any], details: Optional[Dict[str, Any]] = None) -> set:
        return self.title_matcher.collect_candidate_titles(candidate, details)

    def _title_match_rank(self, parsed_title: str, candidate_titles: set) -> int:
        return self.title_matcher.title_match_rank(parsed_title, candidate_titles)

    def _candidate_noise_penalty(self, parsed_title: str, candidate_titles: set) -> int:
        return self.candidate_scorer.candidate_noise_penalty(parsed_title, candidate_titles)

    def resolve_item(
        self,
        item: MediaItem,
        language: str = DEFAULT_FALLBACK_LANGUAGE,
        task_id: Optional[int] = None,
        include_adult: Optional[bool] = None,
    ):
        """Resolves MediaItem search candidates and populates matches."""
        candidates: Dict[int, Dict[str, Any]] = {}

        if include_adult is None:
            from app.modules.settings.services.settings_service import SettingsService
            val = SettingsService(self.db).get_setting("include_adult")
            include_adult = str(val).lower() in ("true", "1")

        parsed = item.parsed_info or {}
        fn_data = parsed.get("fn") or {}
        it_data = parsed.get("it") or {}
        fd_data = parsed.get("fd") or {}

        from app.core.episode_utils import extract_season_from_parsed_info
        target_season = extract_season_from_parsed_info(item.parsed_info)

        def filter_by_season_support(tv_results: list) -> list:
            if not target_season:
                return tv_results
            
            valid = []
            for res in tv_results:
                res_id = res.get("id")
                if not res_id:
                    continue
                details = self.api.get_details(res_id, "tv", language=language)
                if details:
                    num_seasons = details.get("number_of_seasons") or 0
                    if num_seasons >= target_season:
                        valid.append(res)
                else:
                    valid.append(res)
            return valid

        # 1. Resolve via local NFO IMDb ID
        if item.nfo_imdb_id:
            res = self.api.find_by_imdb(item.nfo_imdb_id, language=language)
            if res:
                # Validate NFO candidate against parsed metadata to reject completely bogus matches
                details = None
                try:
                    tmdb_type = "tv" if res.get("item_type") == "tv" else "movie"
                    details = self.api.get_details(res["id"], tmdb_type, language=language)
                except Exception as e:
                    logger.debug(f"Failed to fetch TMDB details for NFO match {res.get('id')} ({tmdb_type}): {e}", exc_info=True)
                
                candidate_titles = self.title_matcher.collect_candidate_titles(res, details)
                title_rank = 0
                for t in [fn_data.get("title"), it_data.get("title"), fd_data.get("title")]:
                    if t:
                        title_rank = max(title_rank, self.title_matcher.title_match_rank(t, candidate_titles))
                
                year_match = False
                target_year = fn_data.get("year") or fd_data.get("year") or it_data.get("year")
                date_str = (
                    res.get("release_date") 
                    or res.get("first_air_date") 
                    or (details.get("release_date") if details else None) 
                    or (details.get("first_air_date") if details else None)
                )
                if target_year and date_str:
                    c_year = get_year_from_date(date_str)
                    if c_year is not None and abs(c_year - target_year) <= 1:
                        year_match = True
                else:
                    year_match = True
                
                # Accept NFO match if title is somewhat similar AND year matches (if target year is known)
                if title_rank > 0 and (not target_year or year_match):
                    if res.get("item_type") == "tv":
                        res_list = filter_by_season_support([res])
                        if res_list:
                            self._add_candidate(candidates, res, source_priority=100)
                    else:
                        self._add_candidate(candidates, res, source_priority=100)

        # 2. Resolve via Guessit Search fallback
        if not candidates:
            search_tasks = [
                ("fn", fn_data.get("title"), fn_data.get("year"), 30),
                ("fd", fd_data.get("title"), fd_data.get("year"), 20),
                ("it", it_data.get("title"), it_data.get("year"), 10)
            ]
            
            for _source, title, year, source_priority in search_tasks:
                if not title:
                    continue
                
                clean_title = self._sanitize_query(title)
                if not clean_title:
                    continue

                # Determine if it's a TV show or movie using decision logic from RENDA
                if item.nfo_imdb_id:
                    is_tv = False
                else:
                    fn_type = fn_data.get('type')
                    fd_type = fd_data.get('type')

                    # Fix common 1080p -> S10E80 trap
                    if fn_data.get('season') == 10 and fn_data.get('episode') == 80:
                        fn_type = 'movie'

                    raw_fn_lower = (item.filename or "").lower()
                    raw_fd_lower = (item.folder_name or "").lower()

                    # Check for strong series indicators
                    is_forced_series = False
                    if (fn_data.get('season') or fn_data.get('episode') or fd_data.get('season') or fd_data.get('episode')) and fn_type != 'movie':
                        is_forced_series = True

                    # Exception: Movie sequels often have fractions or numbers that Guessit mistakes for episodes (e.g. Naked Gun 2 12 (1991))
                    # If we have an episode but absolutely no season info, and we have a valid year, and no standard S/E markers:
                    if is_forced_series and fn_data.get('episode') and not fn_data.get('season') and not fd_data.get('season') and (fn_data.get('year') or fd_data.get('year')):
                        import re
                        if not re.search(r'\bs\d+e\d+\b|\bseason\b|\bepizod\b|\bresz\b', raw_fn_lower):
                            is_forced_series = False

                    series_kw = ['mini-series', 'miniseries', 'complete series', 'complete.series']
                    if any(kw in raw_fn_lower or kw in raw_fd_lower for kw in series_kw):
                        is_forced_series = True

                    # Decision Tree
                    if is_forced_series:
                        is_tv = True
                    elif fd_type == 'movie' and fd_data.get('year'):
                        is_tv = False
                    elif fn_type == 'episode' and not fd_data.get('year'):
                        is_tv = True
                    elif fd_type == 'episode':
                        is_tv = True
                    elif fn_type == 'movie' or fd_type == 'movie':
                        is_tv = False
                    else:
                        is_tv = False
                tmdb_type = "tv" if is_tv else "movie"
                results = self.api.search(clean_title, item_type=tmdb_type, year=year, language=language, include_adult=include_adult)
                if tmdb_type == "tv":
                    results = filter_by_season_support(results)
                
                if not results and year:
                    results = self.api.search(clean_title, item_type=tmdb_type, year=None, language=language, include_adult=include_adult)
                    if tmdb_type == "tv":
                        results = filter_by_season_support(results)
                
                for res in results:
                    res["item_type"] = tmdb_type
                    self._add_candidate(candidates, res, source_priority=source_priority)

        self.match_persister.save_matches(item, candidates, language, task_id)

    def _add_candidate(self, candidates: Dict[int, Dict[str, Any]], res: Dict[str, Any], source_priority: int = 0):
        tmdb_id = res.get("id")
        if not tmdb_id:
            return

        existing = candidates.get(tmdb_id)
        if not existing:
            candidate = dict(res)
            candidate["_source_priority"] = source_priority
            candidates[tmdb_id] = candidate
            return

        existing["_source_priority"] = max(existing.get("_source_priority", 0), source_priority)
