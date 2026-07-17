import Card from '../../../ui/Card';
import baseStyles from '../AboutPage.module.css';
import styles from './ThirdPartyPanel.module.css';
import {
  SILUR_NAME,
  KERRIGAN_NAME,
  YASHOCK_NAME,
  DATA_NAME,
  GITHUB_LABEL,
  GITHUB_1_LABEL,
  GITHUB_2_LABEL,
  BULLET_SEP,
  GitHubIcon,
  tmdbAttributionLogoSrc,
  openExternalLink
} from '../utils/aboutHelpers';

export default function ThirdPartyPanel({ t }) {
  return (
    <div className="about-tab-panel third-party-panel">
      <Card className={`${baseStyles['about-card']} third-party-card`}>
        <h2 className={baseStyles['about-section-title']}>{t('about.notices.third_party')}</h2>
        <p className={styles['third-party-intro']}>{t('about.notices.third_party_intro')}</p>
        <ul className={styles['third-party-list']}>
          <li>{t('about.notices.third_party_points.ui')}</li>
          <li>{t('about.notices.third_party_points.backend')}</li>
          <li>{t('about.notices.third_party_points.media')}</li>
          <li>{t('about.notices.third_party_points.metadata')}</li>
        </ul>

        <div className={styles['tmdb-attribution-box']}>
          <img
            src={tmdbAttributionLogoSrc}
            alt="TMDb Logo"
            className={styles['tmdb-attribution-logo']}
          />
          <div className={styles['tmdb-attribution-text']}>
            <h3>{t('about.notices.third_party_highlight.tmdb_title')}</h3>
            <p>{t('about.notices.third_party_highlight.tmdb_body')}</p>
          </div>
        </div>

        <div className={styles['special-thanks-section']}>
          <h3 className={styles['special-thanks-title']}>{t('about.notices.special_thanks_title')}</h3>
          <p className={styles['special-thanks-intro']}>{t('about.notices.special_thanks_intro')}</p>
          <div className={styles['special-thanks-grid']}>
            <div className={styles['thanks-item']}>
              <span className={styles['thanks-name']}>{SILUR_NAME}</span>
              <div className={styles['thanks-links']}>
                <a href="https://github.com/Silur" className={styles['thanks-link']} onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/Silur'); }}>
                  <GitHubIcon size={12} />
                  <span>{GITHUB_LABEL}</span>
                </a>
              </div>
            </div>
            <div className={styles['thanks-item']}>
              <span className={styles['thanks-name']}>{KERRIGAN_NAME}</span>
              <div className={styles['thanks-links']}>
                <a href="https://github.com/rasztasd" className={styles['thanks-link']} onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/rasztasd'); }}>
                  <GitHubIcon size={12} />
                  <span>{GITHUB_1_LABEL}</span>
                </a>
                <span className={styles['thanks-divider']}>{BULLET_SEP}</span>
                <a href="https://github.com/danielmcallisterSG" className={styles['thanks-link']} onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/danielmcallisterSG'); }}>
                  <GitHubIcon size={12} />
                  <span>{GITHUB_2_LABEL}</span>
                </a>
              </div>
            </div>
            <div className={styles['thanks-item']}>
              <span className={styles['thanks-name']}>{YASHOCK_NAME}</span>
              <div className={styles['thanks-links']}>
                <a href="https://github.com/YaShock" className={styles['thanks-link']} onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/YaShock'); }}>
                  <GitHubIcon size={12} />
                  <span>{GITHUB_LABEL}</span>
                </a>
              </div>
            </div>
            <div className={styles['thanks-item']}>
              <span className={styles['thanks-name']}>{DATA_NAME}</span>
              <div className={styles['thanks-links']}>
                <a href="https://github.com/adamgyongyosi" className={styles['thanks-link']} onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/adamgyongyosi'); }}>
                  <GitHubIcon size={12} />
                  <span>{GITHUB_LABEL}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className={styles['third-party-thanks']}>{t('about.notices.third_party_thanks')}</p>
      </Card>
    </div>
  );
}
