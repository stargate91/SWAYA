import Page from '@/ui/Page';
import Skeleton from '@/ui/Skeleton';
import HeroSection from './HeroSection';
import '../../MediaDetailPage.css';
import loadingStyles from './DetailPageLoading.module.css';
import styles from './DetailPageShell.module.css';

export default function DetailPageShell({
  children,
  backdropUrl,
  fallbackUrl,
  isLoading = false,
  topRightControls,
  pageClassName = '',
  isScene = false,
  containerRef,
  isPreviewPlaying,
  previewSrc,
  isPeople = false,
  isScrolled = false,
  isDrawerOpen = false,
  onVideoPlayingChange,
}) {

  const combinedClassName = `${styles.page} ${isScene ? styles.pageScene : ''} ${pageClassName}`.trim();

  if (isLoading) {
    if (isPeople) {
      return (
        <Page className={`${combinedClassName} entity-detail-page--people`}>
          <div className={loadingStyles['people-hero']}>
            {/* Left Sidebar Panel (Glass panel structure) */}
            <div className={`entity-detail-page__media-column no-scrollbar ${loadingStyles['people-sidebar']}`}>
              {/* Title & aliases */}
              <div>
                <Skeleton className={loadingStyles['people-title-line']} variant="text" />
                <Skeleton className={loadingStyles['people-subtitle-line']} variant="text" />
              </div>

              {/* Profile image card */}
              <Skeleton className={loadingStyles['people-profile']} variant="rect" />

              {/* Action row (Heart, check, pencil buttons) */}
              <div className={loadingStyles['people-actions']}>
                <Skeleton className={loadingStyles['people-action-btn']} variant="rect" />
                <Skeleton className={loadingStyles['people-action-btn']} variant="rect" />
                <Skeleton className={loadingStyles['people-action-btn']} variant="rect" />
              </div>

              {/* Rating representation */}
              <Skeleton className={loadingStyles['people-rating']} variant="rect" />

              {/* Info grid (Gender, Role, Born, Age, etc.) */}
              <div className={loadingStyles['people-infogrid']}>
                <div>
                  <Skeleton className={loadingStyles['people-info-label']} variant="text" />
                  <Skeleton className={loadingStyles['people-info-value']} variant="text" />
                </div>
                <div>
                  <Skeleton className={loadingStyles['people-info-label']} variant="text" />
                  <Skeleton className={loadingStyles['people-info-value']} variant="text" />
                </div>
                <div>
                  <Skeleton className={loadingStyles['people-info-label']} variant="text" />
                  <Skeleton className={loadingStyles['people-info-value']} variant="text" />
                </div>
                <div>
                  <Skeleton className={loadingStyles['people-info-label']} variant="text" />
                  <Skeleton className={loadingStyles['people-info-value']} variant="text" />
                </div>
              </div>

              {/* Biography button */}
              <Skeleton className={loadingStyles['people-bio-btn']} variant="rect" />
            </div>

            {/* Right side area: Known For horizontal cards list at the bottom */}
            <div className={loadingStyles['people-right-area']}>
              <div className={loadingStyles['people-knownfor-container']}>
                {/* Title: KNOWN FOR */}
                <Skeleton className={loadingStyles['people-knownfor-title']} variant="text" />
                
                {/* Horizontal row of cards */}
                <div className={loadingStyles['people-cards-row']}>
                  {[...Array(8)].map((_, idx) => (
                    <div key={idx} className={loadingStyles['people-card-item']}>
                      <Skeleton className={loadingStyles['people-card-poster']} variant="rect" />
                      <Skeleton className={loadingStyles['people-card-title']} variant="text" />
                      <Skeleton className={loadingStyles['people-card-meta']} variant="text" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Page>
      );
    }

    return (
      <Page className={combinedClassName}>
        <div className={loadingStyles['loading-wrapper']}>
          <Skeleton.Banner className={loadingStyles['loading-banner']} />
          <div className={loadingStyles['loading-content']}>
            <div className={loadingStyles['loading-title']}>
              <Skeleton.Title className={loadingStyles['loading-title-skeleton']} />
            </div>
            <div className={loadingStyles['loading-meta']}>
              <Skeleton className={loadingStyles['loading-meta-item-1']} variant="text" />
              <Skeleton className={loadingStyles['loading-meta-item-2']} variant="text" />
              <Skeleton className={loadingStyles['loading-meta-item-3']} variant="text" />
            </div>
            <div className={loadingStyles['loading-description']}>
              <Skeleton className={loadingStyles['loading-desc-line-1']} variant="text" />
              <Skeleton className={loadingStyles['loading-desc-line-2']} variant="text" />
              <Skeleton className={loadingStyles['loading-desc-line-3']} variant="text" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      className={combinedClassName}
      data-scrolled={isScrolled}
      data-preview-playing={isPreviewPlaying}
      data-drawer-open={isDrawerOpen}
    >

      <HeroSection
        backdropUrl={backdropUrl || fallbackUrl}
        isFallback={!backdropUrl && !isScene}
        isPreviewPlaying={isPreviewPlaying}
        previewSrc={previewSrc}
        onPlayingChange={onVideoPlayingChange}
      />

      <div className={styles['layout-wrapper']}>
        {topRightControls ? (
          <div className={styles['top-right-controls']}>
            {topRightControls}
          </div>
        ) : null}

        <div
          ref={containerRef}
          className={styles.container}
        >
          {children}
        </div>
      </div>
    </Page>
  );
}
