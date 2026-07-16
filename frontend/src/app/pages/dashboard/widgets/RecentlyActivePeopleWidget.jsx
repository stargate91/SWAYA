import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSettingsQuery } from '../../../queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useRecentlyActivatedPeopleInfiniteQuery,
} from '../../../queries/dashboardQueries';
import RecommendationCarousel from './components/RecommendationCarousel';
import RecommendationSkeleton from './components/RecommendationSkeleton';
import useRecommendationActions from './hooks/useRecommendationActions';
import useWatchlistHandler from './hooks/useWatchlistHandler';

import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { useTranslation } from '../../../providers/LanguageContext';

export default function RecentlyActivePeopleWidget() {
  const { t: T } = useTranslation();
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

  const { handleCardClick } = useRecommendationActions();

  const {
    data: paginatedData,
    isLoading: isPeopleLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyActivatedPeopleInfiniteQuery(includeAdult);

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

  if (isLoading) {
    return <RecommendationSkeleton />;
  }

  if (!filteredPeople?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T(includeAdult ? 'dashboard.recommendations.recently_activated_people_adult' : 'dashboard.recommendations.recently_activated_people') || (includeAdult ? 'Recently Followed Adult Stars' : 'Recently Tracked People')}
      items={filteredPeople.map(p => ({
        ...p,
        media_type: 'person'
      }))}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      onLoadMore={handleLoadMorePeople}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
    />
  );
}
