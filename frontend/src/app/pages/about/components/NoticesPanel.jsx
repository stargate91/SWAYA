import Card from '../../../ui/Card';

export default function NoticesPanel({ t, activeTab }) {
  if (activeTab === 'privacy') {
    return (
      <div className="about-tab-panel privacy-panel">
        <Card className="about-card privacy-card">
          <h2 className="about-section-title">{t('about.notices.privacy')}</h2>
          <p className="privacy-intro">{t('about.notices.privacy_intro')}</p>
          <ul className="privacy-list">
            <li>{t('about.notices.points.local_only')}</li>
            <li>{t('about.notices.points.api_keys')}</li>
            <li>{t('about.notices.points.network')}</li>
            <li>{t('about.notices.points.logs')}</li>
            <li>{t('about.notices.points.no_telemetry')}</li>
            <li>{t('about.notices.points.no_sharing')}</li>
          </ul>
        </Card>
      </div>
    );
  }

  if (activeTab === 'license') {
    return (
      <div className="about-tab-panel license-panel">
        <Card className="about-card license-card">
          <h2 className="about-section-title">{t('about.notices.license')}</h2>
          <p className="license-intro">{t('about.notices.license_intro')}</p>
          <div className="license-text-box">
            <p>{t('about.notices.license_body.p1')}</p>
            <p>{t('about.notices.license_body.p2')}</p>
            <p>{t('about.notices.license_body.p3')}</p>
            <p>{t('about.notices.license_body.p4')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
