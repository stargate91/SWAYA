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

  // 'stashdb' or 'fansdb'
  const [adultProvider, setAdultProvider] = useState('stashdb');

  const stashdbItems = recommendations?.discover_stashdb || [];
  const fansdbItems = recommendations?.discover_fansdb || [];

  // If one of the providers is empty but the other has items, auto-select the active one
  useEffect(() => {
    if (isNsfw) {
      if (stashdbItems.length === 0 && fansdbItems.length > 0) {
        setAdultProvider('fansdb');
      } else if (fansdbItems.length === 0 && stashdbItems.length > 0) {
        setAdultProvider('stashdb');
      }
    }
  }, [isNsfw, stashdbItems.length, fansdbItems.length]);

  if (isLoading) {
    return <RecommendationSkeleton showBanner />;
  }

  if (isNsfw) {
    const currentItems = adultProvider === 'stashdb' ? stashdbItems : fansdbItems;
    const hasStash = stashdbItems.length > 0;
    const hasFans = fansdbItems.length > 0;

    if (!hasStash && !hasFans) {
      return null;
    }

    const item = currentItems[0];
    if (!item) return null;

    const handleToggleProvider = () => {
      if (hasStash && hasFans) {
        setAdultProvider((prev) => (prev === 'stashdb' ? 'fansdb' : 'stashdb'));
      }
    };

    return (
      <div style={{ position: 'relative' }}>
        <SpotlightBanner
          item={item}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          isAdult={true}
        />
        {hasStash && hasFans && (
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
                minWidth: '70px',
                padding: '0 var(--space-xs)',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: 'var(--color-text-primary)',
                textAlign: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={handleToggleProvider}
            >
              {adultProvider === 'stashdb' ? 'StashDB' : 'FansDB'}
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={handleToggleProvider}
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
                onClick={handleToggleProvider}
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
