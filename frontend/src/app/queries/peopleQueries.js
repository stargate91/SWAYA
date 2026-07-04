import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const usePeopleQuery = (params) => useQuery({
  queryKey: ['people', params],
  queryFn: ({ signal }) => api.people.getList(params, { signal }),
});

export const usePeopleInfiniteQuery = (params) => useInfiniteQuery({
  queryKey: ['people-infinite', params],
  queryFn: ({ pageParam = 1 }) => api.people.getList({ ...params, page: pageParam }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    const next = (lastPage.page || 1) + 1;
    return next <= (lastPage.total_pages || 1) ? next : undefined;
  },
});
