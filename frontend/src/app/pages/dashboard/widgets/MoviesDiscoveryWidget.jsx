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
import './RecommendationsWidget.css';

export default function MoviesDiscoveryWidget({ T }) {
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

  if (isLoading || !recommendations?.discover_movies?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.discover_movies') || 'Discover Movies'}
      items={recommendations.discover_movies}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      T={T}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}

MoviesDiscoveryWidget.propTypes = {
  T: PropTypes.func.isRequired,
};
