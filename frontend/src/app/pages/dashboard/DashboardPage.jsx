import { useSettingsQuery } from '@/queries/settingsQueries';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import Page from '@/ui/Page';
import Spinner from '@/ui/Spinner';
import DashboardView from './DashboardView';
import './DashboardPage.css';

export default function DashboardPage() {
  const { isLoading: isSettingsLoading } = useSettingsQuery();

  useScrollRestoration('.shell__content', [isSettingsLoading]);

  if (isSettingsLoading) {
    return (
      <Page className="dashboard-page">
        <div className="dashboard-loading">
          <Spinner />
        </div>
      </Page>
    );
  }

  return (
    <Page className="dashboard-page" contentBottom={false}>
      <div className="dashboard-container">
        <DashboardView />
      </div>
    </Page>
  );
}
