import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSettingsQuery } from '../../../queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import {
  RecommendationCarousel,
  useRecommendationActions,
  useWatchlistHandler,
} from './recommendationsShared';
import api from '../../../lib/api';

import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';

export default function RecentlyAddedWidget({ T }) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult && sessionMode === 'nsfw';
  const language = settings?.ui_language || settings?.primary_metadata_language;

  const { data: recommendations, isLoading } = useRecommendationsQuery(language, includeAdult);
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { handlePlayClick, handleCardClick, playMutationPending } = useRecommendationActions();

  const [recentlyAddedItems, setRecentlyAddedItems] = useState([]);
  const [recentlyAddedPage, setRecentlyAddedPage] = useState(1);
  const [hasMoreRecentlyAdded, setHasMoreRecentlyAdded] = useState(true);
  const [isLoadingMoreAdded, setIsLoadingMoreAdded] = useState(false);

  const [prevRecommendations, setPrevRecommendations] = useState(null);

  if (recommendations && recommendations !== prevRecommendations) {
    const isFirstLoad = !prevRecommendations;
    const firstItemChanged = recommendations?.recently_added?.[0]?.id !== prevRecommendations?.recently_added?.[0]?.id;

    setPrevRecommendations(recommendations);

    setRecentlyAddedItems((prev) => {
      if (isFirstLoad || firstItemChanged) {
        setRecentlyAddedPage(1);
        setHasMoreRecentlyAdded((recommendations.recently_added || []).length === 20);
        return recommendations.recently_added || [];
      }
      const freshMap = new Map((recommendations.recently_added || []).map(item => [item.id, item]));
      return prev.map(item => freshMap.has(item.id) ? { ...item, ...freshMap.get(item.id) } : item);
    });
  }

  const handleLoadMoreAdded = async () => {
    if (isLoadingMoreAdded || !hasMoreRecentlyAdded) return;
    setIsLoadingMoreAdded(true);
    const nextPage = recentlyAddedPage + 1;
    try {
      const data = await api.recommendations.getRecentlyAdded(nextPage, 20, includeAdult, language);
      if (data && data.length > 0) {
        setRecentlyAddedItems((prev) => [...prev, ...data]);
        setRecentlyAddedPage(nextPage);
        setHasMoreRecentlyAdded(data.length === 20);
      } else {
        setHasMoreRecentlyAdded(false);
      }
    } catch (err) {
      console.error('Failed to load more recently added:', err);
    } finally {
      setIsLoadingMoreAdded(false);
    }
  };

  const filteredItems = recentlyAddedItems.filter((item) => {
    if (sessionMode === 'sfw') {
      const isAdult = item.is_adult || item.adult || item.media_type === 'scene' || item.type === 'scene';
      return !isAdult;
    }
    return true;
  });

  if (isLoading || !filteredItems?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.recently_added') || 'Recently Added'}
      items={filteredItems}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      T={T}
      onLoadMore={handleLoadMoreAdded}
      hasMore={hasMoreRecentlyAdded}
      isLoadingMore={isLoadingMoreAdded}
      settings={settings}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}

RecentlyAddedWidget.propTypes = {
  T: PropTypes.func.isRequired,
  language: PropTypes.string,
};
