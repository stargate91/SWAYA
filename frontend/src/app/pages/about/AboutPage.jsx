import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../providers/LanguageContext';
import { shell } from '../../lib/electron';
import {
  Info,
  ScrollText,
  Lock,
  BookOpen,
  Mail,
  Globe,
  ArrowLeft,
  X,
  RefreshCw,
} from 'lucide-react';
import IconButton from '../../ui/IconButton';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import { fetchJson } from '../../lib/http';
import '../../styles/AboutPage.css';

const tmdbAttributionLogoSrc = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg';

const GitHubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M12 .5C5.649.5.5 5.649.5 12A11.5 11.5 0 0 0 8.36 22.08c.575.106.785-.25.785-.556 0-.274-.01-1-.016-1.963-3.184.692-3.855-1.534-3.855-1.534-.52-1.323-1.27-1.675-1.27-1.675-1.038-.71.078-.696.078-.696 1.148.08 1.752 1.178 1.752 1.178 1.02 1.75 2.675 1.245 3.327.952.104-.739.399-1.245.726-1.531-2.542-.289-5.215-1.271-5.215-5.657 0-1.249.446-2.271 1.176-3.071-.118-.289-.51-1.452.111-3.026 0 0 .96-.307 3.146 1.173A10.94 10.94 0 0 1 12 6.03c.977.004 1.962.132 2.882.389 2.184-1.48 3.143-1.173 3.143-1.173.623 1.574.231 2.737.113 3.026.732.8 1.175 1.822 1.175 3.07 0 4.397-2.678 5.365-5.228 5.649.41.353.775 1.05.775 2.117 0 1.529-.014 2.762-.014 3.138 0 .31.207.668.79.555A11.503 11.503 0 0 0 23.5 12C23.5 5.649 18.351.5 12 .5Z" />
  </svg>
);

const DiscordIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path
      d="M20.317 4.37A19.791 19.791 0 0 0 15.429 3a13.915 13.915 0 0 0-.625 1.29 18.27 18.27 0 0 0-5.608 0A13.935 13.935 0 0 0 8.57 3a19.736 19.736 0 0 0-4.89 1.372C.587 9.04-.252 13.59.167 18.075a19.9 19.9 0 0 0 5.993 2.925 14.312 14.312 0 0 0 1.282-2.11 12.944 12.944 0 0 1-2.014-.98c.17-.124.337-.254.498-.388 3.885 1.824 8.101 1.824 11.94 0 .163.134.33.264.5.388a12.88 12.88 0 0 1-2.016.982A14.218 14.218 0 0 0 17.632 21a19.857 19.857 0 0 0 5.995-2.925c.492-5.195-.84-9.705-3.31-13.705ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.156 2.418 0 1.334-.955 2.419-2.156 2.419Zm7.96 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.177 1.095 2.157 2.418 0 1.334-.947 2.419-2.157 2.419Z"
      fill="currentColor"
    />
  </svg>
);

