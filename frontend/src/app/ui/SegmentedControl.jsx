import { useEffect, useRef, useState } from 'react';
import styles from './SegmentedControl.module.css';

export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  variant = 'default',
  size = variant === 'filter' ? 'xs' : 'md',
  roundness,
  animated = false,
  className = '',
  ...props
}) {
  const containerRef = useRef(null);
  const activeOptionRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  useEffect(() => {
    if (animated && activeOptionRef.current) {
      const { offsetLeft, offsetWidth } = activeOptionRef.current;
      setIndicatorStyle({
        '--active-offset': `${offsetLeft}px`,
        '--active-width': `${offsetWidth}px`,
      });
    }
  }, [value, options, animated]);

  const variantClass = variant === 'filter'
    ? styles['variant-filter']
    : variant === 'glass'
      ? styles['variant-glass']
      : styles['variant-default'];
  
  const sizeClassMap = {
    xs: styles['size-xs'],
    sm: styles['size-sm'],
    md: styles['size-md'],
    lg: styles['size-lg'],
  };
  const sizeClass = sizeClassMap[size] || styles['size-md'];

  const roundnessClassMap = {
    full: styles['roundness-full'],
    md: styles['roundness-md'],
    sm: styles['roundness-sm'],
    none: styles['roundness-none'],
  };
  const roundnessClass = roundness ? (roundnessClassMap[roundness] || '') : '';

  const containerClass = `${styles.container} ${variantClass} ${sizeClass} ${roundnessClass} ${animated ? styles.animated : ''} ${className}`.trim();

  return (
    <div
      ref={containerRef}
      className={containerClass}
      role="tablist"
      aria-label={ariaLabel}
      // eslint-disable-next-line react/forbid-dom-props
      style={indicatorStyle}
      {...props}
    >
      {animated && <div className={styles.indicator} />}
      {options.map((option) => {
        const isActive = value === option.value;
        const isDisabled = Boolean(option.disabled);
        const optionClass = `${styles.option} ${isActive ? styles['is-active'] : ''} ${isDisabled ? styles['is-disabled'] : ''}`.trim();
        return (
          <button
            ref={isActive ? activeOptionRef : undefined}
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className={optionClass}
            onClick={() => !isDisabled && onChange(option.value)}
            disabled={isDisabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
