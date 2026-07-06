import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { QK } from '../lib/queryKeys';

export const useContinueWatchingQuery = (params) => useQuery({
  queryKey: ['continue-watching', params],
  queryFn: () => api.library.getContinueWatching(params),
});

export const useRecommendationsQuery = (language, includeAdult) => useQuery({
  queryKey: ['recommendations', language, includeAdult],
  queryFn: () => api.recommendations.get(language, includeAdult),
});

export const useAddToWatchlistMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tmdbId, type }) => api.recommendations.addToWatchlist(tmdbId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.recommendations });
    },
  });
};

export const useRemoveFromWatchlistMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tmdbId) => api.recommendations.removeFromWatchlist(tmdbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.recommendations });
    },
  });
};
