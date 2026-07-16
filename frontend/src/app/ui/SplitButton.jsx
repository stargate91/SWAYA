import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { ChevronDown } from './icons';
import styles from './SplitButton.module.css';

/**
 * SplitButton provides a primary action button and an arrow button to open a dropdown options menu.
 *
 * @param {object} props
 * @param {string} props.label - Label of primary action button
 * @param {() => void} props.onClick - Click event for primary action
 * @param {Array<{label: string, onClick: () => void}>} [props.options] - Options array
 * @param {'primary' | 'secondary'} [props.variant] - SplitButton styling variant
 * @param {'sm' | 'md'} [props.size] - SplitButton sizing
 * @param {boolean} [props.disabled] - Disabled state
 * @param {string} [props.className] - Additional custom class names
 */
export default function SplitButton({
  label,
  onClick,
  options = [],
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateMenuCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateMenuCoords();
      window.addEventListener('scroll', updateMenuCoords, true);
      window.addEventListener('resize', updateMenuCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateMenuCoords, true);
      window.removeEventListener('resize', updateMenuCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (event.target.closest(`.${styles['split-button-menu']}`)) return;
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      data-variant={variant}
      data-size={size}
      data-disabled={disabled}
      className={`${styles['split-button']} ui-split-button ${className}`.trim()}
      ref={containerRef}
    >
      <Button
        variant={variant}
        size={size}
        className={`${styles['split-button-action']} ui-split-button__action`}
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </Button>
      <button
        type="button"
        className={`${styles['split-button-arrow']} ui-split-button__arrow`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
      >
        <ChevronDown size={size === 'sm' ? 12 : 14} />
      </button>
      {isOpen && createPortal(
        <div
          className={`${styles['split-button-menu']} ui-split-button__menu`}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
          // eslint-disable-next-line react/forbid-dom-props
          style={{
            position: 'absolute',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            minWidth: `${menuCoords.width}px`,
          }}
        >
          {options.map((opt, index) => (
            <button
              key={index}
              type="button"
              className={`${styles['split-button-menu-item']} ui-split-button__menu-item`}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                opt.onClick?.();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
