import { useLayoutEffect, useRef, useState } from 'react';
import Grid from '@/ui/Grid';
import PosterCard from '@/ui/PosterCard';
import Pill from '@/ui/Pill';
import ScrollRow from '@/ui/ScrollRow';
import { API_BASE } from '@/lib/backend';
import { isTvLikeMediaType } from '@/lib/mediaTypes';
import { getPosterImagePath } from '@/lib/imageUrls';
import { ENTITY_ICONS } from '@/ui/icons';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import { navigateToCreditDetail } from '../../utils/mediaNavigation';
import './PersonCreditsShared.css';

export function OverviewContent({ text, emptyText, t, openDrawer, className = '' }) {
  const overviewRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = overviewRef.current;
    if (!element) {
      return undefined;
    }

    let frameId = null;
    let resizeObserver = null;

    const measure = () => {
      setIsTruncated(element.scrollHeight > element.clientHeight + 1);
    };

    const scheduleMeasure = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(measure);
    };

    scheduleMeasure();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      resizeObserver.observe(element);
    }

    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [text]);

  return (
    <div className={`media-detail-page__overview entity-detail-page__overview ${className}`.trim()}>
      {text ? (
        <>
          <div ref={overviewRef} className="media-detail-page__overview-text">
            {text}
          </div>
          {isTruncated && (
            <button
              type="button"
              className="media-detail-page__read-more-btn"
              onClick={openDrawer}
            >
              {t('library.details.readMore') || 'Read More'}
            </button>
          )}
        </>
      ) : (
        <p className="entity-detail-page__overview-text entity-detail-page__overview-text--muted">
          {emptyText}


        </p>
      )}
    </div>
  );
}

export function EntityCardGrid({ items, type, navigate, t }) {
  if (!items?.length) {
    return null;
  }

  const openItem = (item) => {
    navigateToCreditDetail(navigate, item, type, item.source);
  };

  return (
    <Grid variant="poster">
      {items.map((item, index) => {
        const resolvedType = item.media_type || item.type || type;
        const posterPath = getPosterImagePath(item) || item.backdrop_path || item.local_backdrop_path;
        const subtitleParts = [];
        if (item.year) subtitleParts.push(String(item.year));
        if (item.job) subtitleParts.push(item.job);
        if (item.character) subtitleParts.push(item.character);
        if (item.episode_count) {
          subtitleParts.push(
            t('library.details.episodePlural', {
              count: item.episode_count,
              defaultValue: `${item.episode_count} Episodes`,
            })
          );
        }

        return (
          <PosterCard
            key={`${type}-${item.tmdb_id || item.id}`}
            title={item.title}
            subtitle={subtitleParts.join(' - ')}
            imageUrl={resolveDetailsImageUrl(posterPath, API_BASE, 'poster')}
            ratingImdb={item.rating_imdb}
            ratingTmdb={item.rating_tmdb ?? item.rating}
            icon={isTvLikeMediaType(resolvedType) ? ENTITY_ICONS.tv : ENTITY_ICONS.movie}
            customStyle={{ '--item-index': index }}
            onClick={() => openItem(item)}
          />
        );
      })}
    </Grid>
  );
}

function HorizontalCollectionItemsList({ items, navigate, t, customStyle }) {
  if (!items?.length) {
    return null;
  }

  const openItem = (item) => {
    navigateToCreditDetail(navigate, item, item.media_type || item.type, item.source);
  };

  return (
    <div
      className="entity-detail-page__credits-list entity-detail-page__credits-list--collection-items"
      /* eslint-disable-next-line react/forbid-dom-props */
      style={customStyle}
    >
      {items.map((item, index) => {
        const isTv = isTvLikeMediaType(item.media_type || item.type);
        const posterPath = getPosterImagePath(item) || item.backdrop_path || item.local_backdrop_path;
        const posterUrl = posterPath ? resolveDetailsImageUrl(posterPath, API_BASE, 'poster') : null;

        const ratingPill = item.in_library ? (
          <Pill variant="success">
            {t('library.details.have') || 'HAVE'}
          </Pill>
        ) : (
          <Pill variant="missing">
            {t('library.details.missing') || 'MISSING'}
          </Pill>
        );

        return (
          <PosterCard
            key={`collection-item-${item.media_type || item.type || 'movie'}-${item.tmdb_id || item.id}`}
            title={item.title}
            subtitle={item.year ? String(item.year) : undefined}
            imageUrl={posterUrl}
            ratingPill={ratingPill}
            icon={isTv ? ENTITY_ICONS.tv : ENTITY_ICONS.movie}
            onClick={() => openItem(item)}
            customStyle={{ '--item-index': index }}
            isMissing={!item.in_library}
          />
        );
      })}
    </div>
  );
}

export function CollectionItemsSection({ items, navigate, t }) {
  const [prevItems, setPrevItems] = useState(items);
  const [limit, setLimit] = useState(30);

  if (items !== prevItems) {
    setPrevItems(items);
    setLimit(30);
  }

  const handleScroll = (e) => {
    const container = e.currentTarget;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    if (scrollWidth - scrollLeft - clientWidth < 300) {
      setLimit((prev) => Math.min(items.length, prev + 20));
    }
  };

  const visibleItems = (items || []).slice(0, limit);
  const cols = Math.max(1, visibleItems.length <= 12 ? visibleItems.length : Math.ceil(visibleItems.length / 2));

  return (
    <section className="entity-detail-page__content-section">
      <div className="entity-detail-page__section-header">
        <h2>{t('library.details.collectionItemsTitle') || 'Collection Items'}</h2>
      </div>
      <ScrollRow
        onScroll={handleScroll}
        containerClassName="collection-items-horizontal-grid-wrapper"
        showArrows={true}
      >
        <HorizontalCollectionItemsList
          items={visibleItems}
          navigate={navigate}
          t={t}
          customStyle={{ '--cols': cols }}
        />
      </ScrollRow>
    </section>
  );
}
