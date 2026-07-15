import { Layers, User, PenLine, Maximize2 } from '@/ui/icons';
import PosterCard from '@/ui/PosterCard';
import buttonStyles from '@/ui/IconButton.module.css';

export default function EditableMediaCard({
  mediaUrl,
  onClick,
  onEditClick,
  editTitle,
  viewOriginalTitle,
  type = 'poster', // 'poster' or 'profile'
  flagEmoji,
  flagTooltip,
  className = '',
}) {
  const PlaceholderIcon = type === 'profile' ? User : Layers;

  const editButton = onEditClick ? (
    <button
      type="button"
      className={`${buttonStyles['image-edit-badge']} ui-image-edit-badge`}
      onClick={(event) => {
        event.stopPropagation();
        onEditClick();
      }}
      title={editTitle}
      aria-label={editTitle}
    >
      <PenLine size={14} />
    </button>
  ) : null;

  const overlay = mediaUrl ? (
    <div className="entity-detail-page__media-card-hover-overlay">
      <div className="entity-detail-page__media-card-hover-icon">
        <Maximize2 size={16} />
      </div>
    </div>
  ) : null;

  return (
    <PosterCard
      imageUrl={mediaUrl}
      onClick={onClick}
      placeholderText={null}
      icon={PlaceholderIcon}
      topRightAction={editButton}
      overlay={overlay}
      title={viewOriginalTitle}
      className={`entity-detail-page__media-card ${type === 'profile' ? 'entity-detail-page__media-card--profile' : ''} entity-detail-page__media-card--editable ${className}`.trim()}
      previewEnabled={false}
      disableHoverAnimation={true}
    >
      {flagEmoji && (
        <div
          className="entity-detail-page__media-flag-badge"
          title={flagTooltip}
        >
          {flagEmoji}
        </div>
      )}
    </PosterCard>
  );
}

