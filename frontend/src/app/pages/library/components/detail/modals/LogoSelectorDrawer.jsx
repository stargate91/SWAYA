/* eslint-disable react/forbid-dom-props, react/jsx-no-literals */
import UniversalImagePickerModal from '../../../modals/UniversalImagePickerModal';
import Drawer from '@/ui/Drawer';

export default function LogoSelectorDrawer({
  isOpen,
  onClose,
  id,
  item,
  normalizedType,
  t,
  toast
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('library.details.chooseLogo') || 'Choose Logo'}
      size="md"
      className="entity-detail-page__drawer--logo"
    >
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
    </Drawer>
  );
}
