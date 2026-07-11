import { useState } from 'react';
import Pill from '@/ui/Pill';
import Lightbox from '@/ui/Lightbox';
import ParsedParagraphs from '@/ui/ParsedParagraphs';
import { OverviewContent } from './EntityDetailSections';
import { API_BASE } from '@/lib/backend';
import EditableMediaCard from './EditableMediaCard';
import { getOriginalImageUrlHelper } from '../../utils/heroSectionUtils';
import './EntityDetailHeroSection.css';

export default function MovieCollectionHeroSection({
  item,
  mediaUrl,
  overviewText,
  overviewTitle,
  metaPills = [],
  t,
  onMediaCardClick,
}) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const getOriginalUrl = () => getOriginalImageUrlHelper(false, item, mediaUrl, API_BASE);

  return (
    <>
      <section className="entity-detail-page__hero-grid">
        <div className="entity-detail-page__media-column">
          <EditableMediaCard
            mediaUrl={mediaUrl}
            onClick={() => {
              const url = getOriginalUrl();
              if (url) setLightboxUrl(url);
            }}
            onEditClick={onMediaCardClick}
            editTitle={t('library.details.changePoster') || 'Change Poster'}
            viewOriginalTitle={t('library.details.viewOriginalImage') || 'View Original Image'}
            type="poster"
          />
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
                <ParsedParagraphs
                  text={overviewText}
                  className="entity-detail-page__description"
                  paragraphClassName="entity-detail-page__description-paragraph"
                />
              </div>

              <div className="entity-detail-page__sidebar-layout">
                <div className="entity-detail-page__sidebar-section">
                  <OverviewContent
                    text={overviewText}
                    t={t}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {lightboxUrl && (
        <Lightbox
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          t={t}
        />
      )}
    </>
  );
}
