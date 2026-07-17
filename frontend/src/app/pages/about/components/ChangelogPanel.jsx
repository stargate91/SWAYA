import { RefreshCw } from 'lucide-react';
import Card from '../../../ui/Card';
import baseStyles from '../AboutPage.module.css';
import styles from './ChangelogPanel.module.css';

export default function ChangelogPanel({
  t,
  isLoadingChangelog,
  changelogError,
  changelogContent
}) {
  return (
    <div className="about-tab-panel changelog-panel">
      <Card className={`${baseStyles['about-card']} changelog-card`}>
        <h2 className={baseStyles['about-section-title']}>{t('about.resources.changelog')}</h2>
        {isLoadingChangelog ? (
          <div className={styles['changelog-loading']}>
            <RefreshCw size={24} className={styles['changelog-spinner']} />
            <span>{t('common.loading')}</span>
          </div>
        ) : changelogError ? (
          <div className={styles['changelog-error']}>{changelogError}</div>
        ) : (
          <div className={styles['changelog-markdown']}>
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
                return <div key={index} className={styles['changelog-space']} />;
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
