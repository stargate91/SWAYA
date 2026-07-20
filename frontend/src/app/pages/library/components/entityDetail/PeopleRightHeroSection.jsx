import { Layers } from '@/ui/icons';
import { navigateToCreditDetail } from '../../utils/mediaNavigation';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/providers/LanguageContext';
import SectionHeader from '@/ui/SectionHeader';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import styles from './PeopleRightHeroSection.module.css';

export default function PeopleRightHeroSection({ item }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!item?.known_for || item.known_for.length === 0) {
    return <div className={`entity-detail-page__summary ${styles['summary-wrapper']}`} />;
  }

  return (
    <div className={`entity-detail-page__summary ${styles['summary-wrapper']}`}>
      <Stack gap="md" className="u-w-full">
        <SectionHeader title={t('library.details.knownForTitle') || 'Known For'} />
        <Inline gap="md" align="center" className="u-overflow-x-auto no-scrollbar">
          {item.known_for.map((credit) => {
            const creditTitle = credit.title || credit.name || 'Unknown';
            const handleCardClick = () => {
              navigateToCreditDetail(navigate, credit, credit.media_type || credit.type);
            };

            const cardClass = `
              ${styles['known-for-card']}
              ${styles['known-for-card--clickable']}
            `.trim().replace(/\s+/g, ' ');

            return (
              <div
                key={`${credit.id}-${credit.type || 'movie'}`}
                className={cardClass}
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
                <div className={styles['poster-container']}>
                  {credit.poster_path ? (
                    <img
                      src={credit.poster_path}
                      alt={creditTitle}
                      className={styles.poster}
                      loading="lazy"
                    />
                  ) : (
                    <div className="u-h-full u-w-full u-flex u-items-center u-justify-center u-color-text-faint">
                      <Layers size={20} />
                    </div>
                  )}
                </div>
                <Text variant="2xs" weight="semibold" truncate color="primary">
                  {creditTitle}
                </Text>
              </div>
            );
          })}
        </Inline>
      </Stack>
    </div>
  );
}

