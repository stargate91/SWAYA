import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/ui/Button';
import Input from '@/ui/Input';
import Dropdown from '@/ui/Dropdown';
import Tooltip from '@/ui/Tooltip';
import { Plus, Download, Search, PenLine } from '@/ui/icons';
import ListCollageIcon from './ListCollageIcon';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import styles from './ListsHeader.module.css';

export default function ListsHeader({
  activeList,
  createdLabel,
  t,
  handleExportList,
  handleStartAddItems,
  listSearchQuery,
  setListSearchQuery,
  watchedFilter,
  setWatchedFilter,
  mediaTypeFilter,
  setMediaTypeFilter,
  genreFilter,
  setGenreFilter,
  genderFilter,
  setGenderFilter,
  jobFilter,
  setJobFilter,
  sortKey,
  setSortKey,
  sortOptions,
  sortDirection,
  setSortDirection,
  availableGenres,
  onImageClick,
}) {
  const [isStuck, setIsStuck] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      {
        threshold: [0],
        root: heroRef.current?.closest('.lists-main') || null,
      }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [activeList.id]);

  const themeRef = useCallback((node) => {
    if (node) {
      node.style.setProperty('--list-theme-color', activeList.color || 'var(--color-accent-blue)');
    }
  }, [activeList.color]);

  return (
    <div ref={themeRef} className={styles.contents}>
      <div ref={heroRef} className={styles['lists-header-hero']}>
        <Inline justify="between" align="start" fullWidth>
          <Inline align="end" flex={1} style={{ minWidth: 0 }}>
            <div className={styles['lists-header__cover-container']}>
              <div
                className={styles['lists-header__cover-wrapper']}
                onClick={onImageClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onImageClick(e);
                  }
                }}
              >
                <ListCollageIcon
                  samplePosters={activeList.sample_posters}
                  listType={activeList.list_type}
                  color={activeList.color}
                  customImagePath={activeList.custom_image_path}
                  iconSize={48}
                />
                <div className={styles['lists-header__cover-overlay']}>
                  <PenLine size={20} />
                </div>
              </div>
            </div>
            <Stack gap="sm">
              <Inline gap="md" align="center">
                <Text as="h1" variant="hero" weight="extrabold" truncate style={{ fontSize: '3.5rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {activeList.name}
                </Text>
              </Inline>
              {activeList.description && (
                <Text as="p" variant="small" color="secondary" style={{ opacity: 0.8, maxWidth: '37.5rem', lineHeight: 1.5 }}>
                  {activeList.description}
                </Text>
              )}
              {activeList.created_at && (
                <Inline align="center" style={{ marginTop: 'var(--space-xs)' }}>
                  <Text variant="small" weight="semibold" style={{ opacity: 0.85 }}>
                    {createdLabel}
                  </Text>
                </Inline>
              )}
            </Stack>
          </Inline>
          <Inline gap="md" align="center">
            <Tooltip content={t('lists.export') || 'Export JSON'} side="top">
              <Button
                variant="secondary-neutral"
                size="sm"
                onClick={() => handleExportList(activeList.id)}
              >
                <Download size={14} />
                <span>{t('lists.export') || 'Export JSON'}</span>
              </Button>
            </Tooltip>
            <span
              ref={(node) => {
                if (node) {
                  if (activeList?.color) {
                    const bg = (activeList.color.includes('success') || activeList.color.includes('warning'))
                      ? `color-mix(in srgb, ${activeList.color} 80%, black)`
                      : activeList.color;
                    node.style.setProperty('--button-primary-bg', bg);
                    node.style.setProperty('--button-primary-color', '#ffffff');
                  } else {
                    node.style.removeProperty('--button-primary-bg');
                    node.style.removeProperty('--button-primary-color');
                  }
                }
              }}
              className={styles.contents}
            >
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartAddItems}
              >
                <Plus size={14} />
                <span>{activeList.list_type === 'person' ? (t('lists.add_people') || 'Add People') : (t('lists.add_titles') || 'Add Titles')}</span>
              </Button>
            </span>
          </Inline>
        </Inline>
      </div>

      <div className={`${styles['lists-header-filters']} ${isStuck ? styles['is-stuck'] : ''}`}>
        <Inline gap="lg" align="center" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
          <div className={styles['lists-header__search-wrapper']}>
            <Input
              type="text"
              size="xs"
              className={styles['lists-header__search-input']}
              placeholder={t('common.searchPlaceholder') || 'Search in this list...'}
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              leftElement={<Search size={16} />}
            />
          </div>
          {activeList.list_type !== 'person' && (
            <Inline gap="sm" align="center">
              <Text variant="small" weight="bold" color="muted" uppercase style={{ userSelect: 'none' }}>{t('library.filter.statusLabel') || 'Status:'}</Text>
              <Dropdown
                value={watchedFilter}
                onChange={(e) => setWatchedFilter(e.target.value)}
                variant="sorter"
                options={[
                  { value: 'all', label: t('library.filter.all') || 'All' },
                  { value: 'watched', label: t('library.filter.watched') || 'Watched' },
                  { value: 'unwatched', label: t('library.filter.unwatched') || 'Unwatched' },
                ]}
                themeColor={activeList.color || 'var(--color-accent-blue)'}
              />
            </Inline>
          )}
          {activeList.list_type !== 'person' && (
            <Inline gap="sm" align="center">
              <Text variant="small" weight="bold" color="muted" uppercase style={{ userSelect: 'none' }}>{t('lists.filter_media_type_label') || 'Type:'}</Text>
              <Dropdown
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value)}
                variant="sorter"
                options={[
                  { value: 'all', label: t('lists.filter_media_type_all') || 'All' },
                  { value: 'movie', label: t('lists.filter_media_type_movies') || 'Movies' },
                  { value: 'show', label: t('lists.filter_media_type_shows') || 'TV Shows' },
                  { value: 'scene', label: t('lists.filter_media_type_scenes') || 'Scenes' },
                  { value: 'videos', label: t('library.tabs.videos') || 'Videos' },
                ]}
                themeColor={activeList.color || 'var(--color-accent-blue)'}
              />
            </Inline>
          )}
          {activeList.list_type !== 'person' && (
            <Inline gap="sm" align="center">
              <Text variant="small" weight="bold" color="muted" uppercase style={{ userSelect: 'none' }}>{t('library.filter.genreLabel') || 'Genre:'}</Text>
              <Dropdown
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                variant="sorter"
                options={availableGenres.map((genre) => ({
                  value: genre,
                  label: genre === 'all' ? (t('library.filter.all') || 'All') : genre,
                }))}
                themeColor={activeList.color || 'var(--color-accent-blue)'}
              />
            </Inline>
          )}
          {activeList.list_type === 'person' && (
            <Inline gap="sm" align="center">
              <Text variant="small" weight="bold" color="muted" uppercase style={{ userSelect: 'none' }}>{t('library.filter.genderLabel') || 'Gender:'}</Text>
              <Dropdown
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                variant="sorter"
                options={[
                  { value: 'all', label: t('library.filter.all') || 'All' },
                  { value: 'female', label: t('library.filter.female') || 'Female' },
                  { value: 'male', label: t('library.filter.male') || 'Male' },
                ]}
                themeColor={activeList.color || 'var(--color-accent-blue)'}
              />
            </Inline>
          )}
          {activeList.list_type === 'person' && (
            <Inline gap="sm" align="center">
              <Text variant="small" weight="bold" color="muted" uppercase style={{ userSelect: 'none' }}>{t('lists.filter_role_label') || 'Role:'}</Text>
              <Dropdown
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                variant="sorter"
                options={[
                  { value: 'all', label: t('lists.filter_job_all') || 'All' },
                  { value: 'actor', label: t('lists.filter_job_actor') || 'Actor' },
                  { value: 'director', label: t('lists.filter_job_director') || 'Director' },
                  { value: 'writer', label: t('lists.filter_job_writer') || 'Writer' },
                  { value: 'sound', label: t('library.people.roles.sound') || 'Composer' },
                ]}
                themeColor={activeList.color || 'var(--color-accent-blue)'}
              />
            </Inline>
          )}
        </Inline>
        <Inline gap="md" align="center">
          <Text variant="small" weight="bold" color="muted" uppercase style={{ userSelect: 'none' }}>{t('lists.sort_label') || 'Sort:'}</Text>
          <Dropdown
            value={sortKey}
            options={sortOptions}
            onChange={(e) => setSortKey(e.target.value)}
            variant="sorter"
            sortDirection={sortDirection}
            onSortDirectionToggle={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            themeColor={activeList.color || 'var(--color-accent-blue)'}
          />
        </Inline>
      </div>
    </div>
  );
}
