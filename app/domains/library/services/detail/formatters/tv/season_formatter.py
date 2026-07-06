from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.domains.library.services.detail.formatters.tv.episode_formatter import TvEpisodeFormatter

class TvSeasonFormatter:
    def format_seasons(
        self,
        db: Session,
        tv_tmdb_id_int: int,
        all_season_meta: List[Dict[str, Any]],
        seasons_limit: int,
        initial_episodes_limit: int,
        local_items: List[Any],
        local_episodes_map: Dict[tuple, Any],
        watched_episodes_set: set,
        ui_lang: str,
        tmdb_scraper: Any,
        ep_formatter: TvEpisodeFormatter,
        current_uid: int,
        resolve_img_fn: Any
    ) -> List[Dict[str, Any]]:
        seasons = []
        for idx, season_meta in enumerate(all_season_meta):
            season_number = season_meta.get("season_number")
            if season_number is None:
                continue
            
            if idx < seasons_limit:
                try:
                    season_detail = tmdb_scraper.get_season_details(tv_tmdb_id_int, season_number, language=ui_lang) or {}
                except Exception:
                    season_detail = {}
                all_episodes = season_detail.get("episodes", []) or []
                
                if not all_episodes:
                    for (s_num, ep_num), media_item in local_episodes_map.items():
                        if s_num == season_number:
                            ep_match = next((m for m in media_item.matches if m.season_number == season_number and m.episode_number == ep_num), None)
                            ep_loc = None
                            if ep_match:
                                from app.shared_kernel.language import LanguageService
                                ep_loc = LanguageService.get_best_localization(ep_match.localizations, ui_lang)
                            
                            all_episodes.append({
                                "episode_number": ep_num,
                                "name": ep_loc.title if ep_loc else (ep_match.original_title if ep_match else f"Episode {ep_num}"),
                                "overview": ep_loc.overview if ep_loc else "",
                                "air_date": ep_match.release_date.isoformat()[:10] if (ep_match and ep_match.release_date) else None,
                                "vote_average": ep_match.rating_tmdb if ep_match else 0.0,
                                "still_path": ep_match.still_path if ep_match else None
                            })
                    all_episodes.sort(key=lambda x: x["episode_number"])
                
                is_in_library = len(local_items) > 0
                ep_limit = len(all_episodes) if is_in_library else initial_episodes_limit

                episodes = ep_formatter.format_episodes(
                    db=db,
                    tv_tmdb_id_int=tv_tmdb_id_int,
                    season_number=season_number,
                    all_episodes=all_episodes,
                    local_episodes_map=local_episodes_map,
                    ep_limit=ep_limit,
                    current_uid=current_uid,
                    resolve_img_fn=resolve_img_fn
                )
                
                local_count = sum(1 for ep in all_episodes if (season_number, ep.get("episode_number")) in local_episodes_map)
                episodes_loaded_count = len(episodes)
                episodes_complete = True
            else:
                episodes = []
                episodes_loaded_count = 0
                episodes_complete = False
                local_count = sum(1 for (s, e) in local_episodes_map.keys() if s == season_number)
                all_episodes = []

            watched_count = sum(1 for (s, e) in watched_episodes_set if s == season_number)
            episode_count = season_meta.get("episode_count") or len(all_episodes)
            is_season_watched = episode_count > 0 and watched_count >= episode_count

            seasons.append({
                "season_number": season_number,
                "title": season_meta.get("name") or f"Season {season_number}",
                "overview": season_meta.get("overview"),
                "poster_path": resolve_img_fn(season_meta.get("poster_path"), "posters"),
                "air_date": season_meta.get("air_date"),
                "episode_count": episode_count,
                "local_episode_count": local_count,
                "episodes_loaded_count": episodes_loaded_count,
                "episodes_complete": episodes_complete,
                "episodes": episodes,
                "is_watched": is_season_watched,
            })
        return seasons
