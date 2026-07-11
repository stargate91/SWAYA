/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { useEffect } from 'react';
import Page from '@/ui/Page';
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
          <div className="entity-detail-page__hero-section-wrapper" style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-4xl)', width: '100%', height: 'calc(100vh - var(--page-top-offset, 4rem) - 120px)', alignItems: 'stretch', boxSizing: 'border-box' }}>
            {/* Left Sidebar Panel (Glass panel structure) */}
            <div className="entity-detail-page__media-column" style={{
              width: '320px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              padding: 'var(--space-xl)',
              borderRadius: '24px',
              background: 'color-mix(in srgb, var(--app-shell-color-panel, var(--color-panel)) 22%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-border-default) 40%, transparent)',
              backdropFilter: 'blur(16px)',
              boxSizing: 'border-box',
              height: '100%'
            }}>
              {/* Title & aliases */}
              <div>
                <Skeleton style={{ width: '80%', height: '24px', marginBottom: 'var(--space-xs)' }} variant="text" />
                <Skeleton style={{ width: '60%', height: '14px', marginBottom: 'var(--space-md)' }} variant="text" />
              </div>

              {/* Profile image card */}
              <Skeleton style={{ width: '100%', aspectRatio: '2 / 3', borderRadius: '16px' }} variant="rect" />

              {/* Action row (Heart, check, pencil buttons) */}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', margin: 'var(--space-xs) 0' }}>
                <Skeleton style={{ flex: 1, height: '32px', borderRadius: '8px' }} variant="rect" />
                <Skeleton style={{ flex: 1, height: '32px', borderRadius: '8px' }} variant="rect" />
                <Skeleton style={{ flex: 1, height: '32px', borderRadius: '8px' }} variant="rect" />
              </div>

              {/* Rating representation */}
              <Skeleton style={{ width: '100%', height: '12px', borderRadius: '4px', margin: 'var(--space-xs) 0' }} variant="rect" />

              {/* Info grid (Gender, Role, Born, Age, etc.) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', margin: 'var(--space-sm) 0' }}>
                <div>
                  <Skeleton style={{ width: '50%', height: '10px', marginBottom: '4px' }} variant="text" />
                  <Skeleton style={{ width: '80%', height: '14px' }} variant="text" />
                </div>
                <div>
                  <Skeleton style={{ width: '50%', height: '10px', marginBottom: '4px' }} variant="text" />
                  <Skeleton style={{ width: '80%', height: '14px' }} variant="text" />
                </div>
                <div>
                  <Skeleton style={{ width: '50%', height: '10px', marginBottom: '4px' }} variant="text" />
                  <Skeleton style={{ width: '80%', height: '14px' }} variant="text" />
                </div>
                <div>
                  <Skeleton style={{ width: '50%', height: '10px', marginBottom: '4px' }} variant="text" />
                  <Skeleton style={{ width: '80%', height: '14px' }} variant="text" />
                </div>
              </div>

              {/* Biography button */}
              <Skeleton style={{ width: '100%', height: '36px', borderRadius: '10px', marginTop: 'auto' }} variant="rect" />
            </div>

            {/* Right side area: Known For horizontal cards list at the bottom */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 'var(--space-xl)', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Title: KNOWN FOR */}
                <Skeleton style={{ width: '120px', height: '18px', marginBottom: 'var(--space-xs)' }} variant="text" />
                
                {/* Horizontal row of cards */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', overflow: 'hidden' }}>
                  {[...Array(8)].map((_, idx) => (
                    <div key={idx} style={{ width: '120px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      <Skeleton style={{ width: '100%', height: '180px', borderRadius: '12px' }} variant="rect" />
                      <Skeleton style={{ width: '90%', height: '12px' }} variant="text" />
                      <Skeleton style={{ width: '60%', height: '10px' }} variant="text" />
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
