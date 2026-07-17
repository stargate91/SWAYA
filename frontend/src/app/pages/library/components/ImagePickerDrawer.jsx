import Drawer from '@/ui/Drawer';
import UniversalImagePicker from './UniversalImagePicker';

export default function ImagePickerDrawer({
  isOpen,
  onClose,
  title,
  className = 'entity-detail-page__drawer--poster',
  entityId,
  tmdbId,
  imageType,
  entityType,
  currentPath,
  t,
  toast,
  externalIds,
  item,
  closeOnSelect = false,
  onClosePicker,
  variant = 'glass',
  children,
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      className={className}
      variant={variant}
    >
      {isOpen && (
        <div className="entity-detail-page__drawer-content">
          {children || (
            <UniversalImagePicker
              key={`${entityId}-${imageType}`}
              entityId={entityId}
              tmdbId={tmdbId}
              imageType={imageType}
              entityType={entityType}
              currentPath={currentPath}
              t={t}
              toast={toast}
              externalIds={externalIds}
              item={item}
              closeOnSelect={closeOnSelect}
              onClose={() => {
                if (closeOnSelect) {
                  onClose();
                }
                onClosePicker?.();
              }}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}
