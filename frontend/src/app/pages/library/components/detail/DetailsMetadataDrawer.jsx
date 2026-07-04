/* eslint-disable react/jsx-no-literals */
import TechnicalPanel from './panels/TechnicalPanel';
import ExtrasPanel from './panels/ExtrasPanel';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';

export default function DetailsMetadataDrawer({
  isOpen,
  onClose,
  item,
  isMovie,
  isScene,
  t
}) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="entity-detail-page__drawer-backdrop ui-drawer-backdrop"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
      />
      <div className="entity-detail-page__drawer ui-drawer ui-drawer--md">
        <div className="entity-detail-page__drawer-header">
          <h3 className="entity-detail-page__drawer-title">
            {t('library.details.details') || 'Details'}
          </h3>
          <button
            type="button"
            className="entity-detail-page__drawer-close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="entity-detail-page__drawer-content">
          {/* Production Companies (for series only) */}
          {!isMovie && !isScene && item?.companies && item.companies.length > 0 && (
            <div className="entity-detail-page__drawer-section">
              <h4 className="entity-detail-page__drawer-section-title">
                {t('library.details.productionCompanies') || 'Production Companies'}
              </h4>
              <div className="bespoke-companies-body">
                {item.companies.map((c, i) => (
                  <div key={i} className="bespoke-company-item" title={c.name}>
                    {c.logo_path ? (
                      <img src={resolveMediaImageUrl(c.logo_path, 'logo', API_BASE)} alt={c.name} className="bespoke-company-logo" />
                    ) : (
                      <span className="bespoke-company-name-only">{c.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Networks (for series only) */}
          {!isMovie && !isScene && item?.networks && item.networks.length > 0 && (
            <div className="entity-detail-page__drawer-section">
              <h4 className="entity-detail-page__drawer-section-title">
                {t('library.details.platformsNetworks') || 'Networks & Platforms'}
              </h4>
              <div className="bespoke-companies-body">
                {item.networks.map((n, i) => (
                  <div key={i} className="bespoke-company-item" title={n.name}>
                    {n.logo_path ? (
                      <img src={resolveMediaImageUrl(n.logo_path, 'logo', API_BASE)} alt={n.name} className="bespoke-company-logo" />
                    ) : (
                      <span className="bespoke-company-name-only">{n.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extras section */}
          {item?.extras && item.extras.length > 0 && <ExtrasPanel />}

          {/* Technical / Specs section */}
          {!isScene && item?.technical && <TechnicalPanel />}
        </div>
      </div>
    </>
  );
}
