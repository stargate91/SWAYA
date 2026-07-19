import { Layers } from '@/ui/icons';
import { navigateToCreditDetail } from '../../utils/mediaNavigation';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/providers/LanguageContext';
import './PeopleRightHeroSection.css';

export default function PeopleRightHeroSection({ item }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!item?.known_for || item.known_for.length === 0) {
    return <div className="entity-detail-page__summary" />;
  }

  return (
    <div className="entity-detail-page__summary">
      <div className="entity-detail-page__known-for-section">
        <h3 className="entity-detail-page__known-for-title">
          {t('library.details.knownForTitle') || 'Known For'}
        </h3>
        <div className="entity-detail-page__known-for-grid no-scrollbar">
          {item.known_for.map((credit) => {
            const creditTitle = credit.title || credit.name || 'Unknown';
            const handleCardClick = () => {
              navigateToCreditDetail(navigate, credit, credit.media_type || credit.type);
            };

            return (
              <div
                key={`${credit.id}-${credit.type || 'movie'}`}
                className="entity-detail-page__known-for-card is-clickable"
                onClick={handleCardClick}
                title={creditTitle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleCardClick();
                  }
                }}
              >
                <div className="entity-detail-page__known-for-poster-container">
                  {credit.poster_path ? (
                    <img
                      src={credit.poster_path}
                      alt={creditTitle}
                      className="entity-detail-page__known-for-poster"
                      loading="lazy"
                    />
                  ) : (
                    <div className="entity-detail-page__known-for-placeholder">
                      <Layers size={20} />
                    </div>
                  )}
                </div>
                <span className="entity-detail-page__known-for-card-title">{creditTitle}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
