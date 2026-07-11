import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X } from '@/ui/icons';
import { useTranslation } from '../providers/LanguageContext';
import IconButton from './IconButton';
import './Drawer.css';

export default function Drawer({
  isOpen,
  onClose,
  title,
  size = 'md',
  className = '',
  style = {},
  variant = 'default',
  hasBackdrop,
  children,
}) {
  const { t } = useTranslation();

  const actualHasBackdrop = hasBackdrop !== undefined ? hasBackdrop : (variant !== 'glass');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || actualHasBackdrop) return;
    const handleDocumentClick = (e) => {
      const drawerEl = document.querySelector('.ui-drawer');
      if (drawerEl && !drawerEl.contains(e.target) && document.body.contains(e.target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isOpen, actualHasBackdrop, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {actualHasBackdrop && (
        <div
          className="ui-drawer-backdrop"
          onClick={onClose}
          role="presentation"
        />
      )}
      <div
        className={`ui-drawer ui-drawer--${size} ui-drawer--${variant} ${className}`.trim()}
        // eslint-disable-next-line react/forbid-dom-props
        style={style}
        role="dialog"
        aria-modal="true"
      >
        <div className="ui-drawer__header">
          {title && <h3 className="ui-drawer__title">{title}</h3>}
          <IconButton
            type="button"
            variant="close"
            onClick={onClose}
            label={t('common.close') || 'Close'}
            title={null}
            size="sm"
            wrapped={true}
            wrapperHoverOnly={true}
          >
            <X size={18} />
          </IconButton>
        </div>
        <div className="ui-drawer__content">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

Drawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', '720']),
  className: PropTypes.string,
  style: PropTypes.object,
  variant: PropTypes.oneOf(['default', 'glass', 'contrast']),
  hasBackdrop: PropTypes.bool,
  children: PropTypes.node,
};
