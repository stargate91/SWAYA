import { useMemo } from 'react';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';
import ScrollRow from '@/ui/ScrollRow';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
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
      <Card variant="glass-shaded" padding="none">
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
              <div key={i} className="bespoke-company-card">
                <Tooltip content={c.name} side="top">
                  {c.logo_path ? (
                    <img src={resolveMediaImageUrl(c.logo_path, 'logo', API_BASE)} alt={c.name} className="bespoke-company-logo" />
                  ) : (
                    <Text variant="small" weight="bold" color="secondary" className="bespoke-company-text">
                      {c.name}
                    </Text>
                  )}
                </Tooltip>
              </div>
            ))}
          </ScrollRow>
        </div>
      </Card>
    </div>
  );
}
