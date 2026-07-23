import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const getOrganizerQueryKey = (scanMode, sessionMode, page, pageSize, tab, subTab, q, sortBy, sortDir) => [
  'organizer',
  scanMode || 'all',
  sessionMode || 'sfw',
  page || 1,
  pageSize || 40,
  tab || 'manual',
  subTab || 'all',
  q || '',
  sortBy || 'source',
  sortDir || 'asc',
];

export const useOrganizerQuery = (scanMode, sessionMode, page, pageSize, tab, subTab, q, sortBy, sortDir, enabled = true) => useQuery({
  queryKey: getOrganizerQueryKey(scanMode, sessionMode, page, pageSize, tab, subTab, q, sortBy, sortDir),
  queryFn: () => api.organizer.get({ scanMode, sessionMode, page, pageSize, tab, subTab, q, sortBy, sortDir }),
  keepPreviousData: true,
  enabled,
});

export const useOrganizerCountQuery = (scanMode, sessionMode) => useQuery({
  queryKey: ['organizer-count', scanMode || 'all', sessionMode || 'sfw'],
  queryFn: () => api.organizer.getCount({ scanMode, sessionMode }),
});
