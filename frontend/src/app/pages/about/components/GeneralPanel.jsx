import { Mail, Globe } from 'lucide-react';
import {
  LOGO_LETTER,
  APP_TITLE_TEXT,
  VERSION_CHAR,
  DEV_AVATAR_LETTER,
  GitHubIcon,
  DiscordIcon,
  openExternalLink
} from '../utils/aboutHelpers';

export default function GeneralPanel({ t, appInfo }) {
  return (
    <div className="about-tab-panel info-panel">
      <div className="about-app-brand-card">
        <div className="about-app-logo">{LOGO_LETTER}</div>
        <div className="about-app-details">
          <div className="about-app-name-row">
            <span className="about-app-title">{APP_TITLE_TEXT}</span>
            <span className="about-app-version">{VERSION_CHAR}{appInfo.version}</span>
          </div>
          <p className="about-app-description">{t('about.subtitle') || 'Organize, enrich, and keep your media library clean.'}</p>
        </div>
      </div>

      <div className="about-single-layout">
        <div className="about-column">
          <div className="about-section-header">
            <h3>{t('about.app_info.developer') || 'Developer'}</h3>
            <p>{t('about.app_info.developer_intro') || 'Reach out directly if you want to report bugs, collaborate, or share feedback.'}</p>
          </div>
          <div className="developer-profile-card">
            <div className="developer-avatar">{DEV_AVATAR_LETTER}</div>
            <div className="developer-info">
              <span className="developer-name">{t('about.app_info.developer_name') || 'Levente Gáll'}</span>
              <span className="developer-email">{t('about.app_info.developer_email') || 'leventegall@proton.me'}</span>
            </div>
          </div>
          <div className="developer-links-grid">
            <a href={`mailto:${t('about.app_info.developer_email') || 'leventegall@proton.me'}`} className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink(`mailto:${t('about.app_info.developer_email') || 'leventegall@proton.me'}`); }}>
              <Mail size={16} />
              <span>{t('about.links.email') || 'Email'}</span>
            </a>
            <a href={appInfo.developer.website} className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink(appInfo.developer.website); }}>
              <Globe size={16} />
              <span>{t('about.links.website') || 'Website'}</span>
            </a>
            <a href={appInfo.developer.github} className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink(appInfo.developer.github); }}>
              <GitHubIcon size={16} />
              <span>{t('about.links.github') || 'GitHub'}</span>
            </a>
            <a href={appInfo.developer.discordServer} className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink(appInfo.developer.discordServer); }}>
              <DiscordIcon size={16} />
              <span>{t('about.links.discord_server') || 'Discord Server'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
