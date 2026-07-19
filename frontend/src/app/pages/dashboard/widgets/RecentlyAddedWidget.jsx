import RecommendationCarousel from './components/RecommendationCarousel';
import WidgetShell from '@/ui/WidgetShell';
import { useTranslation } from '../../../providers/LanguageContext';
import useRecentlyAdded from './hooks/useRecentlyAdded';

export default function RecentlyAddedWidget() {
  const { t: T } = useTranslation();
  const {
    settings,
    filteredItems,
    isLoading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
    handlePlayClick,
    playMutationPending,
    handleLoadMoreAdded,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyAdded();

  if (!isLoading && !filteredItems?.length) {
    return null;
  }

  return (
    <WidgetShell loading={isLoading} size="lg" transparent={true}>
      <RecommendationCarousel
        title={T('dashboard.recommendations.recently_added') || 'Recently Added'}
        items={filteredItems || []}
        watchlistIds={actualWatchlistIds}
        onWatchlist={handleWatchlist}
        onCardClick={handleCardClick}
        onLoadMore={handleLoadMoreAdded}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        settings={settings}
        onPlayClick={handlePlayClick}
        playMutationPending={playMutationPending}
      />
    </WidgetShell>
  );
}
