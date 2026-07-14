import PropTypes from 'prop-types';
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

export default function TvDiscoveryWidget({ T }) {
  const { data: recommendations, isLoading } = useRecommendationsQuery();
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { handlePlayClick, handleCardClick, playMutationPending } = useRecommendationActions();

  if (isLoading || !recommendations?.discover_tv?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.discover_series') || 'Discover TV Shows'}
      items={recommendations.discover_tv}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      T={T}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}

TvDiscoveryWidget.propTypes = {
  T: PropTypes.func.isRequired,
};
