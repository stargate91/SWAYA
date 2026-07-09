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
import './RecommendationsWidget.css';

export default function AdultRecommendationsWidget({ T }) {
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

  if (isLoading || !includeAdult || !recommendations?.discover_adult?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T('dashboard.recommendations.discover_adult') || 'Discover Adult Movies'}
      items={recommendations.discover_adult}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      T={T}
      isAdultCarousel={true}
      onPlayClick={handlePlayClick}
      playMutationPending={playMutationPending}
    />
  );
}

AdultRecommendationsWidget.propTypes = {
  T: PropTypes.func.isRequired,
};
