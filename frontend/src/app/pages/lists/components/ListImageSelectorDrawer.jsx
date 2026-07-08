import ImageUploadPanel from '../../library/modals/ImageUploadPanel';
import Drawer from '@/ui/Drawer';

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
      <div className="entity-detail-page__drawer-content" style={{ padding: '24px' }}>
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
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="ui-button ui-button--secondary-neutral ui-button--md"
              style={{ width: '100%', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'var(--color-text-muted)' }}
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
