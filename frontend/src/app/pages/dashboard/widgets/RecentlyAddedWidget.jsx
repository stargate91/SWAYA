import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSettingsQuery } from '../../../queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useRecentlyAddedInfiniteQuery,
} from '../../../queries/dashboardQueries';
import RecommendationCarousel from './components/RecommendationCarousel';
import RecommendationSkeleton from './components/RecommendationSkeleton';
import useRecommendationActions from './hooks/useRecommendationActions';
import useWatchlistHandler from './hooks/useWatchlistHandler';

import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { useTranslation } from '../../../providers/LanguageContext';

export default function RecentlyAddedWidget() {
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

  const { handlePlayClick, handleCardClick, playMutationPending } = useRecommendationActions();

  const {
    data: paginatedData,
    isLoading: isAddedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyAddedInfiniteQuery(language, includeAdult);

  const handleLoadMoreAdded = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const filteredItems = useMemo(() => {
    const list = paginatedData?.pages ? paginatedData.pages.flat() : [];
    return list.filter((item) => {
      if (sessionMode === 'sfw') {
        const isAdult = item.is_adult || item.adult || item.media_type === 'scene' || item.type === 'scene';
        return !isAdult;
      }
      return true;
    });
  }, [paginatedData, sessionMode]);

  const isLoading = isRecsLoading || isAddedLoading;

  if (isLoading) {
    return <RecommendationSkeleton />;
  }

  if (!filteredItems?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.recently_added') || 'Recently Added'}
      items={filteredItems}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      onLoadMore={handleLoadMoreAdded}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      settings={settings}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}
