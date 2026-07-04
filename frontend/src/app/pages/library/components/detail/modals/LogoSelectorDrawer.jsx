/* eslint-disable react/forbid-dom-props, react/jsx-no-literals */
import { createPortal } from 'react-dom';
import UniversalImagePickerModal from '../../../modals/UniversalImagePickerModal';

export default function LogoSelectorDrawer({
  isOpen,
  onClose,
  id,
  item,
  normalizedType,
  t,
  toast
}) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="entity-detail-page__drawer-backdrop ui-drawer-backdrop entity-detail-page__drawer-backdrop--transparent"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
      />
      <div className="entity-detail-page__drawer ui-drawer ui-drawer--md entity-detail-page__drawer--logo">
        <div className="entity-detail-page__drawer-header">
          <h3 className="entity-detail-page__drawer-title">
            {t('library.details.chooseLogo') || 'Choose Logo'}
          </h3>
          <button
            type="button"
            className="entity-detail-page__drawer-close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="entity-detail-page__drawer-content" style={{ padding: '24px' }}>
          <UniversalImagePickerModal
            entityId={id}
            tmdbId={item?.tmdb_id || item?.tv_tmdb_id}
            imageType="logo"
            entityType={normalizedType}
            currentPath={item?.logo_path}
            t={t}
            toast={toast}
            onClose={onClose}
            closeOnSelect={false}
            item={item}
          />
        </div>
      </div>
    </>,
    document.body
  );
}
