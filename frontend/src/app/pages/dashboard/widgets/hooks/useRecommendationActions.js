import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usePlayMediaMutation } from '../../../../queries';
import api from '../../../../lib/api';

export const useRecommendationActions = () => {
  const navigate = useNavigate();
  const playMutation = usePlayMediaMutation();
  const queryClient = useQueryClient();

  const handlePlayClick = useCallback(async (item) => {
    if (playMutation.isPending) return;

    const isTv = item.media_type === 'tv' || item.media_type === 'episode' || item.type === 'tv' || item.type === 'episode' || String(item.id).startsWith('tv_');
    if (!isTv) {
      const playId = item.in_library ? item.media_item_id : item.id;
      playMutation.mutate(playId);
      return;
    }

    try {
      const tvId = String(item.id).replace('tv_', '').replace('tmdb_', '');
      const tvDetail = await queryClient.fetchQuery({
        queryKey: ['tv-detail', tvId],
        queryFn: () => api.library.getTvDetail(tvId, { seasonsLimit: 99, initialEpisodesLimit: 999 }),
      });
      
      const seasons = Array.isArray(tvDetail?.seasons)
        ? [...tvDetail.seasons]
            .filter((s) => s.season_number > 0)
            .sort((a, b) => Number(a.season_number || 0) - Number(b.season_number || 0))
        : [];
      let nextEpisode = null;

      for (const season of seasons) {
        const ownedEpisodes = (season.episodes || [])
          .filter((episode) => episode.path && !episode.is_missing)
          .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0));
        const inProgress = ownedEpisodes.find((episode) => episode.resume_position > 0);
        if (inProgress) {
          nextEpisode = inProgress;
          break;
        }
      }

      if (!nextEpisode) {
        for (const season of seasons) {
          const ownedEpisodes = (season.episodes || [])
            .filter((episode) => episode.path && !episode.is_missing)
            .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0));
          const unwatched = ownedEpisodes.find((episode) => !episode.is_watched);
          if (unwatched) {
            nextEpisode = unwatched;
            break;
          }
        }
      }

      if (!nextEpisode) {
        for (const season of seasons) {
          const ownedEpisodes = (season.episodes || [])
            .filter((episode) => episode.path && !episode.is_missing)
            .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0));
          if (ownedEpisodes.length > 0) {
            nextEpisode = ownedEpisodes[0];
            break;
          }
        }
      }

      if (nextEpisode?.id) {
        playMutation.mutate(nextEpisode.id);
      } else if (item.media_item_id) {
        playMutation.mutate(item.media_item_id);
      }
    } catch (err) {
      console.error('Failed to play TV show:', err);
      if (item.media_item_id) {
        playMutation.mutate(item.media_item_id);
      }
    }
  }, [playMutation, queryClient]);

  const handleCardClick = useCallback((item) => {
    const type = item.media_type || (item.title ? 'movie' : (item.profile_path ? 'person' : 'tv'));
    if (type === 'person') {
      navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
      return;
    }
    if (type === 'tv' || type === 'episode') {
      navigate(`/library/tv/tmdb_${item.id}`, { state: { allowAdult: true } });
      return;
    }
    const idToUse = item.in_library ? item.media_item_id : `tmdb_${item.id}`;
    navigate(`/library/${type}/${idToUse}`, { state: { allowAdult: true } });
  }, [navigate]);

  return { handlePlayClick, handleCardClick, playMutationPending: playMutation.isPending };
};

export default useRecommendationActions;
