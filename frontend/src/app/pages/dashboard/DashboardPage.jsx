import { useSettingsQuery } from '@/queries/settingsQueries';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import Page from '@/ui/Page';
import Spinner from '@/ui/Spinner';
import DashboardView from './DashboardView';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { isLoading: isSettingsLoading } = useSettingsQuery();

  useScrollRestoration('.shell__content', [isSettingsLoading]);

  if (isSettingsLoading) {
    return (
      <Page className={`dashboard-page ${styles['dashboard-page']}`}>
        <div className={styles['dashboard-loading']}>
          <Spinner />
        </div>
      </Page>
    );
  }

  return (
    <Page className={`dashboard-page ${styles['dashboard-page']}`} contentBottom={false}>
      <div className={styles['dashboard-container']}>
        <DashboardView />
      </div>
    </Page>
  );
}
