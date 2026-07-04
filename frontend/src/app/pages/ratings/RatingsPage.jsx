import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, Heart, Edit3, Clapperboard, Tv, Video, Users, CheckCircle, BarChart2, Search } from 'lucide-react';
import Page from '@/ui/Page';
import Table from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import Input from '@/ui/Input';
import SegmentedControl from '@/ui/SegmentedControl';
import { useTranslation } from '@/providers/LanguageContext';
import { useRatingsPageState } from './useRatingsPageState';
import LibraryPagination from '../library/components/LibraryPagination';
import './RatingsPage.css';

// Segmented Rating component for table
function SegmentedRating({ value, onChange, t }) {
  const [hoveredRating, setHoveredRating] = useState(null);

  const displayRating = hoveredRating !== null ? hoveredRating : value;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    let val = Math.ceil(percent * 20) / 2;
    val = Math.max(0.5, Math.min(10.0, val));
    setHoveredRating(val);
  };

  const handleMouseLeave = () => {
    setHoveredRating(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (hoveredRating !== null) {
      const isSame = value !== null && value !== undefined && Number(value) === Number(hoveredRating);
      const targetRating = isSame ? null : hoveredRating;
      onChange(targetRating);
    }
  };

  return (
    <div className="table-segmented-rating-container">
      <div
        className="rating-segmented-bar"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleClick}
        role="slider"
        tabIndex={0}
        aria-label={t('library.details.yourRating') || 'Your Rating'}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={displayRating ?? 0}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
          let fill = 0;
          if (displayRating >= val) {
            fill = 100;
          } else if (displayRating > val - 1) {
            fill = (displayRating - (val - 1)) * 100;
          }
          return (
            <div key={val} className="rating-segment">
              <div
                className="rating-segment-fill"
                // eslint-disable-next-line react/forbid-dom-props
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>
      <span className={`user-rating-label ${displayRating !== undefined && displayRating !== null ? 'has-value' : ''}`}>
        {displayRating !== undefined && displayRating !== null
          ? displayRating.toFixed(1)
          : '-.-'}
      </span>
    </div>
  );
}

