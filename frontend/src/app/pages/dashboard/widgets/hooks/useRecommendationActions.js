import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayMediaMutation } from '../../../../queries';
import api from '../../../../lib/api';
import { getCreditDetailPath } from '@/pages/library/utils/mediaNavigation';

export const useRecommendationActions = () => {
  const navigate = useNavigate();
  const playMutation = usePlayMediaMutation();

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
      const nextEpisode = await api.library.getTvNextEpisode(tvId);

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
  }, [playMutation]);

  const handleCardClick = useCallback((item) => {
    const type = item.media_type || (item.title ? 'movie' : (item.profile_path ? 'person' : 'tv'));
    const path = getCreditDetailPath(item, type, item.source);
    if (path) {
      navigate(path, { state: { allowAdult: true } });
    }
  }, [navigate]);

  return { handlePlayClick, handleCardClick, playMutationPending: playMutation.isPending };
};

export default useRecommendationActions;
