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
  children,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="ui-drawer-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`ui-drawer ui-drawer--${size} ${className}`.trim()}
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
  children: PropTypes.node,
};
