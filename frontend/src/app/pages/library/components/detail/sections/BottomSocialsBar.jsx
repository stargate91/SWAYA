import { useState } from 'react';
import { Minus, Plus } from '@/ui/icons';
import UtilityBarBottomPortal from '../../../../../../components/UtilityBarBottomPortal';
import Tooltip from '@/ui/Tooltip';

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
                <Tooltip key={link.key} content={link.label} side="top">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="u-icon-btn-round"
                  >
                    <img src={link.iconSrc || '/links/website.svg'} alt={link.label} />
                  </a>
                </Tooltip>
              ))}
            </div>
          )}

          <div className="u-flex-nowrap">
            {mainSocialLinks.map((link) => (
              <Tooltip key={link.key} content={link.label} side="top">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="u-icon-btn-round"
                >
                  <img src={link.iconSrc || '/links/website.svg'} alt={link.label} />
                </a>
              </Tooltip>
            ))}
          </div>

          {hasExtraSocials && (
            <Tooltip
              content={isSocialExpanded ? (t('common.showLess') || 'Show Less') : (t('common.showMore') || 'Show More')}
              side="top"
            >
              <button
                type="button"
                className="u-icon-btn-round u-text-muted u-hover-no-transform"
                onClick={() => setIsSocialExpanded(!isSocialExpanded)}
              >
                {isSocialExpanded ? <Minus size={14} /> : <Plus size={14} />}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </UtilityBarBottomPortal>
  );
}
