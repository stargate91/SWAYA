import { Minus } from '@/ui/icons';
import CardMetadata from '@/ui/CardMetadata';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import AdultOverlay from '@/ui/AdultOverlay';
import { API_BASE } from '@/lib/backend';
import styles from './ListsCard.module.css';

export default function ListsCard({
  item,
  sessionMode,
  settings,
  t,
  handleCardClick,
  handleRemoveListItem,
}) {
  const n = normalizeMediaEntity(item, {
    context: 'library',
    settings,
    sessionMode,
  });

  const isScene = n.isScene;
  const shouldBlur = n.shouldBlur;
  const rawPosterUrl = n.imageUrl;
  const posterUrl = (shouldBlur && rawPosterUrl)
    ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
    : rawPosterUrl;

  let subtitle = n.subtitle;
  let ratingPill;
  let performers;

  if (isScene) {
    performers = n.performers;
    subtitle = undefined;

    const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
    ratingPill = displayDate ? (
      <span className={styles['lists-card__date']}>{displayDate}</span>
    ) : undefined;
  }

  return (
    <div className={`${styles['lists-card']} ${isScene ? styles['lists-card--scene'] : styles['lists-card--poster']}`}>
      <div
        className={`${styles['lists-card__media']} ${shouldBlur ? styles['is-blurred'] : ''}`}
        onClick={() => handleCardClick(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(item);
          }
        }}
      >
        <button
          className="ui-card-action-btn ui-card-action-btn--danger"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveListItem(item.id);
          }}
          title={t('lists.remove_from_list') || 'Remove from list'}
        >
          <Minus size={11} strokeWidth={3.5} /> {t('common.remove') || 'Remove'}
        </button>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className={styles['lists-card__img']}
          />
        ) : (
          <div className={styles['lists-card__placeholder']} />
        )}
        {shouldBlur && (
          <AdultOverlay variant="obscure" badgeText={t('common.adult_badge', { defaultValue: '18+' })} />
        )}
      </div>
      <CardMetadata
        title={item.title}
        subtitle={subtitle}
        performers={performers}
        ratingPill={ratingPill}
        className={styles['lists-card__info']}
        titleClassName={styles['lists-card__title']}
        subtitleClassName={styles['lists-card__subtitle']}
      />
    </div>
  );
}
