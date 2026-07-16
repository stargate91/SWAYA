import SelectableCard from '@/ui/SelectableCard';

export default function ImageOptionCard({
  imageUrl,
  alt = 'Image option',
  label,
  isSelected = false,
  onClick,
  aspect = 'square', // 'square' | 'backdrop'
  className = '',
  imgClassName = '',
}) {
  return (
    <SelectableCard
      selected={isSelected}
      onClick={onClick}
      className={`scene-image-picker-card ${className}`.trim()}
      as="div"
      variant="picker"
    >
      <div className={`scene-image-picker-img-wrapper ${aspect === 'backdrop' ? 'backdrop-variant' : ''} ${imgClassName}`.trim()}>
        {imageUrl ? (
          <img src={imageUrl} alt={alt} />
        ) : (
          <div className="scene-image-picker-placeholder">{alt}</div>
        )}
      </div>
      {label && <span className="scene-image-picker-label">{label}</span>}
    </SelectableCard>
  );
}

