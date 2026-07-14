import PropTypes from 'prop-types';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import {
  SpotlightBanner,
  RecommendationSkeleton,
  useRecommendationActions,
  useWatchlistHandler,
} from './recommendationsShared';

export default function SpotlightWidget({ T }) {
  const { data: recommendations, isLoading } = useRecommendationsQuery();
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { handleCardClick } = useRecommendationActions();

  if (isLoading) {
    return <RecommendationSkeleton showBanner />;
  }

  if (!recommendations?.trending?.length) {
    return null;
  }

  return (
    <SpotlightBanner
      item={recommendations.trending[0]}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      T={T}
    />
  );
}

SpotlightWidget.propTypes = {
  T: PropTypes.func.isRequired,
};
