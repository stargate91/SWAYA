import { useState, useCallback } from 'react';

export const useWatchlistHandler = (watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation) => {
  const [optimisticWatchlistIds, setOptimisticWatchlistIds] = useState(null);
  const [prevWatchlistIds, setPrevWatchlistIds] = useState(null);

  if (watchlistIdsFromQuery !== prevWatchlistIds) {
    setPrevWatchlistIds(watchlistIdsFromQuery);
    setOptimisticWatchlistIds(null);
  }

  const actualWatchlistIds = optimisticWatchlistIds !== null ? optimisticWatchlistIds : (watchlistIdsFromQuery || []);

  const handleWatchlist = useCallback((item, type) => {
    const id = item.id;
    const isWatchlisted = actualWatchlistIds.includes(id);
    if (isWatchlisted) {
      setOptimisticWatchlistIds((prev) => (prev || watchlistIdsFromQuery || []).filter((i) => i !== id));
      removeFromWatchlistMutation.mutate(id);
    } else {
      setOptimisticWatchlistIds((prev) => [...(prev || watchlistIdsFromQuery || []), id]);
      addToWatchlistMutation.mutate({
        tmdbId: item.in_library ? undefined : id,
        mediaItemId: item.in_library ? id : undefined,
        type
      });
    }
  }, [actualWatchlistIds, watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation]);

  return { actualWatchlistIds, handleWatchlist };
};

export default useWatchlistHandler;
