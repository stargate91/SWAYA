 
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import UtilityBarBottomPortal from '../../../../../../components/UtilityBarBottomPortal';

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
      <div className={`entity-detail-page__bottom-socials ${isSocialExpanded ? 'entity-detail-page__bottom-socials--expanded' : ''}`}>
        <div className="entity-detail-page__bottom-socials-wrapper">
          {hasExtraSocials && (
            <div className="entity-detail-page__bottom-socials-extra">
              {extraSocialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="entity-detail-page__bottom-social-btn"
                  title={link.label}
                >
                  <img src={link.iconSrc || '/links/website.svg'} alt={link.label} />
                </a>
              ))}
            </div>
          )}

          <div className="entity-detail-page__bottom-socials-main">
            {mainSocialLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="entity-detail-page__bottom-social-btn"
                title={link.label}
              >
                <img src={link.iconSrc || '/links/website.svg'} alt={link.label} />
              </a>
            ))}
          </div>

          {hasExtraSocials && (
            <button
              type="button"
              className="entity-detail-page__bottom-social-toggle"
              onClick={() => setIsSocialExpanded(!isSocialExpanded)}
              title={isSocialExpanded ? (t('common.less') || 'Show Less') : (t('common.more') || 'Show More')}
            >
              {isSocialExpanded ? <Minus size={14} /> : <Plus size={14} />}
            </button>
          )}
        </div>
      </div>
    </UtilityBarBottomPortal>
  );
}
