/* eslint-disable react/forbid-dom-props, react/jsx-no-literals */
import { MediaDetailProvider } from '../MediaDetailContext';
import BackdropsPanel from '../panels/BackdropsPanel';
import Drawer from '@/ui/Drawer';

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
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('library.details.backdrops') || 'Choose Backdrop'}
      size="md"
      className="entity-detail-page__drawer--backdrop"
      variant="glass"
    >
      <div className="entity-detail-page__drawer-content" style={{ padding: '24px' }}>
        <MediaDetailProvider value={{ ...detailState, t, navigate, toast, type: normalizedType, id, onClose }}>
          <BackdropsPanel showTitle={false} />
        </MediaDetailProvider>
      </div>
    </Drawer>
  );
}
