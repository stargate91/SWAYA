import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Edit3, Clapperboard, Tv, Video, Users, CheckCircle } from '@/ui/icons';
import Page from '@/ui/Page';
import Table from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import Button from '@/ui/Button';
import PanelHeader from '@/ui/PanelHeader';
import Skeleton from '@/ui/Skeleton';
import SegmentedRating from '@/ui/SegmentedRating';
import { useTranslation } from '@/providers/LanguageContext';
import { useRatingsPageState } from './useRatingsPageState';
import LibraryPagination from '../library/components/LibraryPagination';
import RatingsReviewDrawer from './components/RatingsReviewDrawer';
import { useDebounce } from '@/hooks/useDebounce';
import styles from './RatingsPage.module.css';

export default function RatingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = useRatingsPageState();
  const isAdultMode = state.activeSessionMode === 'nsfw';

  // Review Drawer state
  const [editingItem, setEditingItem] = useState(null);
  const [reviewText, setReviewText] = useState('');

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

  // Define table columns dynamically based on state
  const columns = [
    {
      key: 'name',
      sortable: true,
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
            className={`ratings-row-name ${styles['ratings-row-name-link']}`}
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
      sortable: true,
      label: t('ratings.table.comment', { defaultValue: 'Review' }),
      render: (val, row) => {
        const hasComment = row.user_comment && String(row.user_comment).trim();
        return (
          <div className={styles['review-preview-cell']}>
            {hasComment ? (
              <span className={styles['review-preview-text']}>{row.user_comment}</span>
            ) : (
              <span className={styles['review-preview-empty']}>
                {t('ratings.dialog.placeholder', { defaultValue: 'Write a review...' })}
              </span>
            )}
            <Button
              variant="secondary-neutral"
              size="xs"
              className={styles['review-edit-btn']}
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
      sortable: true,
      label: t('ratings.table.rating', { defaultValue: 'My Rating' }),
      width: '240px',
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
              className={`${styles['fav-heart-btn']} ${row.is_favorite ? styles['is-favorite'] : ''}`}
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
    <Page viewport={true} className={styles['ratings-page']}>
      <div className={styles['ratings-main']}>
        <div className={styles['ratings-main__content']}>
          <PanelHeader
            title={t('ratings.title') || 'Ratings & Reviews'}
            sessionMode={state.activeSessionMode}
            tabs={ratingTabs}
            activeTab={state.ratingMode}
            onTabChange={(val) => {
              state.setRatingMode(val);
              state.setCurrentPage(1);
            }}
            showSearch={true}
            searchPlaceholder={t('common.search') || 'Search...'}
            searchQuery={localSearch}
            onSearchQueryChange={(e) => setLocalSearch(e.target.value)}
          >
            <PanelHeader.Row>
              <Tabs
                tabs={subTabs}
                value={state.mediaType}
                onChange={(val) => {
                  state.setMediaType(val);
                  state.setCurrentPage(1);
                }}
                variant="sub"
              />
            </PanelHeader.Row>
          </PanelHeader>

          <div className={styles['ratings-results']}>
            {/* Upper Pagination Panel */}
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

            {/* Table of Rated / Unrated items */}
            <div className={styles['ratings-table-block']}>
              <div className={styles['ratings-content']}>
                {state.isLoading ? (
                  <div className={styles['ratings-skeleton-list']}>
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className={styles['ratings-skeleton-row']}>
                        <Skeleton className={styles['ratings-skeleton-col-name']} variant="rect" />
                        <Skeleton className={styles['ratings-skeleton-col-rating']} variant="rect" />
                        <Skeleton className={styles['ratings-skeleton-col-action']} variant="rect" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    rows={state.paginatedItems}
                    emptyText={t('ratings.table.empty', { defaultValue: 'No items match selected criteria.' })}
                    sortKey={state.sortKey}
                    sortDirection={state.sortDirection}
                    onSort={state.handleSortToggle}
                  />
                )}
              </div>
            </div>
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
