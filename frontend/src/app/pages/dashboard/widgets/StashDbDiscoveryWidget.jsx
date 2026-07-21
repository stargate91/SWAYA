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
import AdultDashboardFocusSelector from '../components/AdultDashboardFocusSelector';

export default function StashDbDiscoveryWidget() {
  const { t: T } = useTranslation();
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult;
  const stashDbKey = settings?.stashdb_api_key;
  const currentFocus = settings?.adult_stashdb_focus_tag || '';

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

  if (!includeAdult || !stashDbKey) {
    return null;
  }

  if (!isLoading && !recommendations?.discover_stashdb?.length && !currentFocus) {
    return null;
  }

  return (
    <WidgetShell loading={isLoading} size="lg" transparent={true}>
      <RecommendationCarousel
        title={T('dashboard.recommendations.discover_stashdb') || 'StashDB Discovery'}
        items={recommendations?.discover_stashdb || []}
        watchlistIds={actualWatchlistIds}
        onWatchlist={handleWatchlist}
        onCardClick={handleCardClick}
        isAdultCarousel={true}
        settings={settings}
        onPlayClick={handlePlayClick}
        playMutationPending={playMutationPending}
        headerActions={
          <AdultDashboardFocusSelector
            provider="stashdb"
            currentFocus={currentFocus}
            t={T}
          />
        }
      />
    </WidgetShell>
  );
}
