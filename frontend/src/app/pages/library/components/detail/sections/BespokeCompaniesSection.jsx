import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';

export default function BespokeCompaniesSection({ item, t }) {
  const companiesScrollRef = useRef(null);
  const [companiesScrollState, setCompaniesScrollState] = useState({ left: false, right: false });
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

  const handleScrollState = () => {
    const container = companiesScrollRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCompaniesScrollState({
      left: scrollLeft > 4,
      right: scrollLeft < scrollWidth - clientWidth - 4
    });
  };

  useEffect(() => {
    const timer = setTimeout(handleScrollState, 100);
    return () => clearTimeout(timer);
  }, [allCompanies]);

  const scrollCompanies = (direction) => {
    const container = companiesScrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

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
          <button
            type="button"
            className="bespoke-carousel-nav bespoke-carousel-nav--left"
            onClick={() => scrollCompanies('left')}
          >
            <ChevronLeft size={14} />
          </button>

          <div className={`dashboard-cast-carousel-container bespoke-fade-container ${companiesScrollState.left ? 'has-fade-left' : ''} ${companiesScrollState.right ? 'has-fade-right' : ''}`}>
            <div
              className="bespoke-companies-body"
              ref={companiesScrollRef}
              onScroll={handleScrollState}
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
            </div>
          </div>

          <button
            type="button"
            className="bespoke-carousel-nav bespoke-carousel-nav--right"
            onClick={() => scrollCompanies('right')}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
