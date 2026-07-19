import { useSettingsQuery } from '@/queries/settingsQueries';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import Page from '@/ui/Page';
import DashboardView from './DashboardView';

export default function DashboardPage() {
  const { isLoading: isSettingsLoading } = useSettingsQuery();

  useScrollRestoration('.shell__content', [isSettingsLoading]);

  return (
    <Page>
      <DashboardView />
    </Page>
  );
}
