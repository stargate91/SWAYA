 
import { useState } from 'react';
import { Minus, Plus } from '@/ui/icons';
import UtilityBarBottomPortal from '../../../../../../components/UtilityBarBottomPortal';
import Inline from '@/ui/Inline';
export default function BottomSocialsBar({
  socialLinks,
  t
}) {
  const [isSocialExpanded, setIsSocialExpanded] = useState(false);

  if (!socialLinks || socialLinks.length === 0) return null;

  const hasExtraSocials = socialLinks.length > 4;
  const mainSocialLinks = hasExtraSocials ? socialLinks.slice(0, 4) : socialLinks;
  const extraSocialLinks = hasExtraSocials ? socialLinks.slice(4) : [];

  return (
    <UtilityBarBottomPortal side="right">
      <div className="u-hover-reveal" data-active={isSocialExpanded}>
        <div className="u-pill-panel">
          {hasExtraSocials && (
            <div
              className="u-collapse-horizontal"
              data-expanded={isSocialExpanded}
            >
              {extraSocialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="u-icon-btn-round"
                  title={link.label}
                >
                  <img src={link.iconSrc || '/links/website.svg'} alt={link.label} />
                </a>
              ))}
            </div>
          )}

          <div className="u-flex-nowrap">
            {mainSocialLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="u-icon-btn-round"
                title={link.label}
              >
                <img src={link.iconSrc || '/links/website.svg'} alt={link.label} />
              </a>
            ))}
          </div>

          {hasExtraSocials && (
            <button
              type="button"
              className="u-icon-btn-round u-text-muted u-hover-no-transform"
              onClick={() => setIsSocialExpanded(!isSocialExpanded)}
              title={isSocialExpanded ? (t('common.showLess') || 'Show Less') : (t('common.showMore') || 'Show More')}
            >
              {isSocialExpanded ? <Minus size={14} /> : <Plus size={14} />}
            </button>
          )}
        </div>
      </div>
    </UtilityBarBottomPortal>
  );
}
