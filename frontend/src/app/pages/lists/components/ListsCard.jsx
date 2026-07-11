import { Minus } from '@/ui/icons';
import CardMetadata from '@/ui/CardMetadata';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import AdultOverlay from '@/ui/AdultOverlay';
import { API_BASE } from '@/lib/backend';

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
      <span className="lists-card__date">{displayDate}</span>
    ) : undefined;
  }

  return (
    <div className={`lists-card ${isScene ? 'lists-card--scene' : 'lists-card--poster'}`}>
      <div
        className={`lists-card__media ${shouldBlur ? 'is-blurred' : ''}`}
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
            className="lists-card__img"
          />
        ) : (
          <div className="lists-card__placeholder" />
        )}
        {shouldBlur && (
          <AdultOverlay variant="obscure" badgeText={t('common.adult_badge', { defaultValue: '18+' })} />
        )}
      </div>
      <CardMetadata
        title={item.title}
        onTitleClick={() => handleCardClick(item)}
        subtitle={subtitle}
        performers={performers}
        ratingPill={ratingPill}
        className="lists-card__info"
        titleClassName="lists-card__title"
        subtitleRowClassName=""
        subtitleClassName="lists-card__subtitle"
      />
    </div>
  );
}
