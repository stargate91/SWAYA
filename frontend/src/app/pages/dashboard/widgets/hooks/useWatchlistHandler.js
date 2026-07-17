import { useState, useCallback, useMemo } from 'react';

export const useWatchlistHandler = (watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation) => {
  const [optimisticWatchlistIds, setOptimisticWatchlistIds] = useState(null);
  const [prevWatchlistIds, setPrevWatchlistIds] = useState(null);

  if (watchlistIdsFromQuery !== prevWatchlistIds) {
    setPrevWatchlistIds(watchlistIdsFromQuery);
    setOptimisticWatchlistIds(null);
  }

  const actualWatchlistIds = useMemo(() => {
    return optimisticWatchlistIds !== null ? optimisticWatchlistIds : (watchlistIdsFromQuery || []);
  }, [optimisticWatchlistIds, watchlistIdsFromQuery]);

  const handleWatchlist = useCallback((item, type) => {
    const isScene = type === 'scene';
    const tmdbId = isScene ? undefined : (item.tmdb_id || item.tv_tmdb_id || item.id);
    const mediaItemId = (isScene || item.tmdb_id || item.tv_tmdb_id) ? item.id : undefined;
    const watchlistId = isScene ? item.id : tmdbId;

    const isWatchlisted = actualWatchlistIds.includes(watchlistId);
    if (isWatchlisted) {
      setOptimisticWatchlistIds((prev) => (prev || watchlistIdsFromQuery || []).filter((i) => i !== watchlistId));
      removeFromWatchlistMutation.mutate(watchlistId);
    } else {
      setOptimisticWatchlistIds((prev) => [...(prev || watchlistIdsFromQuery || []), watchlistId]);
      addToWatchlistMutation.mutate({
        tmdbId,
        mediaItemId,
        type
      });
    }
  }, [actualWatchlistIds, watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation]);

  return { actualWatchlistIds, handleWatchlist };
};

export default useWatchlistHandler;
