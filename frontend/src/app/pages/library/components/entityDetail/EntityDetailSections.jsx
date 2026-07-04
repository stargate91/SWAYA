import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PosterGrid from '@/ui/PosterGrid';
import PosterCard from '@/ui/PosterCard';
import Pill from '@/ui/Pill';
import EmptyState from '@/ui/EmptyState';
import BackdropCard from '@/ui/BackdropCard';
import ImageUploadPanel from '../../modals/ImageUploadPanel';
import { API_BASE } from '@/lib/backend';
import { isTvLikeMediaType, isSceneMediaType } from '@/lib/mediaTypes';
import { getPosterImagePath, buildTmdbImageUrl, TMDB_IMAGE_SIZES } from '@/lib/imageUrls';
import { Film, ImageOff, Tv } from 'lucide-react';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import { normalizeBackdropKey } from '../../utils/personCreditsUtils';
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
    const resolvedType = item.media_type || item.type || type;
    if (isTvLikeMediaType(resolvedType)) {
      const tvId = item.library_tv_tmdb_id || item.tv_tmdb_id || item.tmdb_id || item.id;
      navigate(`/library/tv/${tvId}`, { state: { allowAdult: true } });
      return;
    }

    if (isSceneMediaType(resolvedType)) {
      const itemSource = item.source;
      const prefix = itemSource === 'porndb' || itemSource === 'theporndb' ? 'porndb' : itemSource === 'fansdb' ? 'fansdb' : 'stash';
      const sceneId = item.in_library ? (item.library_item_id || item.id) : `${prefix}_${item.stash_id || item.id}`;
      navigate(`/library/scene/${sceneId}`, { state: { allowAdult: true } });
      return;
    }

    const movieId = item.in_library ? (item.library_item_id || item.id) : `tmdb_${item.tmdb_id || item.id}`;
    navigate(`/library/movie/${movieId}`, { state: { allowAdult: true } });
  };

  return (
    <PosterGrid>
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
            icon={isTvLikeMediaType(resolvedType) ? Tv : Film}
            customStyle={{ '--item-index': index }}
            onClick={() => openItem(item)}
          />
        );
      })}
    </PosterGrid>
  );
}

function HorizontalCollectionItemsList({ items, navigate, t }) {
  if (!items?.length) {
    return null;
  }

  const openItem = (item) => {
    const resolvedType = item.media_type || item.type;
    if (isTvLikeMediaType(resolvedType)) {
      const tvId = item.library_tv_tmdb_id || item.tv_tmdb_id || item.tmdb_id || item.id;
      navigate(`/library/tv/${tvId}`, { state: { allowAdult: true } });
      return;
    }

    if (isSceneMediaType(resolvedType)) {
      const itemSource = item.source;
      const prefix = itemSource === 'porndb' || itemSource === 'theporndb' ? 'porndb' : itemSource === 'fansdb' ? 'fansdb' : 'stash';
      const sceneId = item.in_library ? (item.library_item_id || item.id) : `${prefix}_${item.stash_id || item.id}`;
      navigate(`/library/scene/${sceneId}`, { state: { allowAdult: true } });
      return;
    }

    const movieId = item.in_library ? (item.library_item_id || item.id) : `tmdb_${item.tmdb_id || item.id}`;
    navigate(`/library/movie/${movieId}`, { state: { allowAdult: true } });
  };

  return (
    <div className="entity-detail-page__credits-list entity-detail-page__credits-list--collection-items">
      {items.map((item, index) => {
        const isTv = isTvLikeMediaType(item.media_type || item.type);
        const posterPath = getPosterImagePath(item) || item.backdrop_path || item.local_backdrop_path;
        const posterUrl = posterPath ? resolveDetailsImageUrl(posterPath, API_BASE, 'poster') : null;

        const ratingPill = item.in_library ? (
          <Pill variant="success">
            {t('library.details.have') || 'HAVE'}
          </Pill>
        ) : (
          <Pill variant="default">
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
            icon={isTv ? Tv : Film}
            onClick={() => openItem(item)}
            customStyle={{ '--item-index': index }}
            className={item.in_library ? 'is-owned' : 'is-missing'}
          />
        );
      })}
    </div>
  );
}

