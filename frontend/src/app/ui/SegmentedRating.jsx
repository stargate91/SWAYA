import useRatingHover from '@/pages/library/hooks/useRatingHover';
import './SegmentedRating.css';

export default function SegmentedRating({
  value,
  onChange,
  t,
  labelUnder = false,
  className = 'table-segmented-rating-container',
  barClassName = 'rating-segmented-bar',
  segmentClassName = 'rating-segment',
  segmentFillClassName = 'rating-segment-fill',
  labelClassName = 'user-rating-label',
  formatLabel,
}) {
  const {
    hoveredRating,
    displayRating,
    handleMouseMove,
    handleMouseLeave
  } = useRatingHover(value);

  const handleClick = (e) => {
    e.stopPropagation();
    if (hoveredRating !== null) {
      const isSame = value !== null && value !== undefined && Number(value) === Number(hoveredRating);
      const targetRating = isSame ? null : hoveredRating;
      onChange(targetRating);
    }
  };

  const renderLabel = () => {
    if (formatLabel) {
      return (
        <span className={`${labelClassName} ${displayRating !== undefined && displayRating !== null ? 'has-value' : ''}`}>
          {formatLabel(displayRating)}
        </span>
      );
    }

    if (labelUnder) {
      return (
        <span className={`user-rating-label-under ${displayRating !== undefined && displayRating !== null ? 'has-value' : ''}`}>
          {t('library.yourRating', { defaultValue: 'Your Rating' })}
          <span className="rating-value-bold">
            {displayRating !== undefined && displayRating !== null
              ? displayRating.toFixed(1)
              : '-.-'}
          </span>
        </span>
      );
    }

    return (
      <span className={`${labelClassName} ${displayRating !== undefined && displayRating !== null ? 'has-value' : ''}`}>
        {displayRating !== undefined && displayRating !== null
          ? displayRating.toFixed(1)
          : '-.-'}
      </span>
    );
  };

  return (
    <div className={`${className} ${labelUnder ? 'layout-column' : ''}`}>
      <div
        className={barClassName}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleClick}
        role="slider"
        tabIndex={0}
        aria-label={t('library.yourRating') || 'Your Rating'}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={displayRating ?? 0}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
          let fill = 0;
          if (displayRating >= val) {
            fill = 100;
          } else if (displayRating > val - 1) {
            fill = (displayRating - (val - 1)) * 100;
          }
          return (
            <div key={val} className={segmentClassName}>
              <div
                className={segmentFillClassName}
                // eslint-disable-next-line react/forbid-dom-props
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>
      {renderLabel()}
    </div>
  );
}

