import { useState, useRef, useEffect, useCallback, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './Popover.module.css';

export default function Popover({
  trigger,
  children,
  align = 'right',
  width,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpwards: false });

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const threshold = 320;
      const openUpwards = spaceBelow < threshold && rect.top > spaceBelow;

      const top = openUpwards
        ? rect.top + window.scrollY - 8
        : rect.bottom + window.scrollY + 8;

      let left = rect.left + window.scrollX;
      if (align === 'right') {
        left = rect.right + window.scrollX;
      }

      setCoords({ top, left, openUpwards });
    }
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        (triggerRef.current && triggerRef.current.contains(event.target)) ||
        (popoverRef.current && popoverRef.current.contains(event.target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {cloneElement(trigger, {
        ref: triggerRef,
        onClick: (e) => {
          if (trigger.props.onClick) trigger.props.onClick(e);
          handleToggle(e);
        },
        'aria-expanded': isOpen,
      })}

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className={`${styles.popover} ${align === 'right' ? styles['align-right'] : styles['align-left']} ${coords.openUpwards ? styles['is-upwards'] : ''}`}
          onWheel={(e) => e.stopPropagation()}
          // eslint-disable-next-line react/forbid-dom-props
          style={{
            '--popover-top': `${coords.top}px`,
            '--popover-left': `${coords.left}px`,
            '--popover-width': width || undefined,
          }}
        >
          {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
        </div>,
        document.body
      )}
    </>
  );
}

Popover.propTypes = {
  trigger: PropTypes.element.isRequired,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  align: PropTypes.oneOf(['left', 'right']),
  width: PropTypes.string,
};
