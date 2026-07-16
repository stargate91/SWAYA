import { useSettingsQuery } from '../../../queries/settingsQueries';
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

export default function AdultRecommendationsWidget() {
  const { t: T } = useTranslation();
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult;

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

  if (!includeAdult) {
    return null;
  }

  if (isLoading) {
    return <RecommendationSkeleton />;
  }

  if (!recommendations?.discover_adult?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.discover_adult') || 'Discover Adult Movies'}
      items={recommendations.discover_adult}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      isAdultCarousel={true}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}
