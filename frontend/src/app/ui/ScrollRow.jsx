import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import styles from './ScrollRow.module.css';

const ScrollRow = forwardRef(({
  children,
  className = '',
  containerClassName = '',
  showArrows = true,
  enableWheelScroll = false,
  arrowsLayout = 'overlay', // 'overlay' | 'column'
  size = 'default', // 'default' | 'sm'
  onScroll,
}, ref) => {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useImperativeHandle(ref, () => scrollRef.current);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    updateArrows();
  }, [children, updateArrows]);

  useEffect(() => {
    const container = containerRef.current;
    const el = scrollRef.current;
    if (!container || !el) return;

    window.addEventListener('resize', updateArrows);

    let handleWheel = null;
    if (enableWheelScroll) {
      handleWheel = (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY * 3;
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('resize', updateArrows);
      if (handleWheel) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [updateArrows, enableWheelScroll]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const containerClass = `
    ${styles.container}
    ${styles[`container--layout-${arrowsLayout}`]}
    ${styles[`container--size-${size}`]}
    ${containerClassName}
  `.trim();

  const leftHidden = !showLeft || !showArrows;
  const rightHidden = !showRight || !showArrows;
  const arrowIconSize = size === 'sm' ? 12 : 20;

  return (
    <div ref={containerRef} className={containerClass}>
      {showArrows && (
        <button
          type="button"
          className={`ui-carousel-arrow ${styles.arrow} ${styles['is-left']} ${leftHidden ? styles['is-hidden'] : ''}`.trim()}
          onClick={() => scroll('left')}
        >
          <ChevronLeft size={arrowIconSize} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={(e) => {
          updateArrows();
          onScroll?.(e);
        }}
        className={`${styles.track} no-scrollbar ${className}`.trim()}
      >
        {children}
      </div>

      {showArrows && (
        <button
          type="button"
          className={`ui-carousel-arrow ${styles.arrow} ${styles['is-right']} ${rightHidden ? styles['is-hidden'] : ''}`.trim()}
          onClick={() => scroll('right')}
        >
          <ChevronRight size={arrowIconSize} />
        </button>
      )}
    </div>
  );
});

ScrollRow.displayName = 'ScrollRow';

ScrollRow.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  showArrows: PropTypes.bool,
  enableWheelScroll: PropTypes.bool,
  arrowsLayout: PropTypes.oneOf(['overlay', 'column']),
  size: PropTypes.oneOf(['default', 'sm']),
  onScroll: PropTypes.func,
};

export default ScrollRow;
