import { useState } from 'react';
import SpotlightBanner from './components/SpotlightBanner';
import RecommendationSkeleton from './components/RecommendationSkeleton';
import useSpotlight from './hooks/useSpotlight';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import styles from './components/SpotlightBanner.module.css';

export default function SpotlightWidget() {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings = {} } = useSettingsQuery();
  const showAdult = Boolean(settings?.include_adult);
  const isNsfw = showAdult && sessionMode === 'nsfw';

  const {
    recommendations,
    isLoading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
  } = useSpotlight();

  const stashdbItems = recommendations?.discover_adult_providers?.stashdb || [];
  const tmdbAdultItems = recommendations?.discover_adult || [];
  const fansdbItems = recommendations?.discover_adult_providers?.fansdb || [];

  // Compute default provider initial value based on items availability
  const initialAdultProvider = (() => {
    if (stashdbItems.length > 0) return 'stashdb';
    if (tmdbAdultItems.length > 0) return 'tmdb';
    if (fansdbItems.length > 0) return 'fansdb';
    return 'stashdb';
  })();

  // 'stashdb', 'tmdb' or 'fansdb'
  const [adultProvider, setAdultProvider] = useState(initialAdultProvider);

  if (isLoading) {
    return <RecommendationSkeleton showBanner />;
  }

  if (isNsfw) {
    const providersList = [];
    if (stashdbItems.length > 0) providersList.push({ id: 'stashdb', label: 'StashDB', items: stashdbItems });
    if (tmdbAdultItems.length > 0) providersList.push({ id: 'tmdb', label: 'TMDb Adult', items: tmdbAdultItems });
    if (fansdbItems.length > 0) providersList.push({ id: 'fansdb', label: 'FansDB', items: fansdbItems });

    if (providersList.length === 0) {
      return null;
    }

    // Ensure currently selected provider actually has items, fallback to first available
    const activeProviderObj = providersList.find(p => p.id === adultProvider) || providersList[0];
    const currentItems = activeProviderObj.items;
    const item = currentItems[0];
    
    if (!item) return null;

    const handleNextProvider = () => {
      if (providersList.length <= 1) return;
      const currentIndex = providersList.findIndex(p => p.id === activeProviderObj.id);
      const nextIndex = (currentIndex + 1) % providersList.length;
      setAdultProvider(providersList[nextIndex].id);
    };

    const handlePrevProvider = () => {
      if (providersList.length <= 1) return;
      const currentIndex = providersList.findIndex(p => p.id === activeProviderObj.id);
      const prevIndex = (currentIndex - 1 + providersList.length) % providersList.length;
      setAdultProvider(providersList[prevIndex].id);
    };

    return (
      <div className={styles['spotlight-wrapper']}>
        <SpotlightBanner
          item={item}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          isAdult={activeProviderObj.id !== 'tmdb'} /* TMDb backdrops do not need local api proxying */
        />
        {providersList.length > 1 && (
          <div className={styles['provider-controls']}>
            <button
              type="button"
              className={styles['provider-label']}
              onClick={handleNextProvider}
            >
              {activeProviderObj.label}
            </button>
            <div className={styles['provider-btn-group']}>
              <button
                type="button"
                onClick={handlePrevProvider}
                className={styles['provider-btn']}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextProvider}
                className={styles['provider-btn']}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!recommendations?.trending?.length) {
    return null;
  }

  return (
    <SpotlightBanner
      item={recommendations.trending[0]}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
    />
  );
}
