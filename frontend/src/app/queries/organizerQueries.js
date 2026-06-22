import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const useOrganizerQuery = () => useQuery({
  queryKey: ['organizer'],
  queryFn: () => api.organizer.get(),
  enabled: false,
});

export const useOrganizerCountQuery = () => useQuery({
  queryKey: ['organizer-count'],
  queryFn: () => api.organizer.getCount(),
});
