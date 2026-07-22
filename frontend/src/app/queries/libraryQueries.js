import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const useStatsQuery = (includeAdult = false) => useQuery({
  queryKey: ['stats', includeAdult],
  queryFn: () => api.library.getStats({ include_adult: includeAdult }),
});

export const useRatingsStatsQuery = (includeAdult = false, gender = undefined) => useQuery({
  queryKey: ['ratingsStats', includeAdult, gender],
  queryFn: () => api.library.getRatingsStats({ include_adult: includeAdult, gender }),
});

export const useLibraryQuery = (params) => useQuery({
  queryKey: ['library', params],
  queryFn: ({ signal }) => api.library.getItems(params, { signal }),
  placeholderData: (previousData, previousQuery) => {
    if (!previousData || !previousQuery) return undefined;
    const prevParams = previousQuery.queryKey[1] || {};
    const currentParams = params || {};
    if (prevParams.tab !== currentParams.tab) {
      return undefined;
    }
    return previousData;
  },
});

export const useLibraryInfiniteQuery = (params) => useInfiniteQuery({
  queryKey: ['libraryInfinite', params],
  queryFn: ({ pageParam = 1, signal }) => {
    const fetchParams = { ...params, page: pageParam };
    return api.library.getItems(fetchParams, { signal });
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    return lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined;
  },
  enabled: !!params,
});

export const useCollectionsQuery = (params) => useQuery({
  queryKey: ['libraryCollections', params],
  queryFn: ({ signal }) => api.library.getCollections(params, { signal }),
  placeholderData: (previousData, previousQuery) => {
    if (!previousData || !previousQuery) return undefined;
    const prevParams = previousQuery.queryKey[1] || {};
    const currentParams = params || {};
    if (prevParams.tab !== currentParams.tab) {
      return undefined;
    }
    return previousData;
  },
});

export const useTagsQuery = (isAdult = false, page = 1, pageSize = 40, searchQuery = '') => useQuery({
  queryKey: ['libraryTags', isAdult, page, pageSize, searchQuery],
  queryFn: () => api.library.getTags(isAdult, page, pageSize, searchQuery),
});

export const useTagItemsQuery = (tagName, isAdult = false) => useQuery({
  queryKey: ['tagItems', tagName, isAdult],
  queryFn: () => api.library.getTagItems(tagName, isAdult),
  enabled: !!tagName,
});

export const useAllTagsQuery = (isAdult = false) => useQuery({
  queryKey: ['allTags', isAdult],
  queryFn: () => api.tags.getAll(isAdult),
});

export const useLibraryFiltersQuery = (params) => useQuery({
  queryKey: ['libraryFilters', params],
  queryFn: ({ signal }) => api.library.getFilters(params, { signal }),
  staleTime: 5 * 60 * 1000,
});
