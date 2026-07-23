/* eslint-disable react-hooks/refs */
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Edit3, Clapperboard, Tv, Video, Users, CheckCircle } from '@/ui/icons';
import Page from '@/ui/Page';
import Table from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import Button from '@/ui/Button';
import PanelHeader from '@/ui/PanelHeader';
import panelHeaderStyles from '@/ui/PanelHeader.module.css';
import Skeleton from '@/ui/Skeleton';
import SegmentedRating from '@/ui/SegmentedRating';
import { useTranslation } from '@/providers/LanguageContext';
import { useRatingsPageState } from './useRatingsPageState';
import LibraryPagination from '../library/components/LibraryPagination';
import RatingsReviewDrawer from './components/RatingsReviewDrawer';
import ImageTooltip from '@/ui/ImageTooltip';
import styles from './RatingsPage.module.css';
import Inline from '@/ui/Inline';
import { isVideoMediaType } from '@/lib/mediaTypes';

export default function RatingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = useRatingsPageState();
  const isAdultMode = state.activeSessionMode === 'nsfw';



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
            if (row.type === 'video' || isVideoMediaType(row.type)) {
              navigate(`/library/video/${row.id}`, { state: { allowAdult: true } });
            } else {
              navigate(`/library/scene/${row.id}`, { state: { allowAdult: true } });
            }
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
            onMouseEnter={(e) => state.handleMouseEnter(e, row)}
            onMouseMove={state.handleMouseMove}
            onMouseLeave={state.handleMouseLeave}
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
          <Inline gap="md" align="center" className={styles['review-preview-cell']}>
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
              onClick={(e) => state.handleOpenReviewDrawer(e, row)}
            >
              <Edit3 size={12} />
              {hasComment ? t('common.edit') || 'Edit' : t('common.add') || 'Add'}
            </Button>
          </Inline>
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
    <Page variant="viewport" className={styles['ratings-page']}>
      <div className={styles['ratings-main']}>
        <div className={styles['ratings-main__content']}>
          <PanelHeader
            title={t('ratings.title') || 'Ratings & Reviews'}
            sessionMode={state.activeSessionMode}
            tabs={ratingTabs}
            activeTab={state.activeTab}
            onTabChange={(val) => {
              state.setActiveTab(val);
              state.setCurrentPage(1);
            }}
             showSearch={true}
            searchPlaceholder={t('common.search') || 'Search...'}
            searchQuery={state.localSearch}
            onSearchQueryChange={(e) => state.setLocalSearch(e.target.value)}
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
                tabClassName={panelHeaderStyles['panel-tab']}
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
                      <Inline key={idx} gap="lg" align="center" className={styles['ratings-skeleton-row']}>
                        <Skeleton className={styles['ratings-skeleton-col-name']} variant="rect" />
                        <Skeleton className={styles['ratings-skeleton-col-rating']} variant="rect" />
                        <Skeleton className={styles['ratings-skeleton-col-action']} variant="rect" />
                      </Inline>
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
        editingItem={state.editingItem}
        setEditingItem={state.setEditingItem}
        reviewText={state.reviewText}
        setReviewText={state.setReviewText}
        handleSaveReview={state.handleSaveReview}
        t={t}
      />
      <ImageTooltip
        ref={state.tooltipRef}
        imageUrl={state.tooltipImageUrl}
        visible={state.tooltipVisible}
        x={state.tooltipInitialCoords.x}
        y={state.tooltipInitialCoords.y}
        aspect={state.tooltipAspect}
      />
    </Page>
  );
}
