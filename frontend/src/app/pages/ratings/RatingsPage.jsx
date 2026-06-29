import { useState, useRef, useEffect } from 'react';
import { Star, Heart, Edit3, X, Clapperboard, Tv, Video, Users, CheckCircle, BarChart2 } from 'lucide-react';
import Page from '@/ui/Page';
import Table from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import { useTranslation } from '@/providers/LanguageContext';
import { useRatingsPageState } from './useRatingsPageState';
import LibraryHeader from '../library/components/LibraryHeader';
import LibraryPagination from '../library/components/LibraryPagination';
import './RatingsPage.css';

// Compact Star Rating component
function StarRating({ value, onChange }) {
  const [hoveredValue, setHoveredValue] = useState(null);
  const stars = Array.from({ length: 10 }, (_, i) => i + 1);

  const displayValue = hoveredValue !== null ? hoveredValue : (value || 0);

  return (
    <div className="inline-rating-stars" onMouseLeave={() => setHoveredValue(null)}>
      {stars.map((star) => {
        const isFilled = star <= displayValue;
        const isHovered = hoveredValue !== null && star <= hoveredValue;

        return (
          <Star
            key={star}
            size={14}
            className={`inline-rating-star ${isFilled ? 'is-filled' : ''} ${isHovered ? 'is-hovered' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const nextVal = value === star ? null : star;
              onChange(nextVal);
            }}
            onMouseEnter={() => setHoveredValue(star)}
          />
        );
      })}
      {displayValue > 0 && (
        <span className="inline-rating-value">
          {displayValue}
        </span>
      )}
    </div>
  );
}

export default function RatingsPage() {
  const { t } = useTranslation();
  const state = useRatingsPageState();
  const isAdultMode = state.activeSessionMode === 'nsfw';

  // Review Drawer state
  const [editingItem, setEditingItem] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const drawerRef = useRef(null);

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

  // Main Tabs configuration
  const mainTabs = [
    { value: 'unrated', label: t('ratings.tabs.unrated', { defaultValue: 'To Be Rated' }), icon: Star },
    { value: 'rated', label: t('ratings.tabs.rated', { defaultValue: 'Rated & Reviewed' }), icon: CheckCircle },
    { value: 'analytics', label: t('ratings.tabs.analytics', { defaultValue: 'Analytics' }), icon: BarChart2 },
  ];

  // Media Type Filter configuration
  const subTabs = [
    { value: 'movies', label: t('ratings.subtabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'series', label: t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(isAdultMode ? [{ value: 'scenes', label: t('ratings.subtabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ];

  // Define table columns dynamically based on state
  const columns = [
    {
      key: 'name',
      label: t('ratings.table.name', { defaultValue: 'Name' }),
      render: (val, row) => (
        <span className="ratings-row-name">
          {row.name || row.title || row.displayTitle}
        </span>
      ),
    },
    {
      key: 'rating',
      label: t('ratings.table.rating', { defaultValue: 'My Rating' }),
      width: '180px',
      render: (val, row) => (
        <StarRating
          value={row.user_rating}
          onChange={(newVal) => state.handleRateItem(row, newVal)}
        />
      ),
    },
    ...(state.mediaType === 'people'
      ? [
          {
            key: 'favorite',
            label: t('ratings.table.favorite', { defaultValue: 'Favorite' }),
            width: '80px',
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
    {
      key: 'comment',
      label: t('ratings.table.comment', { defaultValue: 'Comment / Review' }),
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
  ];

  const handleKeyDownBackdrop = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setEditingItem(null);
    }
  };

  return (
    <Page className="organizer-page">
      <div className={`organizer-main is-details-hidden ${isAdultMode ? 'organizer-main--nsfw' : ''}`}>
        <div className="organizer-main__content">
          <div className={`organizer-panel ${isAdultMode ? 'organizer-panel--nsfw' : ''}`}>
            <LibraryHeader
              t={t}
              pageTitle={isAdultMode ? (t('ratings.adultTitle') || 'Adult Ratings & Reviews') : (t('ratings.title') || 'Ratings & Reviews')}
              tabs={mainTabs}
              resolvedTab={state.activeTab}
              setActiveTab={state.setActiveTab}
              searchPlaceholder={t('common.search') || 'Search...'}
              setSearchQuery={state.setSearchQuery}
              showTabs={true}
              activeSessionMode={state.activeSessionMode}
              showSearch={state.activeTab !== 'analytics'}
            />

            {state.activeTab !== 'analytics' && (
              <div className="organizer-panel__row" style={{ marginTop: 'var(--space-md)' }}>
                <Tabs
                  tabs={subTabs}
                  value={state.mediaType}
                  onChange={state.setMediaType}
                  variant="sub"
                />
              </div>
            )}
          </div>

          <div className="organizer-results">
            {/* Upper Pagination Panel */}
            {state.activeTab !== 'analytics' && (
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
            {state.activeTab === 'analytics' ? (
              /* Analytics Dashboard tab */
              <div className="analytics-dashboard">
                <div className="analytics-card">
                  <span className="analytics-card__title">
                    {t('ratings.stats.average', { defaultValue: 'Average Rating' })}
                  </span>
                  <div className="analytics-card-row">
                    <span className="analytics-card__value">{state.analytics.average}</span>
                    <Star size={24} className="is-filled analytics-star-icon" fill="currentColor" />
                  </div>
                </div>

                <div className="analytics-card">
                  <span className="analytics-card__title">
                    {t('ratings.stats.totalRated', { defaultValue: 'Total Rated' })}
                  </span>
                  <span className="analytics-card__value">{state.analytics.totalRated}</span>
                </div>

                <div className="analytics-card">
                  <span className="analytics-card__title">
                    {t('ratings.stats.totalUnrated', { defaultValue: 'Total Unrated' })}
                  </span>
                  <span className="analytics-card__value analytics-card__value--muted">
                    {state.analytics.totalUnrated}
                  </span>
                </div>

                <div className="analytics-card">
                  <span className="analytics-card__title">
                    {t('ratings.stats.favoritesCount', { defaultValue: 'Favorites' })}
                  </span>
                  <div className="analytics-card-row">
                    <span className="analytics-card__value">{state.analytics.favoritesCount}</span>
                    <Heart size={24} className="analytics-heart-icon" fill="currentColor" />
                  </div>
                </div>

                <div className="analytics-card analytics-card--double">
                  <span className="analytics-card__title">
                    {t('ratings.stats.distribution', { defaultValue: 'Rating Distribution' })}
                  </span>
                  <div className="analytics-distribution">
                    {state.analytics.distribution.map((count, index) => {
                      const maxCount = Math.max(...state.analytics.distribution, 1);
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div key={index} className="analytics-distribution__row">
                          <span className="analytics-distribution__label">{index + 1}</span>
                          <div className="analytics-distribution__bar-container">
                            <div
                              className="analytics-distribution__bar"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="analytics-distribution__count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                {!state.isLoading && state.activeTab !== 'analytics' && (
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
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Drawer Panel */}
      {editingItem && (
        <>
          <div
            className="review-drawer-backdrop ui-drawer-backdrop"
            onClick={() => setEditingItem(null)}
            onKeyDown={handleKeyDownBackdrop}
            role="button"
            tabIndex={0}
          />
          <div ref={drawerRef} className={`review-drawer ui-drawer ui-drawer--md ${editingItem ? 'is-open' : ''}`}>
            <div className="review-drawer__header">
              <span className="review-drawer__title">
                {t('ratings.dialog.editReview', { defaultValue: 'Edit Review' })}
              </span>
              <Button
                variant="secondary-neutral"
                size="xs"
                onClick={() => setEditingItem(null)}
                className="review-drawer-close-btn"
              >
                <X size={16} />
              </Button>
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
              <Button variant="secondary" onClick={() => setEditingItem(null)}>
                {t('ratings.dialog.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="primary" onClick={handleSaveReview}>
                {t('ratings.dialog.save', { defaultValue: 'Save Review' })}
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
