import PropTypes from 'prop-types';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import RecommendationCarousel from './components/RecommendationCarousel';
import RecommendationSkeleton from './components/RecommendationSkeleton';
import useRecommendationActions from './hooks/useRecommendationActions';
import useWatchlistHandler from './hooks/useWatchlistHandler';
import { useTranslation } from '../../../providers/LanguageContext';

export default function MoviesDiscoveryWidget() {
  const { t: T } = useTranslation();
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

  if (isLoading) {
    return <RecommendationSkeleton />;
  }

  if (!recommendations?.discover_movies?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.discover_movies') || 'Discover Movies'}
      items={recommendations.discover_movies}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}