export default function RatingsPage() {
  const { t } = useTranslation();
  const state = useRatingsPageState();
  const isAdultMode = state.activeSessionMode === 'nsfw';

  const bulletSep = '\u2022';
  const timesChar = '\u00D7';

  const getPercentageText = (rated, unrated) => {
    const total = rated + unrated;
    if (total === 0) return ' (0%)';
    return ' (' + Math.round((rated / total) * 100) + '%)';
  };

  // Review Drawer state
  const [editingItem, setEditingItem] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const drawerRef = useRef(null);

  // Distribution chart tab state
  const [distTab, setDistTab] = useState('movies');

  if (!isAdultMode && distTab === 'scenes') {
    setDistTab('movies');
  }

  const handleOpenReviewDrawer = (e, item) => {
    e.stopPropagation();
    setEditingItem(item);
    setReviewText(item.user_comment || '');
  };

  const handleSaveReview = async () => {
    if (!editingItem) return;
    await state.handleSaveComment(editingItem, reviewText);
    setEditingItem(null);
  };

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setEditingItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const utilityBarTarget = typeof document !== 'undefined' ? document.getElementById('shell-utility-bar-center') : null;

  // View Mode derived from activeTab
  const viewMode = state.activeTab === 'analytics' ? 'stats' : 'ratings';

  const handleSetViewMode = (mode) => {
    if (mode === 'stats') {
      state.setActiveTab('analytics');
    } else {
      state.setActiveTab('unrated');
    }
  };

  // Local Search Input with Debounce Sync
  const [localSearch, setLocalSearch] = useState(state.searchQuery);

  const [prevSearchQuery, setPrevSearchQuery] = useState(state.searchQuery);
  if (state.searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(state.searchQuery);
    setLocalSearch(state.searchQuery);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      state.setSearchQuery(localSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [localSearch, state]);

  // Tabs configurations
  const ratingTabs = [
    { value: 'unrated', label: t('ratings.tabs.unrated', { defaultValue: 'To Be Rated' }), icon: Star },
    { value: 'rated', label: t('ratings.tabs.rated', { defaultValue: 'Rated & Reviewed' }), icon: CheckCircle },
  ];

  // Media Type Filter configuration
  const subTabs = [
    { value: 'movies', label: t('ratings.subtabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'series', label: t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(isAdultMode ? [{ value: 'scenes', label: t('ratings.subtabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ];

  const distTabs = [
    { value: 'movies', label: t('ratings.subtabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'tv', label: t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(state.hasAdultSupport ? [{ value: 'scenes', label: t('ratings.subtabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ];

  // Define table columns dynamically based on state
  const columns = [
    {
      key: 'name',
      label: state.mediaType === 'people'
        ? t('ratings.table.name', { defaultValue: 'Name' })
        : t('ratings.table.title', { defaultValue: 'Title' }),
      render: (val, row) => (
        <span className="ratings-row-name">
          {row.name || row.title || row.displayTitle}
        </span>
      ),
    },
    {
      key: 'comment',
      label: t('ratings.table.comment', { defaultValue: 'Review' }),
      render: (val, row) => {
        const hasComment = row.user_comment && String(row.user_comment).trim();
        return (
          <div className="review-preview-cell">
            {hasComment ? (
              <span className="review-preview-text">{row.user_comment}</span>
            ) : (
              <span className="review-preview-empty">
                {t('ratings.dialog.placeholder', { defaultValue: 'Write a review...' })}
              </span>
            )}
            <Button
              variant="secondary-neutral"
              size="xs"
              className="review-edit-btn"
              onClick={(e) => handleOpenReviewDrawer(e, row)}
            >
              <Edit3 size={12} />
              {hasComment ? t('common.edit') || 'Edit' : t('common.add') || 'Add'}
            </Button>
          </div>
        );
      },
    },
    {
      key: 'rating',
      label: t('ratings.table.rating', { defaultValue: 'My Rating' }),
      width: '200px',
      render: (val, row) => (
        <SegmentedRating
          value={row.user_rating}
          onChange={(newVal) => state.handleRateItem(row, newVal)}
          t={t}
        />
      ),
    },
    ...(state.mediaType === 'people'
      ? [
        {
          key: 'favorite',
          label: t('ratings.table.favorite', { defaultValue: 'Favorite' }),
          width: '110px',
          align: 'center',
          render: (val, row) => (
            <button
              type="button"
              className={`fav-heart-btn ${row.is_favorite ? 'is-favorite' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                state.handleToggleFavorite(row);
              }}
            >
              <Heart size={16} fill={row.is_favorite ? 'currentColor' : 'none'} />
            </button>
          ),
        },
      ]
      : []),
  ];

  const handleKeyDownBackdrop = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setEditingItem(null);
    }
  };

  return (
    <Page className="organizer-page">
      {utilityBarTarget && createPortal(
        <SegmentedControl
          value={viewMode}
          onChange={handleSetViewMode}
          options={[
            { value: 'ratings', label: t('ratings.viewMode.ratings') || 'Ratings' },
            { value: 'stats', label: t('ratings.viewMode.stats') || 'Stats' }
          ]}
        />,
        utilityBarTarget
      )}
      <div className={`organizer-main is-details-hidden ${isAdultMode ? 'organizer-main--nsfw' : ''}`}>
        <div className="organizer-main__content">
          {viewMode === 'ratings' && (
            <div className={`organizer-panel ${isAdultMode ? 'organizer-panel--nsfw' : ''}`}>
              <div className="organizer-panel__row">
                <span className="organizer-panel__title">
                  {isAdultMode ? (t('ratings.adultTitle') || 'Adult Ratings & Reviews') : (t('ratings.title') || 'Ratings & Reviews')}
                </span>
              </div>

              <div className="organizer-panel__row">
                <Tabs
                  tabs={ratingTabs}
                  value={state.activeTab}
                  onChange={state.setActiveTab}
                />
                
                <div className="organizer-search">
                  <Search size={14} className="organizer-search__icon" />
                  <Input
                    type="text"
                    placeholder={t('common.search') || 'Search...'}
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="organizer-panel__row">
                <Tabs
                  tabs={subTabs}
                  value={state.mediaType}
                  onChange={state.setMediaType}
                  variant="sub"
                />
              </div>
            </div>
          )}

          <div className="organizer-results">
            {/* Upper Pagination Panel */}
            {viewMode === 'ratings' && (
              <LibraryPagination
                state={{
                  paginatedItems: state.paginatedItems,
                  shouldShowPagination: state.totalPages > 1,
                  summaryText: state.totalItems > 0
                    ? `${(state.currentPage - 1) * state.pageSize + 1}-${Math.min(state.currentPage * state.pageSize, state.totalItems)} / ${state.totalItems}`
                    : '0-0 / 0',
                  currentPage: state.currentPage,
                  totalPages: state.totalPages,
                  pageSize: state.pageSize,
                  setCurrentPage: state.setCurrentPage,
                  setPageSize: state.setPageSize,
                  t: t
                }}
                showPageSizes
              />
            )}

            {/* Content Tabs */}
            {viewMode === 'stats' ? (
              state.isStatsLoading ? (
                <div className="ratings-loading-container">
                  <Spinner size="md" />
                </div>
              ) : (
                <div className="analytics-dashboard-compact">
                  <div className="analytics-dashboard-left">
                    {/* CARD 1: Media Average Ratings */}
                    <div className="analytics-card compact-stats-card">
                      <div className="compact-stats-card__header">
                        <span className="analytics-card__title">
                          {t('ratings.stats.mediaAverages', { defaultValue: 'Average Ratings' })}
                        </span>
                        <BarChart2 size={16} className="analytics-card__icon text-accent-blue" />
                      </div>
                      <div className="compact-stats-card__content">
                        {/* Movies Row */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
                          </div>
                          <div className="compact-stats-row__value-wrapper">
                            <span className="compact-stats-row__value">{state.moviesStats.average}</span>
                            <div className="analytics-mini-segmented-bar">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const avg = parseFloat(state.moviesStats.average) || 0;
                                let fill = 0;
                                if (avg >= val) fill = 100;
                                else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                                return (
                                  <div key={val} className="analytics-segment">
                                    {/* eslint-disable-next-line react/forbid-dom-props */}
                                    <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* TV Shows Row */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
                          </div>
                          <div className="compact-stats-row__value-wrapper">
                            <span className="compact-stats-row__value">{state.tvStats.average}</span>
                            <div className="analytics-mini-segmented-bar">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const avg = parseFloat(state.tvStats.average) || 0;
                                let fill = 0;
                                if (avg >= val) fill = 100;
                                else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                                return (
                                  <div key={val} className="analytics-segment">
                                    {/* eslint-disable-next-line react/forbid-dom-props */}
                                    <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Scenes Row */}
                        {state.hasAdultSupport && (
                          <div className="compact-stats-row">
                            <div className="compact-stats-row__label">
                              {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
                            </div>
                            <div className="compact-stats-row__value-wrapper">
                              <span className="compact-stats-row__value">{state.scenesStats.average}</span>
                              <div className="analytics-mini-segmented-bar">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                  const avg = parseFloat(state.scenesStats.average) || 0;
                                  let fill = 0;
                                  if (avg >= val) fill = 100;
                                  else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                                  return (
                                    <div key={val} className="analytics-segment">
                                      {/* eslint-disable-next-line react/forbid-dom-props */}
                                      <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CARD 2: Media Counts */}
                    <div className="analytics-card compact-stats-card">
                      <div className="compact-stats-card__header">
                        <span className="analytics-card__title">
                          {t('ratings.stats.mediaItems', { defaultValue: 'Library Items' })}
                        </span>
                        <CheckCircle size={16} className="analytics-card__icon text-success" />
                      </div>
                      <div className="compact-stats-card__content">
                        {/* Movies counts */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
                          </div>
                          <div className="compact-stats-counts">
                            <span className="compact-count-rated">{state.moviesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                            <span className="compact-count-sep">{bulletSep}</span>
                            <span className="compact-count-unrated">
                              {state.moviesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                              {getPercentageText(state.moviesStats.totalRated, state.moviesStats.totalUnrated)}
                            </span>
                          </div>
                        </div>

                        {/* TV Shows counts */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
                          </div>
                          <div className="compact-stats-counts">
                            <span className="compact-count-rated">{state.tvStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                            <span className="compact-count-sep">{bulletSep}</span>
                            <span className="compact-count-unrated">
                              {state.tvStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                              {getPercentageText(state.tvStats.totalRated, state.tvStats.totalUnrated)}
                            </span>
                          </div>
                        </div>

                        {/* Scenes counts */}
                        {state.hasAdultSupport && (
                          <div className="compact-stats-row">
                            <div className="compact-stats-row__label">
                              {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
                            </div>
                            <div className="compact-stats-counts">
                              <span className="compact-count-rated">{state.scenesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                              <span className="compact-count-sep">{bulletSep}</span>
                              <span className="compact-count-unrated">
                                {state.scenesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                                {getPercentageText(state.scenesStats.totalRated, state.scenesStats.totalUnrated)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CARD 3: People Stats */}
                    <div className="analytics-card compact-stats-card">
                      <div className="compact-stats-card__header">
                        <span className="analytics-card__title">
                          {t('ratings.subtabs.people', { defaultValue: 'People' })}
                        </span>
                        <Users size={16} className="analytics-card__icon text-muted" />
                      </div>
                      <div className="compact-stats-card__content">
                        {/* People Avg Rating */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {t('ratings.stats.average', { defaultValue: 'Average Rating' })}
                          </div>
                          <div className="compact-stats-row__value-wrapper">
                            <span className="compact-stats-row__value">{state.peopleStats.average}</span>
                            <div className="analytics-mini-segmented-bar">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const avg = parseFloat(state.peopleStats.average) || 0;
                                let fill = 0;
                                if (avg >= val) fill = 100;
                                else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                                return (
                                  <div key={val} className="analytics-segment">
                                    {/* eslint-disable-next-line react/forbid-dom-props */}
                                    <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* People counts */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {t('ratings.stats.totalRated', { defaultValue: 'Items' })}
                          </div>
                          <div className="compact-stats-counts">
                            <span className="compact-count-rated">{state.peopleStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                            <span className="compact-count-sep">{bulletSep}</span>
                            <span className="compact-count-unrated">
                              {state.peopleStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                              {getPercentageText(state.peopleStats.totalRated, state.peopleStats.totalUnrated)}
                            </span>
                          </div>
                        </div>

                        {/* People Favorites */}
                        <div className="compact-stats-row">
                          <div className="compact-stats-row__label">
                            {isAdultMode
                              ? (t('ratings.stats.favoritePerformers') || 'Favorite Performers')
                              : (t('ratings.stats.favoriteArtists') || 'Favorite Artists')}
                          </div>
                          <div className="compact-stats-favorites">
                            <span className="compact-stats-row__value">{state.peopleStats.favoritesCount}</span>
                            <Heart size={14} className="analytics-card__icon text-danger" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-dashboard-right">
                    {/* CARD 4: Rating Distribution with Tabs */}
                    <div className="analytics-card analytics-card--distribution compact-distribution-card">
                      <div className="compact-distribution-header">
                        <span className="analytics-card__title">
                          {t('ratings.stats.distribution', { defaultValue: 'Rating Distribution' })}
                        </span>
                        <SegmentedControl
                          options={distTabs}
                          value={distTab}
                          onChange={setDistTab}
                          variant="filter"
                        />
                      </div>
                      <div className="analytics-distribution">
                        {(() => {
                          const activeDistStats = 
                            distTab === 'people' ? state.peopleStats :
                            distTab === 'tv' ? state.tvStats :
                            distTab === 'scenes' ? state.scenesStats :
                            state.moviesStats;
                          return activeDistStats.distribution.map((count, index) => {
                            const maxCount = Math.max(...activeDistStats.distribution, 1);
                            const percentage = (count / maxCount) * 100;
                            const ratingLabel = ((index + 1) / 2).toString();
                            return (
                              <div key={index} className="analytics-distribution__row">
                                <span className="analytics-distribution__label">{ratingLabel}</span>
                                <div className="analytics-distribution__bar-container">
                                  <div
                                    className="analytics-distribution__bar"
                                    // eslint-disable-next-line react/forbid-dom-props
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="analytics-distribution__count">{count}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Table of Rated / Unrated items */
              <div className="organizer-table-block">
                <div className="organizer-content">
                  {state.isLoading ? (
                    <div className="ratings-loading-container">
                      <Spinner size="md" />
                    </div>
                  ) : (
                    <Table
                      columns={columns}
                      rows={state.paginatedItems}
                      emptyText={t('ratings.table.empty', { defaultValue: 'No items match selected criteria.' })}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Drawer Panel */}
      {editingItem && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="review-drawer-backdrop ui-drawer-backdrop"
            onClick={() => setEditingItem(null)}
            onKeyDown={handleKeyDownBackdrop}
            role="button"
            tabIndex={0}
          />
          <div ref={drawerRef} className={`review-drawer ui-drawer ui-drawer--sm ${editingItem ? 'is-open' : ''}`}>
            <div className="review-drawer__header">
              <span className="review-drawer__title">
                {t('ratings.dialog.editReview', { defaultValue: 'Edit Review' })}
              </span>
              <button
                type="button"
                className="review-drawer-close-btn"
                onClick={() => setEditingItem(null)}
              >
                {timesChar}
              </button>
            </div>
            <div className="review-drawer__content">
              <span className="review-drawer-media-title">
                {editingItem.name || editingItem.title || editingItem.displayTitle}
              </span>
              <textarea
                className="review-drawer__textarea"
                placeholder={t('ratings.dialog.placeholder', { defaultValue: 'Write review...' })}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="review-drawer__footer">
              <Button variant="secondary-neutral" onClick={() => setEditingItem(null)}>
                {t('ratings.dialog.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="primary" onClick={handleSaveReview}>
                {t('ratings.dialog.save', { defaultValue: 'Save Review' })}
              </Button>
            </div>
          </div>
        </>,
        document.body
      )}
    </Page>
  );
}
