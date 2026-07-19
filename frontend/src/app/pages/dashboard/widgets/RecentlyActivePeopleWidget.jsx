import RecommendationCarousel from './components/RecommendationCarousel';
import WidgetShell from '@/ui/WidgetShell';
import { useTranslation } from '../../../providers/LanguageContext';
import useRecentlyActivePeople from './hooks/useRecentlyActivePeople';

export default function RecentlyActivePeopleWidget() {
  const { t: T } = useTranslation();
  const {
    includeAdult,
    items,
    isLoading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
    handleLoadMorePeople,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyActivePeople();

  if (!isLoading && !items?.length) {
    return null;
  }

  return (
    <WidgetShell loading={isLoading} size="lg" transparent={true}>
      <RecommendationCarousel
        title={T(includeAdult ? 'dashboard.recommendations.recently_activated_people_adult' : 'dashboard.recommendations.recently_activated_people') || (includeAdult ? 'Recently Followed Adult Stars' : 'Recently Tracked People')}
        items={items}
        watchlistIds={actualWatchlistIds}
        onWatchlist={handleWatchlist}
        onCardClick={handleCardClick}
        onLoadMore={handleLoadMorePeople}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </WidgetShell>
  );
}
