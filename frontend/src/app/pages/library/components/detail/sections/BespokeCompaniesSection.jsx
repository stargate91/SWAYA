import { useMemo } from 'react';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';
import ScrollRow from '@/ui/ScrollRow';
import './BespokeCompaniesSection.css';

export default function BespokeCompaniesSection({ item, t }) {
  const isSceneType = item?.type === 'scene';

  const allCompanies = useMemo(() => {
    const list = [...(item?.companies || [])];
    if (isSceneType && item?.networks) {
      for (const net of item.networks) {
        if (!list.some(c => c.name === net.name)) {
          list.push(net);
        }
      }
    }
    return list;
  }, [item, isSceneType]);

  if (allCompanies.length === 0) return null;

  const sectionLabel = isSceneType
    ? (t('library.details.studio') || 'Studio')
    : item?.is_adult
      ? (t('library.details.studio') || 'Studio')
      : (t('library.details.productionCompanies') || 'Production Companies');

  return (
    <div className="bespoke-companies-section">
      <div className="bespoke-companies-card">
        <div className="bespoke-browser-card__pills-header">
          <span className="bespoke-cast-title">
            {sectionLabel}
          </span>
        </div>
        <div className="bespoke-cast-browser-card__body">
          <ScrollRow
            className="bespoke-companies-body no-scrollbar"
            showArrows={true}
          >
            {allCompanies.map((c, i) => (
              <div key={i} className="bespoke-company-item">
                <Tooltip content={c.name} side="top">
                  {c.logo_path ? (
                    <img src={resolveMediaImageUrl(c.logo_path, 'logo', API_BASE)} alt={c.name} className="bespoke-company-logo" />
                  ) : (
                    <span className="bespoke-company-name-only">{c.name}</span>
                  )}
                </Tooltip>
              </div>
            ))}
          </ScrollRow>
        </div>
      </div>
    </div>
  );
}
