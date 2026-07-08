/* eslint-disable react/forbid-dom-props, react/jsx-no-literals */
import UniversalImagePickerModal from '../../../modals/UniversalImagePickerModal';
import Drawer from '@/ui/Drawer';

export default function PosterSelectorDrawer({
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
      title={t('library.details.choosePoster') || 'Choose Poster'}
      size="md"
      className="entity-detail-page__drawer--poster"
    >
      <div className="entity-detail-page__drawer-content" style={{ padding: '24px' }}>
        <UniversalImagePickerModal
          entityId={id}
          tmdbId={item?.tmdb_id || item?.tv_tmdb_id}
          imageType="poster"
          entityType={normalizedType}
          currentPath={item?.poster_path}
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
