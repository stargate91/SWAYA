import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { QK } from '../lib/queryKeys';

export const useContinueWatchingQuery = (params) => useQuery({
  queryKey: ['continue-watching', params],
  queryFn: () => api.library.getContinueWatching(params),
  staleTime: 30000,
});

export const useRecommendationsQuery = (language, includeAdult, adultTagBlacklist) => useQuery({
  queryKey: ['recommendations', language, includeAdult, adultTagBlacklist],
  queryFn: () => api.recommendations.get(language, includeAdult),
});

export const useRecentlyActivatedPeopleInfiniteQuery = (includeAdult, gender) => useInfiniteQuery({
  queryKey: ['recently-activated-people', includeAdult, gender],
  queryFn: ({ pageParam = 1 }) => api.recommendations.getRecentlyActivatedPeople(pageParam, 20, includeAdult, gender),
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) => {
    return lastPage.length === 20 ? allPages.length + 1 : undefined;
  },
});

export const useRecentlyAddedInfiniteQuery = (language, includeAdult, mediaType) => useInfiniteQuery({
  queryKey: ['recently-added', language, includeAdult, mediaType],
  queryFn: ({ pageParam = 1 }) => api.recommendations.getRecentlyAdded(pageParam, 20, includeAdult, language, mediaType),
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) => {
    return lastPage.length === 20 ? allPages.length + 1 : undefined;
  },
});

export const useAddToWatchlistMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tmdbId, mediaItemId, type }) => api.recommendations.addToWatchlist({ tmdbId, mediaItemId, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.recommendations });
      queryClient.invalidateQueries({ queryKey: QK.lists });
      queryClient.invalidateQueries({ queryKey: QK.listDetails });
    },
  });
};

export const useRemoveFromWatchlistMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tmdbId) => api.recommendations.removeFromWatchlist(tmdbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.recommendations });
      queryClient.invalidateQueries({ queryKey: QK.lists });
      queryClient.invalidateQueries({ queryKey: QK.listDetails });
    },
  });
};

export const useDiscoverQuery = (genreId, year) => useQuery({
  queryKey: ['discover', genreId, year],
  queryFn: () => api.recommendations.discover(genreId, year),
});
