import { useEffect } from 'react';
import Page from '@/ui/Page';
import Skeleton from '@/ui/Skeleton';
import { Eye, EyeOff } from '@/ui/icons';
import HeroSection from './HeroSection';
import '../../MediaDetailPage.css';
import './DetailPageLoading.css';
import './DetailPageShell.css';

export default function DetailPageShell({
  children,
  backdropUrl,
  fallbackUrl,
  activePanel,
  isLoading = false,
  isSideNavVisible = true,
  onToggleSideNav,
  onClosePanel,
  renderPanelContent,
  sideNav,
  topRightControls,
  pageClassName = '',
  panelOpenClassName = 'media-detail-page__container--panel-open',
  isScene = false,
  containerRef,
  isPreviewPlaying,
  previewSrc,
  isPeople = false,
}) {

  useEffect(() => {
    if (!activePanel || !onClosePanel) return;

    const excludedSelectors = [
      '.media-detail-page__side-panel',
      '.media-detail-page__side-nav',
      '.media-detail-page__top-right-controls',
      '.media-detail-page__meta-row',
      '.media-detail-page__actions-row',
      '.media-detail-page__actions',
      '.media-actions',
      '.media-detail-page__logo-container',
      '.ui-modal',
      '.ui-modal-backdrop',
      '.modal',
      '[role="dialog"]',
      '.radix-portal',
      '.radix-overlay',
      '.media-detail-page__back-button'
    ];

    const handleDocumentClick = (e) => {
      if (!document.body.contains(e.target)) {
        return;
      }
      const isExcluded = excludedSelectors.some(selector => e.target.closest(selector));
      if (!isExcluded) {
        onClosePanel();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [activePanel, onClosePanel]);

  const combinedClassName = `media-detail-page ${isScene ? 'media-detail-page--scene' : ''} ${pageClassName}`.trim();

  if (isLoading) {
    if (isPeople) {
      return (
        <Page className={`${combinedClassName} entity-detail-page--people`}>
          <div className="detail-shell-people-loading-hero">
            {/* Left Sidebar Panel (Glass panel structure) */}
            <div className="entity-detail-page__media-column no-scrollbar detail-shell-people-loading-sidebar">
              {/* Title & aliases */}
              <div>
                <Skeleton className="detail-shell-people-loading-title-line" variant="text" />
                <Skeleton className="detail-shell-people-loading-subtitle-line" variant="text" />
              </div>

              {/* Profile image card */}
              <Skeleton className="detail-shell-people-loading-profile" variant="rect" />

              {/* Action row (Heart, check, pencil buttons) */}
              <div className="detail-shell-people-loading-actions">
                <Skeleton className="detail-shell-people-loading-action-btn" variant="rect" />
                <Skeleton className="detail-shell-people-loading-action-btn" variant="rect" />
                <Skeleton className="detail-shell-people-loading-action-btn" variant="rect" />
              </div>

              {/* Rating representation */}
              <Skeleton className="detail-shell-people-loading-rating" variant="rect" />

              {/* Info grid (Gender, Role, Born, Age, etc.) */}
              <div className="detail-shell-people-loading-infogrid">
                <div>
                  <Skeleton className="detail-shell-people-loading-info-label" variant="text" />
                  <Skeleton className="detail-shell-people-loading-info-value" variant="text" />
                </div>
                <div>
                  <Skeleton className="detail-shell-people-loading-info-label" variant="text" />
                  <Skeleton className="detail-shell-people-loading-info-value" variant="text" />
                </div>
                <div>
                  <Skeleton className="detail-shell-people-loading-info-label" variant="text" />
                  <Skeleton className="detail-shell-people-loading-info-value" variant="text" />
                </div>
                <div>
                  <Skeleton className="detail-shell-people-loading-info-label" variant="text" />
                  <Skeleton className="detail-shell-people-loading-info-value" variant="text" />
                </div>
              </div>

              {/* Biography button */}
              <Skeleton className="detail-shell-people-loading-bio-btn" variant="rect" />
            </div>

            {/* Right side area: Known For horizontal cards list at the bottom */}
            <div className="detail-shell-people-loading-right-area">
              <div className="detail-shell-people-loading-knownfor-container">
                {/* Title: KNOWN FOR */}
                <Skeleton className="detail-shell-people-loading-knownfor-title" variant="text" />
                
                {/* Horizontal row of cards */}
                <div className="detail-shell-people-loading-cards-row">
                  {[...Array(8)].map((_, idx) => (
                    <div key={idx} className="detail-shell-people-loading-card-item">
                      <Skeleton className="detail-shell-people-loading-card-poster" variant="rect" />
                      <Skeleton className="detail-shell-people-loading-card-title" variant="text" />
                      <Skeleton className="detail-shell-people-loading-card-meta" variant="text" />
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
        <div className="detail-shell-loading-wrapper">
          <Skeleton.Banner className="detail-shell-loading-banner" />
          <div className="detail-shell-loading-content">
            <div className="detail-shell-loading-title">
              <Skeleton.Title className="detail-shell-loading-title-skeleton" />
            </div>
            <div className="detail-shell-loading-meta">
              <Skeleton className="detail-shell-loading-meta-item-1" variant="text" />
              <Skeleton className="detail-shell-loading-meta-item-2" variant="text" />
              <Skeleton className="detail-shell-loading-meta-item-3" variant="text" />
            </div>
            <div className="detail-shell-loading-description">
              <Skeleton className="detail-shell-loading-desc-line-1" variant="text" />
              <Skeleton className="detail-shell-loading-desc-line-2" variant="text" />
              <Skeleton className="detail-shell-loading-desc-line-3" variant="text" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page className={combinedClassName}>

      <HeroSection
        backdropUrl={backdropUrl || fallbackUrl}
        isFallback={!backdropUrl && !isScene}
        isPreviewPlaying={isPreviewPlaying}
        previewSrc={previewSrc}
      />

      <div className="media-detail-page__layout-wrapper">
        {(topRightControls || onToggleSideNav) ? (
          <div className={`media-detail-page__top-right-controls ${!isSideNavVisible ? 'hidden-state' : ''}`}>
            {topRightControls}
            {onToggleSideNav ? (
              <button
                onClick={onToggleSideNav}
                className="media-detail-page__side-nav-toggle"
                title={isSideNavVisible ? 'Hide Info Panels' : 'Show Info Panels'}
              >
                {isSideNavVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          ref={containerRef}
          className={`media-detail-page__container${activePanel ? ` ${panelOpenClassName}` : ''}`}
        >
          {children}
        </div>

        <div className={`media-detail-page__side-panel ${activePanel ? 'is-open' : ''}`}>
          <div className="media-detail-page__side-panel-content">
            {activePanel ? renderPanelContent?.() : null}
          </div>
        </div>

        {isSideNavVisible ? (
          <div className="media-detail-page__side-nav">
            {sideNav}
          </div>
        ) : null}
      </div>
    </Page>
  );
}
