import { Layers, User, PenLine, Maximize2 } from '@/ui/icons';
import PosterCard from '@/ui/PosterCard';
import Badge from '@/ui/Badge';
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

  const flagBadge = flagEmoji ? (
    <Badge
      variant="top-left"
      title={flagTooltip}
    >
      {flagEmoji}
    </Badge>
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
      aspect="auto"
      fillHeight={true}
      fluid={true}
      placeholderText={null}
      icon={PlaceholderIcon}
      topLeftAction={flagBadge}
      topRightAction={editButton}
      overlay={overlay}
      title={null}
      className={`entity-detail-page__media-card entity-detail-page__media-card--editable ${className}`.trim()}
      previewEnabled={false}
      disableHoverAnimation={true}
    />
  );
}

