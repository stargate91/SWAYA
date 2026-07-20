import { useState, useEffect } from 'react';
import SpotlightBanner from './components/SpotlightBanner';
import RecommendationSkeleton from './components/RecommendationSkeleton';
import useSpotlight from './hooks/useSpotlight';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import Button from '@/ui/Button';
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

  // 'stashdb', 'tmdb' or 'fansdb'
  const [adultProvider, setAdultProvider] = useState('stashdb');

  const stashdbItems = (recommendations?.discover_stashdb || []).filter(item => item.backdrop_path || item.poster_path);
  const tmdbAdultItems = (recommendations?.discover_adult || []).filter(item => item.backdrop_path || item.poster_path);
  const fansdbItems = (recommendations?.discover_fansdb || []).filter(item => item.backdrop_path || item.poster_path);

  // Set initial provider based on priority StashDB > TMDb > FansDB and availability
  useEffect(() => {
    if (isNsfw) {
      if (stashdbItems.length > 0) {
        setAdultProvider('stashdb');
      } else if (tmdbAdultItems.length > 0) {
        setAdultProvider('tmdb');
      } else if (fansdbItems.length > 0) {
        setAdultProvider('fansdb');
      }
    }
  }, [isNsfw, stashdbItems.length, tmdbAdultItems.length, fansdbItems.length]);

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
      <div style={{ position: 'relative' }}>
        <SpotlightBanner
          item={item}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          isAdult={activeProviderObj.id !== 'tmdb'} /* TMDb backdrops do not need local api proxying */
        />
        {providersList.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 'var(--space-4xl)',
              right: 'var(--space-4xl)',
              zIndex: 'var(--z-index-sticky)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              background: 'color-mix(in srgb, var(--color-bg-canvas) 80%, transparent)',
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 'var(--radius-full)',
              backdropFilter: 'blur(10px)',
              border: '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
            }}
          >
            <span
              style={{
                minWidth: '85px',
                padding: '0 var(--space-xs)',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: 'var(--color-text-primary)',
                textAlign: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={handleNextProvider}
            >
              {activeProviderObj.label}
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={handlePrevProvider}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextProvider}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
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
