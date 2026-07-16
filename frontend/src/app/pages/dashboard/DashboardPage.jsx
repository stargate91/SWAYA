import { useSettingsQuery } from '@/queries/settingsQueries';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import Page from '@/ui/Page';
import DashboardView from './DashboardView';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { isLoading: isSettingsLoading } = useSettingsQuery();

  useScrollRestoration('.shell__content', [isSettingsLoading]);

  return (
    <Page className={styles['dashboard-page']} contentBottom={false}>
      <div className={styles['dashboard-container']}>
        <DashboardView />
      </div>
    </Page>
  );
}
