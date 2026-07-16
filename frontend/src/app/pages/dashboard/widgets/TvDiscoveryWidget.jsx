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

export default function TvDiscoveryWidget() {
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

  if (!recommendations?.discover_tv?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.discover_series') || 'Discover TV Shows'}
      items={recommendations.discover_tv}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}
