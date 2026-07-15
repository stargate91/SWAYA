import { Minus } from '@/ui/icons';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import AdultOverlay from '@/ui/AdultOverlay';
import { API_BASE } from '@/lib/backend';
import PosterCard from '@/ui/PosterCard';
import posterCardStyles from '@/ui/PosterCard.module.css';

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
  let performers;
  let date;

  if (isScene) {
    performers = n.performers;
    subtitle = undefined;
    date = item.release_date ? item.release_date.substring(0, 10) : item.year;
  }

  const removeAction = (
    <button
      type="button"
      className={`${posterCardStyles['action-btn']} ${posterCardStyles['action-btn--danger']}`}
      onClick={(e) => {
        e.stopPropagation();
        handleRemoveListItem(item.id);
      }}
      title={t('lists.remove_from_list') || 'Remove from list'}
    >
      <Minus size={11} strokeWidth={3.5} /> {t('common.remove') || 'Remove'}
    </button>
  );

  const overlay = shouldBlur ? (
    <AdultOverlay variant="obscure" badgeText={t('common.adult_badge', { defaultValue: '18+' })} />
  ) : null;

  return (
    <PosterCard
      aspect={isScene ? 'mixed-landscape' : 'poster'}
      imageUrl={posterUrl}
      title={item.title}
      subtitle={subtitle}
      performers={performers}
      date={date}
      topRightAction={removeAction}
      overlay={overlay}
      fillHeight
      onClick={() => handleCardClick(item)}
    />
  );
}
