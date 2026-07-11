import TechnicalPanel from './panels/TechnicalPanel';
import ExtrasPanel from './panels/ExtrasPanel';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Drawer from '@/ui/Drawer';

export default function DetailsMetadataDrawer({
  isOpen,
  onClose,
  item,
  isMovie,
  isScene,
  t
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('library.details.details') || 'Details'}
      size="md"
    >
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
    </Drawer>
  );
}
