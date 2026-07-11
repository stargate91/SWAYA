
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Star, Heart, Edit3, Clapperboard, Tv, Video, Users, CheckCircle } from '@/ui/icons';
import Page from '@/ui/Page';
import Badge from '@/ui/Badge';
import Table from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import Button from '@/ui/Button';
import SearchInputCombo from '@/ui/SearchInputCombo';
import Spinner from '@/ui/Spinner';
import SegmentedControl from '@/ui/SegmentedControl';
import SegmentedRating from '@/ui/SegmentedRating';
import { useTranslation } from '@/providers/LanguageContext';
import { useRatingsPageState } from './useRatingsPageState';
import LibraryPagination from '../library/components/LibraryPagination';
import RatingsReviewDrawer from './components/RatingsReviewDrawer';
import AnalyticsTabContent from './components/AnalyticsTabContent';
import { useDebounce } from '@/hooks/useDebounce';
import './RatingsPage.css';

export default function RatingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = useRatingsPageState();
  const isAdultMode = state.activeSessionMode === 'nsfw';

  // Review Drawer state
  const [editingItem, setEditingItem] = useState(null);
  const [reviewText, setReviewText] = useState('');

  // Distribution chart tab state
  const [distTab, setDistTab] = useState('movies');
  const effectiveDistTab = !isAdultMode && distTab === 'scenes' ? 'movies' : distTab;

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
  const debouncedSearch = useDebounce(localSearch, 150);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (debouncedSearch !== stateRef.current.searchQuery) {
      stateRef.current.setSearchQuery(debouncedSearch);
    }
  }, [debouncedSearch]);

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
    { value: 'videos', label: t('library.tabs.videos') || 'Videos', icon: Video },
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ];

  const distTabs = [
    { value: 'movies', label: t('ratings.subtabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'tv', label: t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(state.hasAdultSupport ? [{ value: 'scenes', label: t('ratings.subtabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'videos', label: t('library.tabs.videos') || 'Videos', icon: Video },
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ];

  // Define table columns dynamically based on state
  const columns = [
    {
      key: 'name',
      label: state.mediaType === 'people'
        ? t('ratings.table.name', { defaultValue: 'Name' })
        : t('ratings.table.title', { defaultValue: 'Title' }),
      render: (val, row) => {
        const handleClick = () => {
          if (state.mediaType === 'people') {
            navigate(`/library/people/${row.id}`, { state: { allowAdult: true } });
          } else if (state.mediaType === 'movies') {
            navigate(`/library/movie/${row.id}`, { state: { allowAdult: true } });
          } else if (state.mediaType === 'series') {
            navigate(`/library/tv/${row.id}`, { state: { allowAdult: true } });
          } else if (state.mediaType === 'scenes' || state.mediaType === 'videos') {
            navigate(`/library/scene/${row.id}`, { state: { allowAdult: true } });
          }
        };

        return (
          <span 
            className="ratings-row-name ratings-row-name-link"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
              }
            }}
          >
            {row.name || row.title || row.displayTitle}
          </span>
        );
      },
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
                <span className="organizer-panel__title ratings-title-inline">
                  {t('ratings.title') || 'Ratings & Reviews'}
                  {isAdultMode && (
                    <sup className="ratings-title-sup">
                      <Badge family="adult" tone="danger" className="ratings-title-adult-badge">
                        {t('common.adult_badge', { defaultValue: '18+' })}
                      </Badge>
                    </sup>
                  )}
                </span>
              </div>

              <div className="organizer-panel__row">
                <Tabs
                  tabs={ratingTabs}
                  value={state.activeTab}
                  onChange={state.setActiveTab}
                />

                <SearchInputCombo
                  placeholder={t('common.search') || 'Search...'}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="organizer-search"
                  size="sm"
                />
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
              <AnalyticsTabContent
                state={state}
                t={t}
                distTabs={distTabs}
                effectiveDistTab={effectiveDistTab}
                setDistTab={setDistTab}
              />
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

      <RatingsReviewDrawer
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        reviewText={reviewText}
        setReviewText={setReviewText}
        handleSaveReview={handleSaveReview}
        t={t}
      />
    </Page>
  );
}
