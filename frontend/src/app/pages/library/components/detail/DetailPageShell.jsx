/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { useEffect } from 'react';
import Page from '@/ui/Page';
import Spinner from '@/ui/Spinner';
import Skeleton from '@/ui/Skeleton';
import { Eye, EyeOff } from '@/ui/icons';
import HeroSection from './HeroSection';
import '../../MediaDetailPage.css';

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
    return (
      <Page className={combinedClassName}>
        <div style={{ width: '100%' }}>
          <Skeleton.Banner style={{ height: '380px', borderRadius: 'var(--radius-3xl)', marginBottom: 'var(--space-3xl)' }} />
          <div style={{ padding: '0 var(--space-4xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            <div style={{ width: '300px' }}>
              <Skeleton.Title style={{ marginBottom: 'var(--space-md)' }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              <Skeleton style={{ width: '80px', height: '20px' }} variant="text" />
              <Skeleton style={{ width: '120px', height: '20px' }} variant="text" />
              <Skeleton style={{ width: '60px', height: '20px' }} variant="text" />
            </div>
            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Skeleton style={{ height: '18px', width: '100%' }} variant="text" />
              <Skeleton style={{ height: '18px', width: '95%' }} variant="text" />
              <Skeleton style={{ height: '18px', width: '60%' }} variant="text" />
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
