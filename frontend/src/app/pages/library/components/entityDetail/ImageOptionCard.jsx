import SelectableCard from '@/ui/SelectableCard';
import Text from '@/ui/Text';
import styles from '@/ui/SelectableCard.module.css';

export default function ImageOptionCard({
  imageUrl,
  alt = 'Image option',
  label,
  isSelected = false,
  onClick,
  aspect = 'square', // 'square' | 'backdrop'
  className = '',
  imgClassName = '',
  variant = 'picker', // 'picker' | 'picker-logo'
  blur = false,
}) {
  return (
    <SelectableCard
      selected={isSelected}
      onClick={onClick}
      className={className}
      as="div"
      variant={variant}
    >
      <div
        className={`${styles['picker-img-wrapper']} ${imgClassName}`.trim()}
        data-aspect={aspect === 'backdrop' ? 'backdrop' : 'square'}
        data-blur={blur || undefined}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} />
        ) : (
          <div className={styles.placeholder}>{alt}</div>
        )}
      </div>
      {label && (
        <Text variant="small" color="secondary" truncate>
          {label}
        </Text>
      )}
    </SelectableCard>
  );
}

