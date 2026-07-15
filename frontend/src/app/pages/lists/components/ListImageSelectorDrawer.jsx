import Button from '@/ui/Button';
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
      size="sm"
    >
      <div className={styles['list-image-selector-drawer-content']}>
        <ImageUploadPanel
          aspect="landscape"
          label={state.t('lists.upload_image_label') || 'Upload custom cover image'}
          isLoading={state.uploadImageMutation.isPending}
          onUploadFile={(file) => {
            state.uploadImageMutation.mutate(
              { listId: list.id, file },
              { onSuccess: onClose }
            );
          }}
        />
        {list?.custom_image_path && (
          <div className={styles['list-image-selector-drawer-reset-container']}>
            <Button
              variant="secondary-neutral"
              className={styles['list-image-selector-drawer-reset-btn']}
              onClick={() => {
                state.overrideImageMutation.mutate(
                  { listId: list.id, path: null },
                  { onSuccess: onClose }
                );
              }}
              disabled={state.overrideImageMutation.isPending || state.uploadImageMutation.isPending}
            >
              {state.t('lists.reset_to_default_collage') || 'Reset to Default Collage'}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
