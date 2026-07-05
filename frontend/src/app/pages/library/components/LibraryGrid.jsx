import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import './entityDetail/EntityDetailHeroSection.css';
import { usePlayMediaMutation, useSettingsQuery } from '@/queries';
import api from '@/lib/api';
import EmptyState from '@/ui/EmptyState';
import Button from '@/ui/Button';
import IconButton from '@/ui/IconButton';
import NavButton from '@/ui/NavButton';
import PosterGrid from '@/ui/PosterGrid';
import {
  getPosterImagePath,
  getProfileImagePath,
  getTvPosterImagePath,
  resolveMediaImageUrl,
} from '@/lib/imageUrls';
import {
  getLibraryTagBucketKeys,
  isLibraryMovieTab,
  isLibraryPeopleTab,
  isLibraryTvTab,
  isLibraryTagsTab,
  isLibraryScenesTab,
} from '@/lib/libraryTabs';
import { isMovieMediaType, isPersonMediaType, isTvLikeMediaType, isSceneMediaType } from '@/lib/mediaTypes';
import { Pencil, Plus, Trash2, UserPlus } from '@/ui/icons';
import { LibraryPosterCard } from './LibraryPosterCard';
import { TagPosterCard } from './TagPosterCard';

export default function LibraryGrid({
  t,
  isDataLoading,
  paginatedItems,
  isTags,
  isCollections,
  resolvedTab,
  emptyTitle,
  emptyDescription,
  emptyStateVariant,
  emptyIcon,
  hasActiveFilters,
  onAddPeople,
  onCreateTag,
  onEditTag,
  onDeleteTag,
  focusedTag,
  onFocusTag,
  onExitTagFocus,
  activeSessionMode,
  onEditImage,
  sortKey,
}) {
  const navigate = useNavigate();
  const playMutation = usePlayMediaMutation();
  const { data: settings } = useSettingsQuery();

  const getNextOwnedEpisode = (tvDetail) => {
    const seasons = Array.isArray(tvDetail?.seasons) ? tvDetail.seasons : [];

    for (const season of seasons) {
      const ownedEpisodes = (season.episodes || []).filter((episode) => episode.path && !episode.is_missing);
      const inProgress = ownedEpisodes.find((episode) => episode.resume_position > 0);
      if (inProgress) return inProgress;
    }

    for (const season of seasons) {
      const ownedEpisodes = (season.episodes || []).filter((episode) => episode.path && !episode.is_missing);
      const unwatched = ownedEpisodes.find((episode) => !episode.is_watched);
      if (unwatched) return unwatched;
    }

    for (const season of seasons) {
      const ownedEpisodes = (season.episodes || []).filter((episode) => episode.path && !episode.is_missing);
      if (ownedEpisodes.length > 0) return ownedEpisodes[0];
    }

    return null;
  };

  const handlePlayOverlayClick = useCallback(async (event, item) => {
    event.stopPropagation();

    if (playMutation.isPending) return;

    const isTv = item.type === 'tv' || String(item.id).startsWith('tv_');
    if (!isTv) {
      playMutation.mutate(item.id);
      return;
    }

    try {
      const tvId = String(item.id).replace('tv_', '').replace('tmdb_', '');
      const tvDetail = await api.library.getTvDetail(tvId);
      const nextEpisode = getNextOwnedEpisode(tvDetail);
      if (nextEpisode?.id) {
        playMutation.mutate(nextEpisode.id);
      }
    } catch {
      // Ignore overlay play failures and leave normal card navigation intact.
    }
  }, [playMutation]);

  const handleItemClick = useCallback((item) => {
    if (isTags) return;

    if (isCollections) {
      navigate(`/library/collection/${item.tmdb_id || item.id}`);
    } else if (isLibraryPeopleTab(resolvedTab)) {
      navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
    } else if (isLibraryMovieTab(resolvedTab)) {
      navigate(`/library/movie/${item.id}`, { state: { allowAdult: true } });
    } else if (isLibraryTvTab(resolvedTab)) {
      navigate(`/library/tv/${item.id}`, { state: { allowAdult: true } });
    } else if (isLibraryScenesTab(resolvedTab)) {
      navigate(`/library/scene/${item.id}`, { state: { allowAdult: true } });
    }
  }, [isTags, isCollections, resolvedTab, navigate]);

  const openImagePicker = useCallback((item) => {
    const isPeopleCard = isLibraryPeopleTab(resolvedTab);
    const entityId = isCollections
      ? `collection_${item.tmdb_id || item.id}`
      : item.id;
    const entityType = isPeopleCard
      ? 'person'
      : isCollections
        ? 'collection'
        : (isLibraryTvTab(resolvedTab) ? 'tv' : 'movie');
    const imageType = isPeopleCard ? 'profile' : 'poster';
    const currentPath = isPeopleCard
      ? getProfileImagePath(item)
      : isLibraryTvTab(resolvedTab)
        ? getTvPosterImagePath(item)
        : getPosterImagePath(item);
    const tmdbId = isPeopleCard ? item.id : (item.tmdb_id || item.tv_tmdb_id || item.id);

    onEditImage({
      entityId,
      entityType,
      imageType,
      currentPath,
      tmdbId,
      externalIds: item?.external_ids || item,
      item,
      title: isPeopleCard
        ? (t('library.details.changeProfile') || 'Change Profile Picture')
        : (t('library.details.changePoster') || 'Change Poster'),
    });
  }, [resolvedTab, isCollections, t, onEditImage]);

  const resolvePosterUrl = useCallback((path) => {
    return resolveMediaImageUrl(path, 'poster');
  }, []);

  if (isDataLoading && paginatedItems.length === 0) {
    return (
      <div className="library-content">
        <div className="library-loading">
          <div className="library-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="library-content">
      {focusedTag || paginatedItems.length > 0 ? (
        isTags ? (
          focusedTag ? (
            <div className="library-tag-focus-view">
              <div className="library-tag-focus-view__toolbar">
                <NavButton className="library-tag-focus-view__back" onClick={onExitTagFocus}>
                  {t('library.tags.backToTags') || 'Back to Tags'}
                </NavButton>
              </div>
              <ExpandedTagPanel
                key={focusedTag.name}
                tag={focusedTag}
                t={t}
                resolvePosterUrl={resolvePosterUrl}
                emptyIcon={emptyIcon}
                isFocusMode
                activeSessionMode={activeSessionMode}
              />
            </div>
          ) : (
            <div className="library-tags-grid">
              {paginatedItems.map((item, index) => {
                const samplePreviews = Array.isArray(item.sample_previews) ? item.sample_previews.slice(0, 3) : [];
                const previewCount = samplePreviews.length;
                const singlePreview = previewCount === 1 ? samplePreviews[0] : null;
                const singlePreviewImage = (() => {
                  if (!singlePreview) return '';
                  const isPerson = isPersonMediaType(singlePreview.kind);
                  if (isPerson) {
                    return singlePreview.backdrop ? resolveMediaImageUrl(singlePreview.backdrop, 'backdrop') : '';
                  }
                  const isScene = isSceneMediaType(singlePreview.kind);
                  if (isScene) {
                    return singlePreview.still ? resolveMediaImageUrl(singlePreview.still, 'backdrop') : '';
                  }
                  return resolveMediaImageUrl(singlePreview.backdrop || singlePreview.poster, 'backdrop');
                })();
                return (
                  <div
                    key={item.name}
                    role="button"
                    tabIndex={0}
                    className={`library-tag-card ${previewCount > 0 ? `library-tag-card--preview-${Math.min(previewCount, 3)}` : ''}`.trim()}
                    onClick={() => onFocusTag?.(item.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onFocusTag?.(item.name);
                      }
                    }}
                    /* eslint-disable-next-line react/forbid-dom-props */
                    style={{
                      '--tag-color': item.color || 'var(--color-accent)',
                      '--item-index': index,
                    }}
                  >
                    {(previewCount > 1 || singlePreviewImage) ? (
                      <div className="library-tag-card__preview" aria-hidden="true">
                        {samplePreviews.map((preview, index) => (
                          <div
                            key={`${item.name}-preview-${index}`}
                            className="library-tag-card__preview-image"
                            /* eslint-disable-next-line react/forbid-dom-props */
                            style={{
                              backgroundImage: `url(${
                                previewCount === 1
                                  ? singlePreviewImage
                                  : isSceneMediaType(preview.kind)
                                    ? resolveMediaImageUrl(preview.still || preview.backdrop || preview.poster, 'backdrop')
                                    : resolvePosterUrl(preview.poster)
                              })`,
                              backgroundPositionX: preview.position_x != null ? `${preview.position_x}%` : 'center',
                              backgroundPositionY: preview.position_y != null ? `${preview.position_y}%` : 'center',
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="library-tag-card__actions">
                      <IconButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        label={t('library.tags.editBtn') || 'Edit Tag'}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditTag?.(item);
                        }}
                      >
                        <Pencil size={12} />
                      </IconButton>
                      <IconButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        label={t('library.tags.deleteBtn') || 'Delete Tag'}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteTag?.(item);
                        }}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </div>
                    <div className="library-tag-card__content">
                      <span className="library-tag-card__name">{item.name}</span>
                      <span className="library-tag-card__count">
                        {t('library.tags.itemsCount', { count: item.total_count })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <PosterGrid className={isLibraryScenesTab(resolvedTab) ? 'library-scenes-grid' : ''}>
            {paginatedItems.map((item, index) => (
              <LibraryPosterCard
                key={item.id}
                item={item}
                index={index}
                resolvedTab={resolvedTab}
                isCollections={isCollections}
                emptyIcon={emptyIcon}
                t={t}
                playMutationPending={playMutation.isPending}
                onItemClick={handleItemClick}
                onPlayOverlayClick={handlePlayOverlayClick}
                onEditImageClick={openImagePicker}
                settings={settings}
                sortKey={sortKey}
              />
            ))}
          </PosterGrid>
        )
      ) : (
        <EmptyState
          variant={emptyStateVariant}
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          actions={
            isLibraryPeopleTab(resolvedTab) && onAddPeople && !hasActiveFilters ? (
              <Button variant="primary" size="sm" onClick={onAddPeople}>
                <UserPlus size={16} />
                {t('library.people.addPeopleBtn') || 'Add People'}
              </Button>
            ) : isLibraryTagsTab(resolvedTab) && onCreateTag && !hasActiveFilters ? (
              <Button variant="primary" size="sm" onClick={onCreateTag}>
                <Plus size={16} />
                {t('library.tags.createBtn') || 'Create Tag'}
              </Button>
            ) : null
          }
        />
      )}
    </div>
  );
}

function ExpandedTagPanel({ tag, t, resolvePosterUrl, emptyIcon, isFocusMode = false, activeSessionMode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const removeTagMutation = useMutation({
    mutationFn: async (item) => {
      const isPerson = isPersonMediaType(item.type);
      if (isPerson) {
        const detail = await api.people.getDetail(item.id);
        const currentTags = detail.custom_tags || [];
        const nextTags = currentTags.filter(t => t !== tag.name);
        return api.people.updateStatus(item.id, { custom_tags: nextTags });
      } else {
        const detail = await api.library.getItemDetail(item.id, { mediaType: item.type });
        const currentTags = detail.custom_tags || [];
        const nextTags = currentTags.filter(t => t !== tag.name);
        return api.media.updateStatus(item.id, { custom_tags: nextTags, media_type: item.type });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryTags'] });
      queryClient.invalidateQueries({ queryKey: ['allTags'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
    }
  });

  const allItems = useMemo(() => {
    if (Array.isArray(tag.mode_items)) {
      return tag.mode_items;
    }
    return getLibraryTagBucketKeys(activeSessionMode).flatMap((key) => tag[key] || []);
  }, [tag, activeSessionMode]);

  const [visibleCount, setVisibleCount] = useState(20);
  const paginatedItems = allItems.slice(0, visibleCount);
  const hasMore = allItems.length > visibleCount;

  if (allItems.length === 0) {
    return (
      <div
        className={`library-tag-expanded-panel ${isFocusMode ? 'is-focus-mode' : ''}`.trim()}
        /* eslint-disable-next-line react/forbid-dom-props */
        style={{ '--tag-color': tag.color || 'var(--color-accent)' }}
      >
        {isFocusMode ? (
          <div className="library-tag-expanded-panel__header">
            <div className="library-tag-expanded-panel__title-row">
              <h2 className="library-tag-expanded-panel__title">
                {(t('library.tags.focusTitle') || 'Items tagged with "{name}"').replace('{name}', tag.name)}
              </h2>
            </div>
          </div>
        ) : null}
        <EmptyState
          variant="tag-focus"
          title={(t('library.tags.emptyFocusTitle') || 'This tag is ready to use.').replace('{name}', tag.name)}
          description={(t('library.tags.emptyFocusDescription') || 'Add this tag to movies, shows, or people and they will appear here.').replace('{name}', tag.name)}
        />
      </div>
    );
  }

  return (
    <div
      className={`library-tag-expanded-panel ${isFocusMode ? 'is-focus-mode' : ''}`.trim()}
      /* eslint-disable-next-line react/forbid-dom-props */
      style={{ '--tag-color': tag.color || 'var(--color-accent)' }}
    >
      {isFocusMode ? (
        <div className="library-tag-expanded-panel__header">
          <div className="library-tag-expanded-panel__title-row">
            <h2 className="library-tag-expanded-panel__title">
              {(t('library.tags.focusTitle') || 'Items tagged with "{name}"').replace('{name}', tag.name)}
            </h2>
          </div>
        </div>
      ) : null}
      <PosterGrid>
        {paginatedItems.map((item) => (
          <TagPosterCard
            key={item.id}
            item={item}
            t={t}
            resolvePosterUrl={resolvePosterUrl}
            emptyIcon={emptyIcon}
            isFocusMode={isFocusMode}
            onRemove={(targetItem) => removeTagMutation.mutate(targetItem)}
            onClick={() => {
              const isPerson = isPersonMediaType(item.type);
              if (isPerson) {
                navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
                return;
              }
              if (isMovieMediaType(item.type)) {
                navigate(`/library/movie/${item.id}`, { state: { allowAdult: true } });
              } else if (isTvLikeMediaType(item.type)) {
                navigate(`/library/tv/${item.id}`, { state: { allowAdult: true } });
              } else if (isSceneMediaType(item.type)) {
                navigate(`/library/scene/${item.id}`, { state: { allowAdult: true } });
              }
            }}
          />
        ))}
      </PosterGrid>

      {hasMore && (
        <div className="library-grid-load-more">
          <Button variant="secondary" onClick={() => setVisibleCount(prev => prev + 20)}>
            {t('common.showMore') || 'Show More'}
          </Button>
        </div>
      )}
    </div>
  );
}
