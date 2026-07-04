/* eslint-disable react/forbid-dom-props, react/jsx-no-literals, i18next/no-literal-string */
import { createPortal } from 'react-dom';
import { MediaDetailProvider } from '../MediaDetailContext';
import BackdropsPanel from '../panels/BackdropsPanel';

export default function BackdropSelectorDrawer({
  isOpen,
  onClose,
  id,
  normalizedType,
  detailState,
  t,
  navigate,
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
      <div className="entity-detail-page__drawer ui-drawer ui-drawer--md entity-detail-page__drawer--backdrop">
        <div className="entity-detail-page__drawer-header">
          <h3 className="entity-detail-page__drawer-title">
            {t('library.details.backdrops') || 'Choose Backdrop'}
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
          <MediaDetailProvider value={{ ...detailState, t, navigate, toast, type: normalizedType, id, onClose }}>
            <BackdropsPanel showTitle={false} />
          </MediaDetailProvider>
        </div>
      </div>
    </>,
    document.body
  );
}
