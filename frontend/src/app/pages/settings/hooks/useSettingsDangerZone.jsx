import { useCallback, useState } from 'react';
import { AlertTriangle } from '@/ui/icons';
import { useClearDatabaseMutation } from '@/queries';
import Button from '@/ui/Button';

export default function useSettingsDangerZone({
  t,
  toast,
  openModal,
  closeModal,
  onBeforeWipe,
}) {
  const clearDbMutation = useClearDatabaseMutation();
  const [isWiping, setIsWiping] = useState(false);
  const [isWipingCache, setIsWipingCache] = useState(false);

  const handleWipeDatabase = useCallback(() => {
    openModal({
      title: t('settingsPage.dangerZone.confirmTitle'),
      icon: AlertTriangle,
      variant: 'danger',
      content: (
        <p className="ui-modal__body-text">
          {t('settingsPage.dangerZone.confirm')}
        </p>
      ),
      footer: (
        <>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              closeModal();
              setIsWiping(true);

              try {
                onBeforeWipe?.();
                await clearDbMutation.mutateAsync({ wipe: true });
                toast(t('settingsPage.dangerZone.success'), 'success');
              } catch (error) {
                toast(error.message || t('settingsPage.dangerZone.failed'), 'danger');
              } finally {
                setIsWiping(false);
              }
            }}
          >
            {t('settingsPage.dangerZone.button')}
          </Button>
        </>
      ),
    });
  }, [clearDbMutation, closeModal, onBeforeWipe, openModal, t, toast]);

  const handleWipeCache = useCallback(() => {
    openModal({
      title: t('settingsPage.dangerZone.confirmWipeCacheTitle') || 'Clear Scraped Metadata Cache',
      icon: AlertTriangle,
      variant: 'danger',
      content: (
        <p className="ui-modal__body-text">
          {t('settingsPage.dangerZone.confirmWipeCache') || 'Are you sure you want to clear the entire scraped metadata cache? This will reset all match results but will keep your libraries, physical file records, manually saved overrides, and downloaded images.'}
        </p>
      ),
      footer: (
        <>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              closeModal();
              setIsWipingCache(true);

              try {
                await clearDbMutation.mutateAsync({ wipe_cache: true });
                toast(t('settingsPage.dangerZone.wipeCacheSuccess') || 'Metadata cache cleared successfully.', 'success');
              } catch (error) {
                toast(error.message || t('settingsPage.dangerZone.wipeCacheFailed') || 'Failed to clear metadata cache.', 'danger');
              } finally {
                setIsWipingCache(false);
              }
            }}
          >
            {t('settingsPage.dangerZone.buttonWipeCache') || 'Wipe Cache'}
          </Button>
        </>
      ),
    });
  }, [clearDbMutation, closeModal, openModal, t, toast]);

  return {
    isWiping,
    isWipingCache,
    handleWipeDatabase,
    handleWipeCache,
  };
}
