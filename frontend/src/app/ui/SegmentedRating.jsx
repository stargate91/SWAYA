import PropTypes from 'prop-types';
import useRatingHover from '@/pages/library/hooks/useRatingHover';
import styles from './SegmentedRating.module.css';

export default function SegmentedRating({
  value,
  onChange = () => {},
  t,
  labelUnder = false,
  className = '',
  barClassName = '',
  segmentClassName = '',
  segmentFillClassName = '',
  labelClassName = '',
  formatLabel,
  readonly = false,
  showLabel = true,
}) {
  const {
    hoveredRating,
    displayRating,
    handleMouseMove,
    handleMouseLeave
  } = useRatingHover(readonly ? value : value);

  const handleClick = (e) => {
    e.stopPropagation();
    if (hoveredRating !== null) {
      const isSame = value !== null && value !== undefined && Number(value) === Number(hoveredRating);
      const targetRating = isSame ? null : hoveredRating;
      onChange(targetRating);
    }
  };

  const renderLabel = () => {
    const hasVal = displayRating !== undefined && displayRating !== null;
    const labelClass = `${styles.label} ${hasVal ? styles['has-value'] : ''} ${labelClassName}`.trim();

    if (formatLabel) {
      return (
        <span className={labelClass}>
          {formatLabel(displayRating)}
        </span>
      );
    }

    if (labelUnder) {
      return (
        <span className={`${styles['label-under']} ${hasVal ? styles['has-value'] : ''}`.trim()}>
          {t('library.yourRating', { defaultValue: 'Your Rating' })}
          <span className={styles['value-bold']}>
            {hasVal ? displayRating.toFixed(1) : '-.-'}
          </span>
        </span>
      );
    }

    return (
      <span className={labelClass}>
        {hasVal ? displayRating.toFixed(1) : '-.-'}
      </span>
    );
  };

  const containerClass = `${styles.container} ${labelUnder ? styles['layout-column'] : ''} ${className}`.trim();
  const barClass = `${styles.bar} ${barClassName}`.trim();
  const segmentClass = `${styles.segment} ${segmentClassName}`.trim();
  const segmentFillClass = `${styles.fill} ${segmentFillClassName}`.trim();

  const displayVal = readonly ? parseFloat(value) || 0 : displayRating;

  return (
    <div className={containerClass}>
      <div
        className={barClass}
        onMouseMove={readonly ? undefined : handleMouseMove}
        onMouseLeave={readonly ? undefined : handleMouseLeave}
        onMouseUp={readonly ? undefined : handleClick}
        role={readonly ? undefined : "slider"}
        tabIndex={readonly ? undefined : 0}
        aria-label={t('library.yourRating') || 'Your Rating'}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={displayVal}
        data-readonly={readonly || undefined}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
          let fill = 0;
          if (displayVal >= val) {
            fill = 100;
          } else if (displayVal > val - 1) {
            fill = (displayVal - (val - 1)) * 100;
          }
          return (
            <div key={val} className={segmentClass}>
              <div
                className={segmentFillClass}
                // eslint-disable-next-line react/forbid-dom-props
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>
      {showLabel && renderLabel()}
    </div>
  );
}

SegmentedRating.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  t: PropTypes.func.isRequired,
  labelUnder: PropTypes.bool,
  className: PropTypes.string,
  barClassName: PropTypes.string,
  segmentClassName: PropTypes.string,
  segmentFillClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  formatLabel: PropTypes.func,
  readonly: PropTypes.bool,
  showLabel: PropTypes.bool,
};

