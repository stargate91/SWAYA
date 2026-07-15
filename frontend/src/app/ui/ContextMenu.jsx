import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ContextMenu.module.css';

export default function ContextMenu({ x, y, onClose, items = [] }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('contextmenu', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
    };
  }, [onClose]);

  // Adjust positioning to stay within viewport bounds
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 8;
      }
      if (y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 8;
      }

      menuRef.current.style.setProperty('--context-menu-left', `${adjustedX}px`);
      menuRef.current.style.setProperty('--context-menu-top', `${adjustedY}px`);
    }
  }, [x, y]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={styles.menu}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={`div-${idx}`} className={styles.divider} />;
        }

        const Icon = item.icon;
        const itemClassName = `
          ${styles.item}
          ${item.className || ''}
          ${item.className?.includes('is-danger') ? styles['item--danger'] : ''}
        `.trim();

        return (
          <button
            key={item.key || idx}
            type="button"
            className={itemClassName}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            disabled={item.disabled}
          >
            {Icon && <Icon className={styles.icon} size={14} />}
            <span className={styles.label}>{item.label}</span>
            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
