import { RefreshCw } from 'lucide-react';
import Card from '../../../ui/Card';

export default function ChangelogPanel({
  t,
  isLoadingChangelog,
  changelogError,
  changelogContent
}) {
  return (
    <div className="about-tab-panel changelog-panel">
      <Card className="about-card changelog-card">
        <h2 className="about-section-title">{t('about.resources.changelog')}</h2>
        {isLoadingChangelog ? (
          <div className="changelog-loading">
            <RefreshCw size={24} className="changelog-spinner" />
            <span>{t('common.loading')}</span>
          </div>
        ) : changelogError ? (
          <div className="changelog-error">{changelogError}</div>
        ) : (
          <div className="changelog-markdown">
            {changelogContent.split(/\r?\n/).map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index}>{line.replace('# ', '')}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={index}>{line.replace('## ', '')}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={index}>{line.replace('### ', '')}</h3>;
              } else if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={index}>{line.substring(2)}</li>;
              } else if (line.trim() === '') {
                return <div key={index} className="changelog-space" />;
              } else {
                return <p key={index}>{line}</p>;
              }
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
