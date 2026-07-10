import { memo } from 'react';
import { Minus } from '@/ui/icons';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useSettingsQuery } from '@/queries';
import PosterCard from '@/ui/PosterCard';
import AdultOverlay from '@/ui/AdultOverlay';
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

  const overlay = shouldBlur ? (
    <AdultOverlay
      variant="blur"
      badgeText={t('common.adult_badge', { defaultValue: '18+' })}
    />
  ) : null;

  return (
    <PosterCard
      aspect={isScene ? 'landscape' : 'poster'}
      onClick={onClick}
      title={item.title || item.name}
      subtitle={subtitle}
      imageUrl={posterUrl}
      icon={EmptyIcon}
      ratingPill={ratingPill}
      performers={performers}
      topRightAction={removeButton}
      overlay={overlay}
    />
  );
});

TagPosterCard.displayName = 'TagPosterCard';
