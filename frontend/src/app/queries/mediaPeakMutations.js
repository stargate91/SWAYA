import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useUi } from '@/providers/UiProvider';
import { invalidateEntity, invalidateTvDetail } from '@/lib/queryKeys';

export const useToggleTrackedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tmdbId, externalId, mediaType, isTracked, track }) => {
      const id = tmdbId || externalId;
      let shouldTrack = false;
      if (track !== undefined) {
        shouldTrack = !!track;
      } else if (isTracked !== undefined) {
        shouldTrack = !isTracked;
      }
      return shouldTrack
        ? api.media.trackItem(id, mediaType)
        : api.media.untrackItem(id, mediaType);
    },
    onSuccess: (data, variables) => {
      const id = variables.tmdbId || variables.externalId;
      invalidateEntity(queryClient, id, { lists: true, stats: true });
    },
  });
};

export const useAddPeakMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useUi();
  return useMutation({
    mutationFn: (variables) => {
      const itemId = typeof variables === 'object' ? variables.itemId : variables;
      return api.media.addPeak(itemId);
    },
    onMutate: async (variables) => {
      const { itemId, tvId } = typeof variables === 'object' ? variables : { itemId: variables, tvId: null };
      const targets = [itemId, tvId].filter(Boolean);
      
      const uniqueIds = new Set();
      targets.forEach(id => {
        uniqueIds.add(id);
        uniqueIds.add(String(id).replace('tv_', ''));
      });

      for (const id of uniqueIds) {
        await queryClient.cancelQueries({ queryKey: ['library-item-detail', id] });
      }

      // Snapshot all matching detail queries by prefix
      const contextSnapshot = [];
      uniqueIds.forEach(id => {
        contextSnapshot.push(...queryClient.getQueriesData({ queryKey: ['library-item-detail', id] }));
      });

      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        const currentCount = oldData.peaks_count || 0;
        const currentHistory = oldData.peaks_history || [];
        const tempPeak = {
          id: 'temp-' + Date.now(),
          video_position: 0,
          watched_at: new Date().toISOString(),
          isOptimistic: true,
        };
        return {
          ...oldData,
          peaks_count: currentCount + 1,
          peaks_history: [...currentHistory, tempPeak].sort((a, b) => a.video_position - b.video_position),
        };
      };

      uniqueIds.forEach(id => {
        queryClient.setQueriesData({ queryKey: ['library-item-detail', id] }, optimisticUpdate);
      });

      return { contextSnapshot };
    },
    onError: (err, variables, context) => {
      if (context?.contextSnapshot) {
        context.contextSnapshot.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
      toast(err.message || 'Failed to add peak', 'danger');
    },
    onSuccess: (data, variables) => {
      const { itemId, tvId } = typeof variables === 'object' ? variables : { itemId: variables, tvId: null };
      const updateData = (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          peaks_count: data.peaks_count,
          peaks_history: data.peaks_history,
        };
      };
      const targets = [itemId, tvId].filter(Boolean);
      targets.forEach(id => {
        const clean = String(id).replace('tv_', '');
        queryClient.setQueriesData({ queryKey: ['library-item-detail', id] }, updateData);
        queryClient.setQueriesData({ queryKey: ['library-item-detail', clean] }, updateData);
        queryClient.setQueriesData({ queryKey: ['library-tv-detail', id] }, updateData);
      });
      invalidateEntity(queryClient, itemId);
      if (tvId) invalidateTvDetail(queryClient, tvId);
    },
  });
};

export const useDeletePeakMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, logId }) => api.media.deletePeak(itemId, logId),
    onSuccess: (data, variables) => {
      const { itemId, tvId } = variables;
      const updateData = (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          peaks_count: data.peaks_count,
          peaks_history: data.peaks_history,
        };
      };
      const targets = [itemId, tvId].filter(Boolean);
      targets.forEach(id => {
        const clean = String(id).replace('tv_', '');
        queryClient.setQueriesData({ queryKey: ['library-item-detail', id] }, updateData);
        queryClient.setQueriesData({ queryKey: ['library-item-detail', clean] }, updateData);
        queryClient.setQueriesData({ queryKey: ['library-tv-detail', id] }, updateData);
      });
      invalidateEntity(queryClient, itemId);
      if (tvId) invalidateTvDetail(queryClient, tvId);
    },
  });
};
