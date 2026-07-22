import { useMemo } from 'react';
import { useSettingsQuery } from '@/queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useRecentlyAddedInfiniteQuery,
} from '@/queries/dashboardQueries';
import useWatchlistHandler from './useWatchlistHandler';
import useRecommendationActions from './useRecommendationActions';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

export default function useRecentlyAdded(mediaType) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult && sessionMode === 'nsfw';
  const language = settings?.ui_language || settings?.primary_metadata_language;

  const { data: recommendations, isLoading: isRecsLoading } = useRecommendationsQuery(language, includeAdult);
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { handlePlayClick, handleCardClick, playMutationPending } = useRecommendationActions();

  const {
    data: paginatedData,
    isLoading: isAddedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyAddedInfiniteQuery(language, includeAdult, mediaType);

  const handleLoadMoreAdded = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const filteredItems = useMemo(() => {
    return paginatedData?.pages ? paginatedData.pages.flat() : [];
  }, [paginatedData]);

  const isLoading = isRecsLoading || isAddedLoading;

  return {
    settings,
    filteredItems,
    isLoading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
    handlePlayClick,
    playMutationPending,
    handleLoadMoreAdded,
    hasNextPage,
    isFetchingNextPage,
  };
}
