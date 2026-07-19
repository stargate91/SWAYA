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

  const filteredPeople = useMemo(() => {
    const list = paginatedData?.pages ? paginatedData.pages.flat() : [];
    return list.filter((p) => {
      if (sessionMode === 'sfw') {
        const isAdult = p.is_adult || p.adult || p.known_for_department?.toLowerCase() === 'performer';
        return !isAdult;
      }
      return true;
    });
  }, [paginatedData, sessionMode]);

  const isLoading = isRecsLoading || isPeopleLoading;

  const items = useMemo(() => {
    return filteredPeople.map(p => ({
      ...p,
      media_type: 'person'
    }));
  }, [filteredPeople]);

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
