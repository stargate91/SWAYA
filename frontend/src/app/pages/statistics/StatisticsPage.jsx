import Page from '@/ui/Page';
import { useTranslation } from '@/providers/LanguageContext';
import StatisticsWidget from './StatisticsWidget';
import LibraryInsightsWidget from './LibraryInsightsWidget';
import './StatisticsPage.css';

export default function StatisticsPage() {
  const { t } = useTranslation();

  return (
    <Page
      title={t('sidebar.statistics') || 'Statistics'}
      description={t('statistics.description') || 'Visual overview and breakdown of your media library'}
      className="statistics-page-container"
    >
      <div className="statistics-page-content">
        <StatisticsWidget T={t} />
        <LibraryInsightsWidget T={t} />
      </div>
    </Page>
  );
}
