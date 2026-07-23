import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/http';

export const torrentKeys = {
  all: ['torrent'],
  active: () => [...torrentKeys.all, 'active'],
};

export function useActiveTorrentsQuery(enabled = true) {
  return useQuery({
    queryKey: torrentKeys.active(),
    queryFn: () => fetchJson('/api/torrent/active'),
    refetchInterval: enabled ? 10000 : false, // Poll every 10 seconds if enabled
    enabled,
  });
}
