import ImageUploadPanel from '@/ui/ImageUploadPanel';
import Drawer from '@/ui/Drawer';
import styles from './ListImageSelectorDrawer.module.css';

export default function ListImageSelectorDrawer({
  isOpen,
  onClose,
  list,
  state,
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={state.t('lists.edit_image_title') || 'Edit List Image'}
      size="md"
      className="entity-detail-page__drawer--poster"
    >
      <div className={`entity-detail-page__drawer-content ${styles['list-image-selector-drawer-content']}`}>
        <ImageUploadPanel
          imageType="square"
          isPending={state.uploadImageMutation.isPending || state.overrideImageMutation.isPending}
          t={state.t}
          onSaveUrl={(url) => {
            state.overrideImageMutation.mutate(
              { listId: list.id, path: url },
              { onSuccess: onClose }
            );
          }}
          onUploadFile={(file) => {
            state.uploadImageMutation.mutate(
              { listId: list.id, file },
              { onSuccess: onClose }
            );
          }}
        />
        {list?.custom_image_path && (
          <div className={styles['list-image-selector-drawer-reset-container']}>
            <button
              type="button"
              className={`ui-button ui-button--secondary-neutral ui-button--md ${styles['list-image-selector-drawer-reset-btn']}`}
              onClick={() => {
                state.overrideImageMutation.mutate(
                  { listId: list.id, path: null },
                  { onSuccess: onClose }
                );
              }}
              disabled={state.overrideImageMutation.isPending || state.uploadImageMutation.isPending}
            >
              {state.t('lists.reset_to_default_collage') || 'Reset to Default Collage'}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