export function CollectionBackdropsPanel({ item, collectionId, t, toast, overrideBackdropMutation, uploadBackdropMutation }) {
  const [selectedBackdropPath, setSelectedBackdropPath] = useState(item?.backdrop_path || '');
  const backdropOptions = useMemo(() => {
    const seen = new Set();
    const collectionBackdrops = [];

    for (const option of (item?.collection_backdrops || [])
      .map((bd, index) => ({
        backdrop_path: bd.file_path,
        backdrop_key: normalizeBackdropKey(bd.file_path),
        width: bd.width,
        height: bd.height,
        vote_average: bd.vote_average,
        sort_score: Number(bd.vote_average) || 0,
        sort_votes: Number(bd.vote_count) || 0,
        sort_index: index,
        iso_639_1: bd.iso_639_1,
      }))
      .filter((option) => option.backdrop_path && option.backdrop_key && (!option.iso_639_1 || option.iso_639_1 === 'null'))
      .sort((a, b) => (
        (b.sort_score - a.sort_score)
        || (b.sort_votes - a.sort_votes)
        || (a.sort_index - b.sort_index)
      ))) {
      if (seen.has(option.backdrop_key)) {
        continue;
      }
      seen.add(option.backdrop_key);
      collectionBackdrops.push({
        backdrop_path: option.backdrop_path,
        backdrop_key: option.backdrop_key,
        width: option.width,
        height: option.height,
        vote_average: option.vote_average,
      });
    }

    return collectionBackdrops;
  }, [item]);

  const currentBackdropPath = selectedBackdropPath || item?.backdrop_path || '';
  const currentBackdropKey = normalizeBackdropKey(currentBackdropPath);

  const handleUploadBackdrop = async (file) => {
    if (!file || uploadBackdropMutation?.isPending) return;
    try {
      const data = await uploadBackdropMutation.mutateAsync({ itemId: 'collection_' + collectionId, file });
      setSelectedBackdropPath(data?.backdrop_path || item?.backdrop_path || '');
      toast(t('library.details.imageUploaded') || 'Image uploaded and updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.imageUploadFailed') || 'Failed to upload image', 'danger');
    }
  };

  const handleSelectBackdrop = async (backdropPath) => {
    setSelectedBackdropPath(backdropPath);
    try {
      await overrideBackdropMutation.mutateAsync({
        itemId: `collection_${collectionId}`,
        backdropPath,
      });
      toast(t('library.details.backdropUpdated') || 'Backdrop updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.backdropUpdateFailed') || 'Failed to update backdrop', 'danger');
    }
  };

  return (
    <div className="backdrops-panel">
      <ImageUploadPanel
        imageType="backdrop"
        isPending={overrideBackdropMutation.isPending || Boolean(uploadBackdropMutation?.isPending)}
        t={t}
        onSaveUrl={handleSelectBackdrop}
        onUploadFile={handleUploadBackdrop}
      />

      <div className="backdrops-grid">
        {backdropOptions.map((option, idx) => {
          const backdropUrl = option.backdrop_path.startsWith('/')
            ? buildTmdbImageUrl(option.backdrop_path, TMDB_IMAGE_SIZES.backdropThumb)
            : resolveDetailsImageUrl(option.backdrop_path, API_BASE, 'backdropThumb');
          const isPending = overrideBackdropMutation.isPending && overrideBackdropMutation.variables?.backdropPath === option.backdrop_path;
          const isSelected = (currentBackdropKey !== '' && currentBackdropKey === option.backdrop_key) || isPending;
          const resolutionLabel = option.width && option.height ? `${option.width}×${option.height}` : '';
          const ratingLabel = option.vote_average ? `★ ${Number(option.vote_average).toFixed(1)}` : '';

          return (
            <BackdropCard
              key={`${option.backdrop_path}-${idx}`}
              imageUrl={backdropUrl}
              alt={option.backdrop_path}
              isSelected={isSelected}
              isPending={isPending || Boolean(uploadBackdropMutation?.isPending)}
              infoLeft={resolutionLabel}
              infoRight={ratingLabel}
              onClick={() => handleSelectBackdrop(option.backdrop_path)}
            />
          );
        })}
        {backdropOptions.length === 0 && (
          <EmptyState
            icon={ImageOff}
            title={t('library.details.noBackdropsAvailable') || 'No good backdrop options found for this title.'}
            className="backdrops-panel__empty-state"
          />
        )}
      </div>
    </div>
  );
}

export function CollectionItemsSection({ items, navigate, t }) {
  const [prevItems, setPrevItems] = useState(null);
  const [limit, setLimit] = useState(30);
  const scrollContainerRef = useRef(null);

  if (items !== prevItems) {
    setPrevItems(items);
    setLimit(30);
  }

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      if (scrollWidth - scrollLeft - clientWidth < 300) {
        setLimit((prev) => Math.min(items.length, prev + 20));
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [items.length]);

  const visibleItems = (items || []).slice(0, limit);
  const cols = Math.max(1, visibleItems.length <= 12 ? visibleItems.length : Math.ceil(visibleItems.length / 2));

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.setProperty('--cols', cols);
    }
  }, [cols]);

  return (
    <section className="entity-detail-page__content-section">
      <div className="entity-detail-page__section-header">
        <h2>{t('library.details.collectionItemsTitle') || 'Collection Items'}</h2>
      </div>
      <div 
        ref={scrollContainerRef} 
        className="collection-items-horizontal-grid-wrapper"
      >
        <HorizontalCollectionItemsList items={visibleItems} navigate={navigate} t={t} />
      </div>
    </section>
  );
}
