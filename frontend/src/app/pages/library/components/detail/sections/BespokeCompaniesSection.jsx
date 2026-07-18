import { useMemo } from 'react';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';
import ScrollRow from '@/ui/ScrollRow';
import Card from '@/ui/Card';
import Inline from '@/ui/Inline';
import LogoCard from '@/ui/data/LogoCard';

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
      <Card
        variant="glass-shaded"
        headerVariant="shaded"
        padding="md"
        title={sectionLabel}
      >
        <ScrollRow
          className="no-scrollbar"
          showArrows={true}
        >
          <Inline gap="md" wrap={false}>
            {allCompanies.map((c, i) => (
              <Tooltip key={i} content={c.name} side="top">
                <LogoCard
                  src={c.logo_path ? resolveMediaImageUrl(c.logo_path, 'logo', API_BASE) : undefined}
                  alt={c.name}
                  size="lg"
                  invert
                />
              </Tooltip>
            ))}
          </Inline>
        </ScrollRow>
      </Card>
    </div>
  );
}
