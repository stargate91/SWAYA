/* eslint-disable react-hooks/refs */
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import Button from '@/ui/Button';
import Hint from '@/ui/Hint';
import styles from '../SettingsPage.module.css';

export default function MaintenanceTab({
  t,
  isSaving,
  isWiping,
  isWipingCache,
  isScanActive,
  handleExportSettings,
  handleImportClick,
  handleImportSettings,
  handleWipeDatabase,
  handleWipeCache,
  formInputs
}) {
  return (
    <Stack gap="xl">
      <Card
        title={t('settingsPage.sections.backup.title')}
        eyebrow={t('settingsPage.sections.backup.eyebrow')}
      >
        <Stack>
          <Hint>
            {t('settingsPage.sections.backup.description')}
          </Hint>
          <Inline gap="md" justify="end" className={styles['action-row-right']}>
            <Button variant="secondary" onClick={handleExportSettings} disabled={isSaving}>
              {t('settingsPage.sections.backup.exportBtn')}
            </Button>
            <Button variant="secondary" onClick={handleImportClick} disabled={isSaving}>
              {t('settingsPage.sections.backup.importBtn')}
            </Button>
            <input
              type="file"
              ref={formInputs.backupFile}
              onChange={handleImportSettings}
              accept=".json"
              className={styles['hidden-input']}
            />
          </Inline>
        </Stack>
      </Card>

      <Card
        title={t('settingsPage.dangerZone.wipeCacheTitle')}
        eyebrow={t('settingsPage.dangerZone.eyebrow')}
        variant="danger"
        className={styles['danger-zone-card']}
      >
        <Stack>
          <Hint className={styles['danger-zone-card-hint']}>
            {t('settingsPage.dangerZone.wipeCacheDesc')}
          </Hint>
          <Inline justify="end" className={styles['danger-zone-card-actions']}>
            <Button variant="danger" onClick={handleWipeCache} disabled={isWipingCache || isSaving || isScanActive}>
              {isWipingCache ? t('settingsPage.dangerZone.wipeCacheWiping') : t('settingsPage.dangerZone.wipeCacheBtn')}
            </Button>
          </Inline>
        </Stack>
      </Card>

      <Card
        title={t('settingsPage.dangerZone.title')}
        eyebrow={t('settingsPage.dangerZone.eyebrow')}
        variant="danger"
        className={styles['danger-zone-card']}
      >
        <Stack>
          <Hint className={styles['danger-zone-card-hint']}>
            {t('settingsPage.dangerZone.desc')}
          </Hint>
          <Inline justify="end" className={styles['danger-zone-card-actions']}>
            <Button variant="danger" onClick={handleWipeDatabase} disabled={isWiping || isSaving || isScanActive}>
              {isWiping ? t('settingsPage.dangerZone.buttonWiping') : t('settingsPage.dangerZone.button')}
            </Button>
          </Inline>
        </Stack>
      </Card>
    </Stack>
  );
}
