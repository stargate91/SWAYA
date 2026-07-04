import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

const TOOLTIP_GAP = 10;

const getPosition = (rect, side) => {
  const centerX = rect.left + (rect.width / 2);
  const centerY = rect.top + (rect.height / 2);

  if (side === 'bottom') {
    return { left: centerX, top: rect.bottom + TOOLTIP_GAP };
  }

  if (side === 'left') {
    return { left: rect.left - TOOLTIP_GAP, top: centerY };
  }

  if (side === 'right') {
    return { left: rect.right + TOOLTIP_GAP, top: centerY };
  }

  return { left: centerX, top: rect.top - TOOLTIP_GAP };
};

const TOOLTIP_DELAYS = {
  instant: 0,
  fast: 250,
  normal: 600,
  slow: 1000,
};

let globalLastMouseDownTime = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('mousedown', () => {
    globalLastMouseDownTime = Date.now();
  }, true);
}

export default function Tooltip({
  content,
  className = '',
  side = 'top',
  delay = TOOLTIP_DELAYS.normal,
  children,
}) {
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);
  const tooltipId = useId();
  const tooltipRef = useRef(null);
  const isPointerInsideRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);

  const showTooltip = (source = 'pointer') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      if (source === 'pointer' && !isPointerInsideRef.current) return;
      if (source === 'focus' && !trigger.matches(':focus-within')) return;

      const rect = trigger.getBoundingClientRect();
      if (rect) {
        setPosition(getPosition(rect, side));
        setIsOpen(true);
      }
    }, delay);
  };

  const handleFocus = () => {
    // If focus was triggered by a mouse click (mousedown happened in the last 150ms),
    // do not show the tooltip.
    if (Date.now() - globalLastMouseDownTime < 150) {
      return;
    }
    requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      const activeElement = document.activeElement;
      if (
        trigger?.contains(activeElement)
        && activeElement?.matches?.(':focus-visible')
      ) {
        showTooltip('focus');
      }
    });
  };

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
    setPosition(null);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        hideTooltip();
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [content, hideTooltip]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleMouseLeaveWindow = () => {
      hideTooltip();
    };
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    window.addEventListener('blur', hideTooltip);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      window.removeEventListener('blur', hideTooltip);
    };
  }, [hideTooltip]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(getPosition(rect, side));
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, side]);

  useEffect(() => {
    if (!tooltipRef.current || !position) return;
    tooltipRef.current.style.setProperty('--tooltip-left', `${position.left}px`);
    tooltipRef.current.style.setProperty('--tooltip-top', `${position.top}px`);
  }, [position]);

  if (!content) return children;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <span
        ref={triggerRef}
        className="ui-tooltip"
        onMouseEnter={() => {
          isPointerInsideRef.current = true;
          showTooltip('pointer');
        }}
        onMouseLeave={() => {
          isPointerInsideRef.current = false;
          hideTooltip();
        }}
        onFocus={handleFocus}
        onBlur={hideTooltip}
        onMouseDown={() => {
          isPointerInsideRef.current = false;
          hideTooltip();
        }}
        aria-describedby={isOpen ? tooltipId : undefined}
      >
        {children}
      </span>
      {isOpen && position ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`ui-tooltip__content ui-tooltip__content--portal ${className}`.trim()}
          data-side={side}
        >
          {content}
        </span>,
        document.body,
      ) : null}
    </>
  );
}
