import RecommendationCarousel from './components/RecommendationCarousel';
import WidgetShell from '@/ui/WidgetShell';
import { useTranslation } from '../../../providers/LanguageContext';
import useAdultRecommendations from './hooks/useAdultRecommendations';

export default function AdultRecommendationsWidget() {
  const { t: T } = useTranslation();
  const {
    includeAdult,
    recommendations,
    isLoading,
    actualWatchlistIds,
    handleWatchlist,
    handlePlayClick,
    handleCardClick,
    playMutationPending,
  } = useAdultRecommendations();

  if (!includeAdult) {
    return null;
  }

  if (!isLoading && !recommendations?.discover_adult?.length) {
    return null;
  }

  return (
    <WidgetShell loading={isLoading} size="lg" transparent={true}>
      <RecommendationCarousel
        title={T('dashboard.recommendations.discover_adult') || 'Discover Adult Movies'}
        items={recommendations?.discover_adult || []}
        watchlistIds={actualWatchlistIds}
        onWatchlist={handleWatchlist}
        onCardClick={handleCardClick}
        isAdultCarousel={true}
        onPlayClick={handlePlayClick}
        playMutationPending={playMutationPending}
      />
    </WidgetShell>
  );
}
