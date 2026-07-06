import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers, PenLine, X, Maximize2 } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { OverviewContent } from './EntityDetailSections';
import { API_BASE } from '@/lib/backend';
import { getPosterImagePath } from '@/lib/imageUrls';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import './EntityDetailHeroSection.css';

export default function MovieCollectionHeroSection({
  item,
  mediaUrl,
  overviewText,
  overviewTitle,
  metaPills = [],
  displayRating,
  isActivateHovered,
  t,
  setIsActivateHovered,
  handleToggleFavorite,
  handleToggleActive,
  handlePeopleRatingMouseMove,
  handlePeopleRatingMouseLeave,
  handlePeopleRatingClick,
  onMediaCardClick,
  openModal,
}) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const getOriginalUrl = () => {
    const rawPath = getPosterImagePath(item);
    if (!rawPath) return mediaUrl || '';
    return resolveDetailsImageUrl(rawPath, API_BASE, 'originalPoster');
  };

  return (
    <>
      <section className="entity-detail-page__hero-grid">
        <div className="entity-detail-page__media-column">
          <div
            className="entity-detail-page__media-card entity-detail-page__media-card--editable"
            onClick={() => {
              const url = getOriginalUrl();
              if (url) setLightboxUrl(url);
            }}
            title={t('library.details.viewOriginalImage') || 'View Original Image'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const url = getOriginalUrl();
                if (url) setLightboxUrl(url);
              }
            }}
          >
            {mediaUrl ? (
              <>
                <img
                  src={mediaUrl}
                  alt={item?.name || item?.title || 'Detail artwork'}
                  className="entity-detail-page__media-image"
                />
                <div className="entity-detail-page__media-card-hover-overlay">
                  <div className="entity-detail-page__media-card-hover-icon">
                    <Maximize2 size={16} />
                  </div>
                </div>
              </>
            ) : (
              <div className="entity-detail-page__media-placeholder">
                <Layers size={44} />
              </div>
            )}
            <button
              type="button"
              className="entity-detail-page__media-edit-badge"
              onClick={(event) => {
                event.stopPropagation();
                onMediaCardClick?.();
              }}
              title={t('library.details.changePoster') || 'Change Poster'}
              aria-label={t('library.details.changePoster') || 'Change Poster'}
            >
              <PenLine size={14} />
            </button>
          </div>
        </div>

        <div className="entity-detail-page__summary">
          <div className="entity-detail-page__headline-block">
            <h1 className="entity-detail-page__title">
              {item?.title || item?.name || 'Unknown Collection'}
            </h1>
            {metaPills.length > 0 && (
              <div className="entity-detail-page__meta-row">
                {metaPills.map((metaItem) => (
                  <Pill key={metaItem.key} variant="meta">{metaItem.content}</Pill>
                ))}
              </div>
            )}
          </div>

          {overviewText && (
            <div className="entity-detail-page__summary-layout">
              <div className="entity-detail-page__summary-text">
                {overviewTitle && <h3 className="entity-detail-page__summary-title">{overviewTitle}</h3>}
                <div className="entity-detail-page__description">
                  {overviewText.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index} className="entity-detail-page__description-paragraph">{paragraph}</p>
                  ))}
                </div>
              </div>

              <div className="entity-detail-page__sidebar-layout">
                <div className="entity-detail-page__sidebar-section">
                  <OverviewContent
                    item={item}
                    displayRating={displayRating}
                    isActivateHovered={isActivateHovered}
                    setIsActivateHovered={setIsActivateHovered}
                    handleToggleFavorite={handleToggleFavorite}
                    handleToggleActive={handleToggleActive}
                    handleOpenReviewMouseMove={handlePeopleRatingMouseMove}
                    handleOpenReviewMouseLeave={handlePeopleRatingMouseLeave}
                    handleOpenReviewClick={handlePeopleRatingClick}
                    t={t}
                    openModal={openModal}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {lightboxUrl && typeof document !== 'undefined' ? createPortal(
        <div
          className="organizer-details__lightbox"
          role="button"
          tabIndex={0}
          aria-label={t('common.close') || 'Close image preview'}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setLightboxUrl(null);
            }
          }}
        >
          <button
            type="button"
            className="organizer-details__lightbox-close"
            aria-label={t('common.close') || 'Close image preview'}
            onClick={(event) => {
              event.stopPropagation();
              setLightboxUrl(null);
            }}
          >
            <X size={18} />
          </button>
          <img
            src={lightboxUrl}
            alt="Enlarged preview"
            className="organizer-details__lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body
      ) : null}
    </>
  );
}
