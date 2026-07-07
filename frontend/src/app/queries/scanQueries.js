import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export const useScanStatusQuery = ({ enabled = true, select } = {}) => useQuery({
  queryKey: ['scan-status'],
  queryFn: () => api.scan.getStatus(),
  enabled,
  select,
  refetchInterval: (query) => {
    const data = query.state.data;
    if (!data?.active) return 10000;
    return data.scan_mode === 'offline' ? 400 : 1200;
  },
});

export const useScanMutation = () => useMutation({
  mutationFn: (payload) => api.scan.start(payload),
});

export const useScanRetryMutation = () => useMutation({
  mutationFn: (payload) => api.scan.retry(payload),
});

export const useHydrateStatusQuery = () => useQuery({
  queryKey: ['hydrate-status'],
  queryFn: () => api.hydrate.getStatus(),
  refetchInterval: 1200,
});
