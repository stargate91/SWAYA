import { useState, useEffect, useRef } from 'react';
import Button from '@/ui/Button';
import Input from '@/ui/Input';
import Dropdown from '@/ui/Dropdown';
import Tooltip from '@/ui/Tooltip';
import { Plus, Download, Search, PenLine } from '@/ui/icons';
import ListCollageIcon from './ListCollageIcon';

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

  return (
    // eslint-disable-next-line react/forbid-dom-props
    <div style={{ '--list-theme-color': activeList.color || 'var(--color-accent-blue)', display: 'contents' }}>
      <div ref={heroRef} className="lists-header-hero">
        <div className="lists-header__top-row">
          <div className="lists-header__left-group">
            <div className="lists-header__cover-container">
              <div
                className="lists-header__cover-wrapper"
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
                <div className="lists-header__cover-overlay">
                  <PenLine size={20} />
                </div>
              </div>
            </div>
            <div className="lists-header__meta-stack">
              <div className="lists-header__title-row">
                <h1 className="lists-header__title">{activeList.name}</h1>
              </div>
              {activeList.description && (
                <p className="lists-header__description">{activeList.description}</p>
              )}
              {activeList.created_at && (
                <div className="lists-header__meta-row">
                  <span className="lists-header__date">{createdLabel}</span>
                </div>
              )}
            </div>
          </div>
          <div className="lists-header__right">
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
              // eslint-disable-next-line react/forbid-dom-props
              style={activeList?.color ? {
                '--button-primary-bg': (activeList.color.includes('success') || activeList.color.includes('warning'))
                  ? `color-mix(in srgb, ${activeList.color} 80%, black)`
                  : activeList.color,
                '--button-primary-color': '#ffffff',
                display: 'contents',
              } : { display: 'contents' }}
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
          </div>
        </div>
      </div>

      <div className={`lists-header-filters ${isStuck ? 'is-stuck' : ''}`}>
        <div className="lists-header__bottom-left">
          <div className="lists-header__search-wrapper">
            <Input
              type="text"
              className="lists-header__search-input"
              placeholder={t('common.searchPlaceholder') || 'Search in this list...'}
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              leftElement={<Search size={16} />}
            />
          </div>
          {activeList.list_type !== 'person' && (
            <div className="lists-header__filter-wrapper">
              <span className="library-sorter-label">{t('library.filter.statusLabel') || 'Status:'}</span>
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
            </div>
          )}
          {activeList.list_type !== 'person' && (
            <div className="lists-header__filter-wrapper">
              <span className="library-sorter-label">{t('lists.filter_media_type_label') || 'Type:'}</span>
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
            </div>
          )}
          {activeList.list_type !== 'person' && (
            <div className="lists-header__filter-wrapper">
              <span className="library-sorter-label">{t('library.filter.genreLabel') || 'Genre:'}</span>
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
            </div>
          )}
          {activeList.list_type === 'person' && (
            <div className="lists-header__filter-wrapper">
              <span className="library-sorter-label">{t('library.filter.genderLabel') || 'Gender:'}</span>
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
            </div>
          )}
          {activeList.list_type === 'person' && (
            <div className="lists-header__filter-wrapper">
              <span className="library-sorter-label">{t('lists.filter_role_label') || 'Role:'}</span>
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
            </div>
          )}
        </div>
        <div className="lists-header__sorting-wrapper">
          <span className="library-sorter-label">{t('lists.sort_label') || 'Sort:'}</span>
          <Dropdown
            value={sortKey}
            options={sortOptions}
            onChange={(e) => setSortKey(e.target.value)}
            variant="sorter"
            sortDirection={sortDirection}
            onSortDirectionToggle={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            themeColor={activeList.color || 'var(--color-accent-blue)'}
          />
        </div>
      </div>
    </div>
  );
}