function openExternalLink(url) {
  if (shell) {
    shell.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export default function AboutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [changelogContent, setChangelogContent] = useState('');
  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false);
  const [changelogError, setChangelogError] = useState(null);
  const [hasLoadedChangelog, setHasLoadedChangelog] = useState(false);

  const handleClose = () => {
    navigate(-1);
  };

  useEffect(() => {
    if (activeTab === 'changelog' && !hasLoadedChangelog && !isLoadingChangelog) {
      setIsLoadingChangelog(true);
      setChangelogError(null);
      fetchJson('/api/settings/changelog')
        .then((data) => {
          if (data.status === 'success') {
            setChangelogContent(data.content || '');
            setHasLoadedChangelog(true);
          } else {
            throw new Error(data.message || 'Failed to load changelog');
          }
        })
        .catch((err) => {
          setChangelogError(err.message || 'Failed to load changelog');
          setHasLoadedChangelog(true);
        })
        .finally(() => {
          setIsLoadingChangelog(false);
        });
    }
  }, [activeTab, hasLoadedChangelog, isLoadingChangelog]);

  const tabs = [
    { id: 'info', label: t('about.title'), icon: <Info size={18} /> },
    { id: 'changelog', label: t('about.resources.changelog'), icon: <ScrollText size={18} /> },
    { id: 'privacy', label: t('about.notices.privacy'), icon: <Lock size={18} /> },
    { id: 'license', label: t('about.notices.license'), icon: <ScrollText size={18} /> },
    { id: 'third_party', label: t('about.notices.third_party'), icon: <BookOpen size={18} /> },
  ];

  const appInfo = {
    name: 'Swaya',
    version: '0.1.0',
    developer: {
      name: 'Levi',
      email: 'levi@swaya.io',
      website: 'https://swaya.io',
      github: 'https://github.com/stargate91/SWAYA',
      discordServer: 'https://discord.gg/swaya',
    },
  };

  const developerLinks = [
    { href: `mailto:${appInfo.developer.email}`, icon: <Mail size={16} />, label: t('about.links.email') },
    { href: appInfo.developer.website, icon: <Globe size={16} />, label: t('about.links.website') },
    { href: appInfo.developer.github, icon: <GitHubIcon size={16} />, label: t('about.links.github') },
    { href: appInfo.developer.discordServer, icon: <DiscordIcon size={16} />, label: t('about.links.discord_server') },
  ];

  return (
    <div className="settings-overlay">
      <aside className="settings-sidebar">
        <h1 className="settings-sidebar-header">{t('about.title')}</h1>
        <nav className="settings-sidebar-menu">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`settings-sidebar-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span className="settings-sidebar-label">{tab.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="settings-content-wrapper">
        <div className="settings-close-container">
          <IconButton
            className="settings-close-btn"
            onClick={handleClose}
            label={t('common.close')}
            title={null}
            size="md"
          >
            <X size={18} />
          </IconButton>
        </div>

        <div className="settings-content">
          <div className="settings-tab-content">
            {activeTab === 'info' && (
              <div className="about-tab-panel info-panel">
                <div className="about-app-brand-card">
                  <div className="about-app-logo">S</div>
                  <div className="about-app-details">
                    <div className="about-app-name-row">
                      <span className="about-app-title">SWAYA</span>
                      <span className="about-app-version">v{appInfo.version}</span>
                    </div>
                    <p className="about-app-description">{t('about.subtitle') || 'Organize, enrich, and keep your media library clean.'}</p>
                  </div>
                </div>

                <div className="about-single-layout">
                  <div className="about-column">
                    <div className="about-section-header">
                      <h3>Developer</h3>
                      <p>Reach out directly if you want to report bugs, collaborate, or share feedback.</p>
                    </div>
                    <div className="developer-profile-card">
                      <div className="developer-avatar">L</div>
                      <div className="developer-info">
                        <span className="developer-name">Levente Gáll</span>
                        <span className="developer-email">leventegall@proton.me</span>
                      </div>
                    </div>
                    <div className="developer-links-grid">
                      <a href="mailto:leventegall@proton.me" className="about-action-btn" onClick={(e) => { e.preventDefault(); openExternalLink('mailto:leventegall@proton.me'); }}>
                        <Mail size={16} />
                        <span>Email</span>
                      </a>
                      <a href="https://swaya.io" className="about-action-btn" onClick={(e) => { e.preventDefault(); openExternalLink('https://swaya.io'); }}>
                        <Globe size={16} />
                        <span>Website</span>
                      </a>
                      <a href="https://github.com/stargate91/SWAYA" className="about-action-btn" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/stargate91/SWAYA'); }}>
                        <GitHubIcon size={16} />
                        <span>GitHub</span>
                      </a>
                      <a href="https://discord.gg/swaya" className="about-action-btn" onClick={(e) => { e.preventDefault(); openExternalLink('https://discord.gg/swaya'); }}>
                        <DiscordIcon size={16} />
                        <span>Discord Server</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'changelog' && (
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
            )}

            {activeTab === 'privacy' && (
              <div className="about-tab-panel privacy-panel">
                <Card className="about-card privacy-card">
                  <h2 className="about-section-title">{t('about.notices.privacy')}</h2>
                  <p className="privacy-intro">{t('about.notices.privacy_intro')}</p>
                  <ul className="privacy-list">
                    <li>{t('about.notices.points.local_only')}</li>
                    <li>{t('about.notices.points.api_keys')}</li>
                    <li>{t('about.notices.points.network')}</li>
                    <li>{t('about.notices.points.logs')}</li>
                  </ul>
                </Card>
              </div>
            )}

            {activeTab === 'license' && (
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
            )}

            {activeTab === 'third_party' && (
              <div className="about-tab-panel third-party-panel">
                <Card className="about-card third-party-card">
                  <h2 className="about-section-title">{t('about.notices.third_party')}</h2>
                  <p className="third-party-intro">{t('about.notices.third_party_intro')}</p>
                  <ul className="third-party-list">
                    <li>{t('about.notices.third_party_points.ui')}</li>
                    <li>{t('about.notices.third_party_points.backend')}</li>
                    <li>{t('about.notices.third_party_points.media')}</li>
                    <li>{t('about.notices.third_party_points.metadata')}</li>
                  </ul>

                  <div className="tmdb-attribution-box">
                    <img
                      src={tmdbAttributionLogoSrc}
                      alt="TMDb Logo"
                      className="tmdb-attribution-logo"
                    />
                    <div className="tmdb-attribution-text">
                      <h3>{t('about.notices.third_party_highlight.tmdb_title')}</h3>
                      <p>{t('about.notices.third_party_highlight.tmdb_body')}</p>
                    </div>
                  </div>

                  <div className="special-thanks-section">
                    <h3 className="special-thanks-title">{t('about.notices.special_thanks_title')}</h3>
                    <p className="special-thanks-intro">{t('about.notices.special_thanks_intro')}</p>
                    <div className="special-thanks-grid">
                      <div className="thanks-item">
                        <span className="thanks-name">Silur</span>
                        <div className="thanks-links">
                          <a href="https://github.com/Silur" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/Silur'); }}>
                            <GitHubIcon size={12} />
                            <span>GitHub</span>
                          </a>
                        </div>
                      </div>
                      <div className="thanks-item">
                        <span className="thanks-name">Kerrigan</span>
                        <div className="thanks-links">
                          <a href="https://github.com/rasztasd" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/rasztasd'); }}>
                            <GitHubIcon size={12} />
                            <span>GitHub 1</span>
                          </a>
                          <span className="thanks-divider">•</span>
                          <a href="https://github.com/danielmcallisterSG" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/danielmcallisterSG'); }}>
                            <GitHubIcon size={12} />
                            <span>GitHub 2</span>
                          </a>
                        </div>
                      </div>
                      <div className="thanks-item">
                        <span className="thanks-name">YaShock</span>
                        <div className="thanks-links">
                          <a href="https://github.com/YaShock" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/YaShock'); }}>
                            <GitHubIcon size={12} />
                            <span>GitHub</span>
                          </a>
                        </div>
                      </div>
                      <div className="thanks-item">
                        <span className="thanks-name">Data</span>
                        <div className="thanks-links">
                          <a href="https://github.com/adamgyongyosi" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/adamgyongyosi'); }}>
                            <GitHubIcon size={12} />
                            <span>GitHub</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="third-party-thanks">{t('about.notices.third_party_thanks')}</p>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
