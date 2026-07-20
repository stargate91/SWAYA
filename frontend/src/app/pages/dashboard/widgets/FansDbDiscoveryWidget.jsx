import RecommendationCarousel from './components/RecommendationCarousel';
import WidgetShell from '@/ui/WidgetShell';
import { useTranslation } from '../../../providers/LanguageContext';
import { useSettingsQuery } from '@/queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '@/queries/dashboardQueries';
import useWatchlistHandler from './hooks/useWatchlistHandler';
import useRecommendationActions from './hooks/useRecommendationActions';

export default function FansDbDiscoveryWidget() {
  const { t: T } = useTranslation();
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult;
  const fansDbKey = settings?.fansdb_api_key;

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

  if (!includeAdult || !fansDbKey) {
    return null;
  }

  if (!isLoading && !recommendations?.discover_fansdb?.length) {
    return null;
  }

  return (
    <WidgetShell loading={isLoading} size="lg" transparent={true}>
      <RecommendationCarousel
        title={T('dashboard.recommendations.discover_fansdb') || 'FansDB Discovery'}
        items={recommendations?.discover_fansdb || []}
        watchlistIds={actualWatchlistIds}
        onWatchlist={handleWatchlist}
        onCardClick={handleCardClick}
        isAdultCarousel={true}
        settings={settings}
        onPlayClick={handlePlayClick}
        playMutationPending={playMutationPending}
      />
    </WidgetShell>
  );
}
