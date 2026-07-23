import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useContinueWatchingQuery,
  usePlayMediaMutation,
  useResetProgressMutation,
  useSettingsQuery,
} from '@/queries';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import api from '@/lib/api';
import { onIpc } from '@/lib/electron';

export default function useContinueWatching() {
  const queryClient = useQueryClient();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: itemsData, isLoading } = useContinueWatchingQuery({
    include_adult: sessionMode === 'nsfw',
  });
  const items = useMemo(() => itemsData || [], [itemsData]);
  const playMutation = usePlayMediaMutation();
  const resetProgressMutation = useResetProgressMutation();
  const { data: settings = {} } = useSettingsQuery();

  const [prevItems, setPrevItems] = useState(items);
  const [localItems, setLocalItems] = useState(items);

  if (items !== prevItems) {
    setPrevItems(items);
    setLocalItems(items);
  }

  const [activePlayback, setActivePlayback] = useState(null);
  const activePlaybackRef = useRef(null);

  useEffect(() => {
    const handlePlayerStateUpdate = async (event, data) => {
      if (data.event === 'start') {
        const playback = {
          itemId: data.itemId,
          currentTime: data.currentTime || 0,
          duration: data.duration || 0,
        };
        activePlaybackRef.current = playback;
        setActivePlayback(playback);
 
        setLocalItems((prev) => {
          const exists = prev.some(item => String(item.id) === String(data.itemId));
          if (exists) {
            // Mark the existing item as active
            return prev.map(item =>
              String(item.id) === String(data.itemId)
                ? { ...item, is_active: true }
                : item
            );
          }
          // Fetch detail asynchronously via queryClient and prepend
          queryClient.fetchQuery({
            queryKey: ['item-detail', data.itemId],
            queryFn: () => api.library.getItemDetail(data.itemId),
          }).then((detail) => {
            if (detail) {
              const newItem = {
                id: detail.id,
                title: detail.title,
                tv_title: detail.tv_title,
                still_path: detail.still_path,
                backdrop_path: detail.backdrop_path,
                poster_path: detail.poster_path,
                season_number: detail.season_number,
                episode_number: detail.episode_number,
                duration: data.duration || detail.duration || 1,
                resume_position: data.currentTime || 0,
                type: detail.media_type || detail.type,
                is_active: true,
              };
              setLocalItems((current) => {
                const filtered = current.filter(item => String(item.id) !== String(detail.id));
                return [newItem, ...filtered];
              });
            }
          }).catch((err) => {
            console.error('Failed to fetch detail for continue watching start:', err);
          });
          return prev;
        });
      } else if (data.event === 'time-pos') {
        const prev = activePlaybackRef.current;
        if (prev) {
          activePlaybackRef.current = { ...prev, currentTime: data.currentTime };
          setActivePlayback(activePlaybackRef.current);
          setLocalItems((currentItems) =>
            currentItems.map((item) =>
              String(item.id) === String(prev.itemId)
                ? { ...item, resume_position: data.currentTime }
                : item
            )
          );
        }
      } else if (data.event === 'duration') {
        const prev = activePlaybackRef.current;
        if (prev) {
          activePlaybackRef.current = { ...prev, duration: data.duration };
          setActivePlayback(activePlaybackRef.current);
          setLocalItems((currentItems) =>
            currentItems.map((item) =>
              String(item.id) === String(prev.itemId)
                ? { ...item, duration: data.duration }
                : item
            )
          );
        }
      } else if (data.event === 'close') {
        const prev = activePlaybackRef.current;
        activePlaybackRef.current = null;
        setActivePlayback(null);
        if (prev) {
          setLocalItems((currentItems) =>
            currentItems.map((item) =>
              String(item.id) === String(prev.itemId)
                ? { ...item, is_active: false }
                : item
            )
          );
        }
        queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
      }
    };

    const unsubscribe = onIpc('player-state-update', handlePlayerStateUpdate);
    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const handlePlay = (item) => {
    const preferredPlayer = settings.preferred_player || 'swaya';
    if (item.is_active && preferredPlayer !== 'swaya') return;
    if (item.type === 'episode' || item.type === 'movie' || item.type === 'scene' || item.type === 'video') {
      playMutation.mutate(item.id);
    }
  };

  const handleResetProgress = (itemId) => {
    resetProgressMutation.mutate(itemId);
  };

  return {
    isLoading,
    localItems,
    activePlayback,
    settings,
    handlePlay,
    handleResetProgress,
  };
}
