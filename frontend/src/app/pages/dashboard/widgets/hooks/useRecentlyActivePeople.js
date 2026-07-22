import { useMemo } from 'react';
import { useSettingsQuery } from '@/queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useRecentlyActivatedPeopleInfiniteQuery,
} from '@/queries/dashboardQueries';
import useWatchlistHandler from './useWatchlistHandler';
import useRecommendationActions from './useRecommendationActions';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

export default function useRecentlyActivePeople() {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult && sessionMode === 'nsfw';
  const language = settings?.ui_language || settings?.primary_metadata_language;
  const genderPref = includeAdult ? settings?.adult_gender_preference : undefined;

  const { data: recommendations, isLoading: isRecsLoading } = useRecommendationsQuery(language, includeAdult);
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { handleCardClick } = useRecommendationActions();

  const {
    data: paginatedData,
    isLoading: isPeopleLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyActivatedPeopleInfiniteQuery(includeAdult, genderPref);

  const handleLoadMorePeople = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const items = useMemo(() => {
    const list = paginatedData?.pages ? paginatedData.pages.flat() : [];
    return list.map(p => ({
      ...p,
      media_type: 'person'
    }));
  }, [paginatedData]);

  const isLoading = isRecsLoading || isPeopleLoading;

  return {
    includeAdult,
    items,
    isLoading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
    handleLoadMorePeople,
    hasNextPage,
    isFetchingNextPage,
  };
}
