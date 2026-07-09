import { memo } from 'react';
import { Minus } from '@/ui/icons';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useSettingsQuery } from '@/queries';
import CardMetadata from '@/ui/CardMetadata';
import Badge from '@/ui/Badge';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';

export const TagPosterCard = memo(({
  item,
  t,
  emptyIcon: EmptyIcon,
  onClick,
  onRemove,
}) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings } = useSettingsQuery();

  const n = normalizeMediaEntity(item, {
    context: 'library',
    settings,
    sessionMode,
  });

  const isScene = n.isScene;
  const shouldBlur = n.shouldBlur;
  const posterUrl = n.imageUrl;

  const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
  const removeButton = onRemove ? (
    <button
      type="button"
      className="ui-card-action-btn ui-card-action-btn--danger"
      title={t('common.remove') || 'Remove'}
      aria-label={t('common.remove') || 'Remove'}
      onClick={(e) => {
        e.stopPropagation();
        onRemove(item);
      }}
    >
      <Minus size={11} strokeWidth={3.5} /> {t('common.remove') || 'Remove'}
    </button>
  ) : null;

  let subtitle = n.subtitle;
  let ratingPill;
  let performers;

  if (isScene) {
    performers = n.performers;
    subtitle = undefined;

    ratingPill = displayDate ? (
      <span className="library-scene-date">{displayDate}</span>
    ) : undefined;
  }

  return (
    <div className={`lists-card ${isScene ? 'lists-card--scene' : 'lists-card--poster'}`}>
      <div
        className={`lists-card__media ${shouldBlur ? 'is-blurred' : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {removeButton}
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title || item.name}
            className="lists-card__img"
          />
        ) : (
          <div className="lists-card__placeholder">
            {EmptyIcon && <EmptyIcon size={32} className="lists-card__placeholder-icon" />}
          </div>
        )}
        {shouldBlur && (
          <div className="recommend-card-blur-overlay">
            <Badge family="adult" tone="danger">
              {t('common.adult_badge', { defaultValue: '18+' })}
            </Badge>
          </div>
        )}
      </div>
      <CardMetadata
        title={item.title || item.name}
        onTitleClick={onClick}
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
});

TagPosterCard.displayName = 'TagPosterCard';
