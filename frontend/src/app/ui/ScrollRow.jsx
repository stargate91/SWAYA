import { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import './ScrollRow.css';

export default function ScrollRow({
  children,
  className = '',
  showArrows = true,
  enableWheelScroll = false,
}) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

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
    const el = scrollRef.current;
    if (!el) return;

    window.addEventListener('resize', updateArrows);

    let handleWheel = null;
    if (enableWheelScroll) {
      handleWheel = (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY * 4;
      };
      el.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('resize', updateArrows);
      if (handleWheel) {
        el.removeEventListener('wheel', handleWheel);
      }
    };
  }, [updateArrows, enableWheelScroll]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="ui-scroll-row-container">
      {showArrows && showLeft && (
        <button
          type="button"
          className="ui-carousel-arrow is-left"
          onClick={() => scroll('left')}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {showArrows && showRight && (
        <button
          type="button"
          className="ui-carousel-arrow is-right"
          onClick={() => scroll('right')}
        >
          <ChevronRight size={20} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className={`ui-scroll-row-track no-scrollbar ${className}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}

ScrollRow.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  showArrows: PropTypes.bool,
  enableWheelScroll: PropTypes.bool,
};
