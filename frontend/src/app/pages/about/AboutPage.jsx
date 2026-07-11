import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../providers/LanguageContext';
import { shell } from '../../lib/electron';
import {
  BookOpen,
  Mail,
  Globe,
  X,
  RefreshCw,
  Home,
  FolderSync,
  Bookmark,
  Star,
  BarChart2,
  History,
  Settings,
} from 'lucide-react';
import {
  Info,
  ScrollText,
  Lock,
  Library,
  CircleHelp,
} from '../../ui/icons';
import Sidebar from '../../ui/Sidebar';
import IconButton from '../../ui/IconButton';
import Card from '../../ui/Card';
import Switch from '../../ui/Switch';
import { fetchJson } from '../../lib/http';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../queries';
import Lightbox from '../../ui/Lightbox';
import './AboutPage.css';

const tmdbAttributionLogoSrc = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg';

const CAMERA_EMOJI = '📷 ';
const COLON_SEPARATOR = ': ';
const CHECKMARK_EMOJI = '✓ ';
const CROSS_EMOJI = '✗ ';

const LOGO_LETTER = 'S';
const APP_TITLE_TEXT = 'SWAYA';
const VERSION_CHAR = 'v';
const DEV_AVATAR_LETTER = 'L';
const GITHUB_LABEL = 'GitHub';
const NSFW_TEXT = 'NSFW';

const SILUR_NAME = 'Silur';
const KERRIGAN_NAME = 'Kerrigan';
const GITHUB_1_LABEL = 'GitHub 1';
const GITHUB_2_LABEL = 'GitHub 2';
const BULLET_SEP = '•';
const YASHOCK_NAME = 'YaShock';
const DATA_NAME = 'Data';

const GitHubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="about-social-icon">
    <path d="M12 .5C5.649.5.5 5.649.5 12A11.5 11.5 0 0 0 8.36 22.08c.575.106.785-.25.785-.556 0-.274-.01-1-.016-1.963-3.184.692-3.855-1.534-3.855-1.534-.52-1.323-1.27-1.675-1.27-1.675-1.038-.71.078-.696.078-.696 1.148.08 1.752 1.178 1.752 1.178 1.02 1.75 2.675 1.245 3.327.952.104-.739.399-1.245.726-1.531-2.542-.289-5.215-1.271-5.215-5.657 0-1.249.446-2.271 1.176-3.071-.118-.289-.51-1.452.111-3.026 0 0 .96-.307 3.146 1.173A10.94 10.94 0 0 1 12 6.03c.977.004 1.962.132 2.882.389 2.184-1.48 3.143-1.173 3.143-1.173.623 1.574.231 2.737.113 3.026.732.8 1.175 1.822 1.175 3.07 0 4.397-2.678 5.365-5.228 5.649.41.353.775 1.05.775 2.117 0 1.529-.014 2.762-.014 3.138 0 .31.207.668.79.555A11.503 11.503 0 0 0 23.5 12C23.5 5.649 18.351.5 12 .5Z" />
  </svg>
);

const DiscordIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="about-social-icon">
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
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const { data: settings = {} } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [activeLightboxUrl, setActiveLightboxUrl] = useState(null);
  const [activeTourIndex, setActiveTourIndex] = useState(0);
  const [activeSubFeatureIndex, setActiveSubFeatureIndex] = useState(null);
  const showAdult = Boolean(settings?.include_adult);
  const [prevShowAdult, setPrevShowAdult] = useState(showAdult);
  const [showNsfwDocs, setShowNsfwDocs] = useState(showAdult);

  if (showAdult !== prevShowAdult) {
    setPrevShowAdult(showAdult);
    setShowNsfwDocs(showAdult);
  }

  const [wizardInputs, setWizardInputs] = useState(null);

  const getWizardInputValue = (key) => {
    if (wizardInputs && key in wizardInputs) {
      return wizardInputs[key];
    }
    if (key === 'stashdb_endpoint') return settings.stashdb_endpoint || 'https://stashdb.org/graphql';
    if (key === 'porndb_endpoint') return settings.porndb_endpoint || 'https://theporndb.net/graphql';
    if (key === 'fansdb_endpoint') return settings.fansdb_endpoint || 'https://fansdb.cc/graphql';
    return settings[key] || '';
  };

  const handleInputChange = (key, value) => {
    setWizardInputs(prev => ({
      ...(prev || {
        tmdb_api_key: settings.tmdb_api_key || '',
        tmdb_bearer_token: settings.tmdb_bearer_token || '',
        omdb_api_key: settings.omdb_api_key || '',
        stashdb_api_key: settings.stashdb_api_key || '',
        stashdb_endpoint: settings.stashdb_endpoint || 'https://stashdb.org/graphql',
        porndb_api_key: settings.porndb_api_key || '',
        porndb_endpoint: settings.porndb_endpoint || 'https://theporndb.net/graphql',
        fansdb_api_key: settings.fansdb_api_key || '',
        fansdb_endpoint: settings.fansdb_endpoint || 'https://fansdb.cc/graphql',
      }),
      [key]: value
    }));
  };

  const handleSetActiveTab = (tabId) => {
    setActiveTab(tabId);
    setWizardStep(0);
    setActiveSubFeatureIndex(null);
    if (!tabId.startsWith('docs_')) {
      setIsDocsExpanded(false);
    }
  };

  const handleSaveSetting = async (fieldMap) => {
    setSaveStatus('saving');
    try {
      const payload = {};
      Object.keys(fieldMap).forEach((key) => {
        payload[key] = getWizardInputValue(fieldMap[key]);
      });
      await updateSettingsMutation.mutateAsync(payload);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus('error');
    }
  };

  const renderWizard = (steps) => {
    const currentStepIdx = wizardStep >= steps.length ? 0 : wizardStep;
    const step = steps[currentStepIdx];
    if (!step) return null;
    const isFirst = currentStepIdx === 0;
    const isLast = currentStepIdx === steps.length - 1;

    return (
      <div className="docs-wizard-container">
        {steps.length > 1 && (
          <div className="docs-wizard-progress">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`docs-wizard-progress-step ${idx === currentStepIdx ? 'is-active' : idx < currentStepIdx ? 'is-passed' : ''}`}
              />
            ))}
          </div>
        )}

        <div className="docs-wizard-slide">
          <h3 className="docs-wizard-slide-title">
            {step.title}
          </h3>

          <p className="docs-wizard-slide-desc">
            {step.description}
          </p>

          {step.links && (
            <div className="docs-wizard-slide-links">
              {step.links.map((link, lidx) => (
                <button
                  key={lidx}
                  className="ui-button ui-button--secondary ui-button--md docs-wizard-link-btn-inline"
                  onClick={(e) => { e.preventDefault(); openExternalLink(link.url); }}
                >
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
          )}

          {step.image ? (
            <button
              type="button"
              className="about-wizard-image-btn"
              onClick={() => setActiveLightboxUrl(step.image)}
            >
              <img
                src={step.image}
                alt={step.title}
                className="about-wizard-image"
              />
            </button>
          ) : step.screenshotPlaceholder && (
            <div className="docs-wizard-screenshot-placeholder">
              {CAMERA_EMOJI}{t('about.docs_wizard.screenshot_placeholder') || 'Screenshot'}{COLON_SEPARATOR}{step.screenshotPlaceholder}
            </div>
          )}

          {step.renderInputs && step.renderInputs()}

          {step.onSave && (
            <div className="docs-wizard-save-container">
              <button
                className="ui-button ui-button--primary ui-button--md docs-wizard-save-btn"
                onClick={step.onSave}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? (t('about.docs_wizard.saving') || 'Saving...') : (t('about.docs_wizard.save') || 'Save')}
              </button>
              {saveStatus === 'success' && <span className="docs-wizard-save-status-success">{CHECKMARK_EMOJI}{t('about.docs_wizard.saved') || 'Saved successfully!'}</span>}
              {saveStatus === 'error' && <span className="docs-wizard-save-status-error">{CROSS_EMOJI}{t('about.docs_wizard.save_failed') || 'Failed to save'}</span>}
            </div>
          )}
        </div>

        {steps.length > 1 && (
          <div className="docs-wizard-footer">
            {!isFirst ? (
              <button
                className="ui-button ui-button--secondary ui-button--md docs-wizard-btn-auto"
                onClick={() => {
                  setWizardStep(currentStepIdx - 1);
                  setSaveStatus(null);
                }}
              >
                {t('about.docs_wizard.back') || 'Back'}
              </button>
            ) : <div />}

            {!isLast && (
              <button
                className="ui-button ui-button--secondary ui-button--md docs-wizard-btn-next"
                onClick={() => {
                  setWizardStep(currentStepIdx + 1);
                  setSaveStatus(null);
                }}
              >
                {isFirst ? (t('about.docs_wizard.start') || "Let's get it!") : (t('about.docs_wizard.next') || 'Next Step')}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const tmdbWizardSteps = [
    {
      title: t('about.docs_wizard.tmdb.title') || 'TMDb API Integration',
      description: t('about.docs_wizard.tmdb.desc') || 'TMDb is a free movie and TV show database...'
    },
    {
      title: t('about.docs_wizard.tmdb.step_signup') || 'Create an Account',
      description: t('about.docs_wizard.tmdb.step_signup_desc') || 'First, create a free account...',
      links: [{ label: t('about.docs_wizard.tmdb.step_signup_btn') || 'Open TMDb Registration', url: 'https://www.themoviedb.org/signup' }],
      image: '/documentations/apis/tmdb1.PNG'
    },
    {
      title: t('about.docs_wizard.tmdb.step_email') || 'Receive Activation Email',
      description: t('about.docs_wizard.tmdb.step_email_desc') || 'Check your inbox...',
      image: '/documentations/apis/tmdb2.PNG'
    },
    {
      title: t('about.docs_wizard.tmdb.step_activate') || 'Activate Your Account',
      description: t('about.docs_wizard.tmdb.step_activate_desc') || 'Click on the activation button...',
      image: '/documentations/apis/tmdb3.PNG'
    },
    {
      title: t('about.docs_wizard.tmdb.step_login') || 'Log In to TMDb',
      description: t('about.docs_wizard.tmdb.step_login_desc') || 'Log in using your account details...',
      links: [{ label: t('about.docs_wizard.tmdb.step_login_btn') || 'Open TMDb Login', url: 'https://www.themoviedb.org/login' }],
      image: '/documentations/apis/tmdb4.PNG'
    },
    {
      title: t('about.docs_wizard.tmdb.step_api') || 'Request an API Key',
      description: t('about.docs_wizard.tmdb.step_api_desc') || 'After logging in, go to the API request page...',
      links: [{ label: t('about.docs_wizard.tmdb.step_api_btn') || 'Open API Request Page', url: 'https://www.themoviedb.org/settings/api/request' }],
      image: '/documentations/apis/tmdb5.png'
    },
    {
      title: t('about.docs_wizard.tmdb.step_terms') || 'Accept Terms of Service',
      description: t('about.docs_wizard.tmdb.step_terms_desc') || 'Check the box and click the blue button...',
      image: '/documentations/apis/tmdb6.PNG'
    },
    {
      title: t('about.docs_wizard.tmdb.step_details') || 'Fill in Application Details',
      description: t('about.docs_wizard.tmdb.step_details_desc') || 'Fill out this form to request your API key...',
      image: '/documentations/apis/tmdb7.PNG',
      renderInputs: () => {
        const dummyData = [
          { label: 'Application Name', value: 'my movie app' },
          { label: 'Application URL', value: 'https://www.mymovieapp.com' },
          { label: 'Application Summary', value: 'My application will show the beautiful posters and backdrops for me!' },
          { label: 'First Name', value: 'Movie' },
          { label: 'Last Name', value: 'Maniac' },
          { label: 'Email', value: 'moviemaniac77@gmail.com', noCopy: true },
          { label: 'Phone', value: '+36 70 666 7777' },
          { label: 'Address 1', value: 'Movie Street 77' },
          { label: 'City', value: 'Movie City' },
          { label: 'State', value: 'Movie State' },
          { label: 'Zip Code', value: '7777' }
        ];

        return (
          <div className="about-wizard-dummy-grid">
            {dummyData.map((d, idx) => (
              <div key={idx} className="about-wizard-dummy-item">
                <div className="about-wizard-dummy-text">
                  <strong className="about-wizard-dummy-label">{d.label}</strong>
                  <span className="about-wizard-dummy-value">{d.value}</span>
                </div>
                {!d.noCopy && (
                  <button
                    className="ui-button ui-button--secondary ui-button--md about-wizard-dummy-copy-btn"
                    onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(d.value); }}
                  >
                    {t('about.docs_wizard.copy') || 'Copy'}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      title: t('about.docs_wizard.tmdb.step_access') || 'Access API Key Details',
      description: t('about.docs_wizard.tmdb.step_access_desc') || 'Click on the highlighted link...',
      image: '/documentations/apis/tmdb8.PNG'
    },
    {
      title: t('about.docs_wizard.tmdb.step_save') || 'Save to SWAYA',
      description: t('about.docs_wizard.tmdb.step_save_desc') || 'Copy your API key...',
      image: '/documentations/apis/tmdb9.PNG',
      renderInputs: () => (
        <div className="about-wizard-inputs-container">
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.tmdb.label_key') || 'TMDb API Key'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('tmdb_api_key')}
              onChange={(e) => handleInputChange('tmdb_api_key', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.tmdb.placeholder_key') || 'API Key...'}
            />
          </div>
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.tmdb.label_token') || 'TMDb Read Access Token'}
            </label>
            <textarea
              value={getWizardInputValue('tmdb_bearer_token')}
              onChange={(e) => handleInputChange('tmdb_bearer_token', e.target.value)}
              className="about-wizard-input-textarea"
              placeholder={t('about.docs_wizard.tmdb.placeholder_token') || 'Long bearer token...'}
            />
          </div>
        </div>
      ),
      onSave: () => handleSaveSetting({ tmdb_api_key: 'tmdb_api_key', tmdb_bearer_token: 'tmdb_bearer_token' })
    }
  ];

  const omdbWizardSteps = [
    {
      title: t('about.docs_wizard.omdb.title') || 'OMDb API Integration',
      description: t('about.docs_wizard.omdb.desc') || 'OMDb API allows SWAYA to download...'
    },
    {
      title: t('about.docs_wizard.omdb.step_req') || 'Request an API Key',
      description: t('about.docs_wizard.omdb.step_req_desc') || 'Go to the OMDb request page...',
      links: [{ label: t('about.docs_wizard.omdb.step_req_btn') || 'Open OMDb API Key Request Page', url: 'http://www.omdbapi.com/apikey.aspx' }],
      image: '/documentations/apis/omdb1.PNG',
      renderInputs: () => {
        const dummyData = [
          { label: 'First Name', value: 'Movie' },
          { label: 'Last Name', value: 'Maniac' },
          { label: 'Email', value: 'Use your registered email', noCopy: true },
          { label: 'Use', value: 'Checking imdb, rotten, and meta movie ratings.' }
        ];

        return (
          <div className="about-wizard-dummy-grid">
            {dummyData.map((d, idx) => (
              <div key={idx} className={`about-wizard-dummy-item ${d.label === 'Use' ? 'about-wizard-dummy-span-2' : ''}`}>
                <div className="about-wizard-dummy-text">
                  <strong className="about-wizard-dummy-label">{d.label}</strong>
                  <span className="about-wizard-dummy-value">{d.value}</span>
                </div>
                {!d.noCopy && (
                  <button
                    className="ui-button ui-button--secondary ui-button--md about-wizard-dummy-copy-btn"
                    onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(d.value); }}
                  >
                    {t('about.docs_wizard.copy') || 'Copy'}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      title: t('about.docs_wizard.omdb.step_email') || 'Receive Activation Email',
      description: t('about.docs_wizard.omdb.step_email_desc') || 'Check your inbox...',
      image: '/documentations/apis/omdb2.PNG'
    },
    {
      title: t('about.docs_wizard.omdb.step_save') || 'Activate & Save',
      description: t('about.docs_wizard.omdb.step_save_desc') || 'Open your email...',
      image: '/documentations/apis/omdb3.PNG',
      renderInputs: () => (
        <div className="about-wizard-inputs-container">
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.omdb.label_key') || 'OMDb API Key'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('omdb_api_key')}
              onChange={(e) => handleInputChange('omdb_api_key', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.omdb.placeholder_key') || 'OMDb API Key...'}
            />
          </div>
        </div>
      ),
      onSave: () => handleSaveSetting({ omdb_api_key: 'omdb_api_key' })
    }
  ];

  const stashdbWizardSteps = [
    {
      title: t('about.docs_wizard.stashdb.step_intro') || 'StashDB Integration',
      description: t('about.docs_wizard.stashdb.step_intro_desc') || 'StashDB is a community adult metadata database...'
    },
    {
      title: t('about.docs_wizard.stashdb.step_register') || 'Create an Account',
      description: t('about.docs_wizard.stashdb.step_register_desc') || 'Register a new account at StashDB...',
      links: [
        { label: t('about.docs_wizard.stashdb.step_register_btn') || 'Open StashDB Registration', url: 'https://stashdb.org/register' },
        { label: t('about.docs_wizard.stashdb.step_register_admins') || 'Contact StashDB Admins', url: 'https://discourse.stashapp.cc/g/stashdb_admins' }
      ],
      renderInputs: () => {
        const inviteCodes = [
          { label: 'Invite Code A', value: 'dd9e5e76-fbd4-466c-ad96-296803275bb6' },
          { label: 'Invite Code B', value: '268df3a7-87cb-45bd-9ccf-d9a8bf2fee93' }
        ];

        return (
          <div className="about-wizard-dummy-grid">
            {inviteCodes.map((c, idx) => (
              <div key={idx} className="about-wizard-dummy-item">
                <div className="about-wizard-dummy-text">
                  <strong className="about-wizard-dummy-label">{c.label}</strong>
                  <span className="about-wizard-dummy-value">{c.value}</span>
                </div>
                <button
                  className="ui-button ui-button--secondary ui-button--md about-wizard-dummy-copy-btn"
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(c.value); }}
                >
                  {t('about.docs_wizard.copy') || 'Copy'}
                </button>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      title: t('about.docs_wizard.stashdb.step_activate') || 'Activate Your Profile',
      description: t('about.docs_wizard.stashdb.step_activate_desc') || 'Open the verification email...'
    },
    {
      title: t('about.docs_wizard.stashdb.step_save') || 'Retrieve your API Key',
      description: t('about.docs_wizard.stashdb.step_save_desc') || 'Log in and copy API key...',
      renderInputs: () => (
        <div className="about-wizard-inputs-container">
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.stashdb.label_endpoint') || 'StashDB API Endpoint'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('stashdb_endpoint')}
              onChange={(e) => handleInputChange('stashdb_endpoint', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.stashdb.placeholder_endpoint') || 'API Endpoint...'}
            />
          </div>
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.stashdb.label_key') || 'StashDB API Key'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('stashdb_api_key')}
              onChange={(e) => handleInputChange('stashdb_api_key', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.stashdb.placeholder_key') || 'StashDB API Key...'}
            />
          </div>
        </div>
      ),
      onSave: () => handleSaveSetting({ stashdb_api_key: 'stashdb_api_key', stashdb_endpoint: 'stashdb_endpoint' })
    }
  ];

  const fansdbWizardSteps = [
    {
      title: t('about.docs_wizard.fansdb.step_intro') || 'FansDB Integration',
      description: t('about.docs_wizard.fansdb.step_intro_desc') || 'FansDB is an invite-only crowdsourced metadata database...'
    },
    {
      title: t('about.docs_wizard.fansdb.step_apply') || 'Apply for Membership',
      description: t('about.docs_wizard.fansdb.step_apply_desc') || 'FansDB is currently invite-only...',
      links: [{ label: t('about.docs_wizard.fansdb.step_apply_btn') || 'Open FansDB Application Form', url: 'https://cryptpad.fr/form/#/2/form/view/qsc+HomZkJmjfQp0QRTDhN8JHgVt35pl1tG2n06Gy5o/embed/' }]
    },
    {
      title: t('about.docs_wizard.fansdb.step_register') || 'Register on FansDB',
      description: t('about.docs_wizard.fansdb.step_register_desc') || 'Once you receive your invite code...',
      links: [{ label: t('about.docs_wizard.fansdb.step_register_btn') || 'Open FansDB Registration', url: 'https://fansdb.cc/register' }]
    },
    {
      title: t('about.docs_wizard.fansdb.step_save') || 'Retrieve your API Key',
      description: t('about.docs_wizard.fansdb.step_save_desc') || 'Log in and copy API key...',
      renderInputs: () => (
        <div className="about-wizard-inputs-container">
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.fansdb.label_endpoint') || 'FansDB API Endpoint'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('fansdb_endpoint')}
              onChange={(e) => handleInputChange('fansdb_endpoint', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.fansdb.placeholder_endpoint') || 'API Endpoint...'}
            />
          </div>
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.fansdb.label_key') || 'FansDB API Key'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('fansdb_api_key')}
              onChange={(e) => handleInputChange('fansdb_api_key', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.fansdb.placeholder_key') || 'FansDB API Key...'}
            />
          </div>
        </div>
      ),
      onSave: () => handleSaveSetting({ fansdb_api_key: 'fansdb_api_key', fansdb_endpoint: 'fansdb_endpoint' })
    }
  ];

  const porndbWizardSteps = [
    {
      title: t('about.docs_wizard.porndb.step_intro') || 'ThePornDB Integration',
      description: t('about.docs_wizard.porndb.step_intro_desc') || 'ThePornDB integration lets you fetch studio scene metadata...'
    },
    {
      title: t('about.docs_wizard.porndb.step_register') || 'Create an Account',
      description: t('about.docs_wizard.porndb.step_register_desc') || 'Go to the registration page...',
      links: [{ label: t('about.docs_wizard.porndb.step_register_btn') || 'Open PornDB Registration', url: 'https://theporndb.net/register' }]
    },
    {
      title: t('about.docs_wizard.porndb.step_token') || 'Generate API Token',
      description: t('about.docs_wizard.porndb.step_token_desc') || 'Navigate to the API Tokens page...',
      links: [{ label: t('about.docs_wizard.porndb.step_token_btn') || 'Open PornDB API Tokens Page', url: 'https://theporndb.net/user/api-tokens' }]
    },
    {
      title: t('about.docs_wizard.porndb.step_save') || 'Copy Token & Save',
      description: t('about.docs_wizard.porndb.step_save_desc') || 'A popup window will display your new token...',
      renderInputs: () => (
        <div className="about-wizard-inputs-container">
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.porndb.label_endpoint') || 'ThePornDB API Endpoint'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('porndb_endpoint')}
              onChange={(e) => handleInputChange('porndb_endpoint', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.porndb.placeholder_endpoint') || 'API Endpoint...'}
            />
          </div>
          <div className="about-wizard-input-group">
            <label className="about-wizard-input-label">
              {t('about.docs_wizard.porndb.label_key') || 'ThePornDB API Key'}
            </label>
            <input
              type="text"
              value={getWizardInputValue('porndb_api_key')}
              onChange={(e) => handleInputChange('porndb_api_key', e.target.value)}
              className="about-wizard-input-text"
              placeholder={t('about.docs_wizard.porndb.placeholder_key') || 'ThePornDB API Key...'}
            />
          </div>
        </div>
      ),
      onSave: () => handleSaveSetting({ porndb_api_key: 'porndb_api_key', porndb_endpoint: 'porndb_endpoint' })
    }
  ];

  const offlineWizardSteps = [
    {
      title: t('about.docs_wizard.offline.step_single_title') || 'Local Offline Scan Capabilities',
      description: t('about.docs_wizard.offline.step_single_desc') || 'SWAYA works fully offline without any API keys...'
    }
  ];

  const featuresTourData = [
    {
      id: 'general_layout',
      icon: <BookOpen size={16} />,
      title: t('about.docs_wizard.features_tour.general_layout_title') || 'Interface & Navigation',
      description: t('about.docs_wizard.features_tour.general_layout_desc') || 'Get familiar with the general layout of SWAYA, including the sidebar navigation, session mode controls, and real-time background task monitors.',
      image: '/documentations/interface/interface1.png',
      details: [
        {
          title: t('about.docs_wizard.features_tour.general_layout_details.navigation_title') || 'Sidebar Navigation',
          description: t('about.docs_wizard.features_tour.general_layout_details.navigation_desc') || 'Allows navigating between core features of SWAYA. The sidebar can be expanded or collapsed to maximize screen space for content browsing.',
          image: '/documentations/interface/interface1.png'
        },
        {
          title: t('about.docs_wizard.features_tour.general_layout_details.session_modes_title') || 'SFW / NSFW Modes (Flame Icon)',
          description: t('about.docs_wizard.features_tour.general_layout_details.session_modes_desc') || 'Located in the top header. Toggles the global session context between SFW and NSFW. NSFW mode reveals adult-oriented categories, unblurs explicit media posters, and adapts greeting titles.',
          image: '/documentations/interface/interface2.png',
          nsfw: true
        },
        {
          title: t('about.docs_wizard.features_tour.general_layout_details.background_tasks_title') || 'Background Tasks & Scanning',
          description: t('about.docs_wizard.features_tour.general_layout_details.background_tasks_desc') || 'Displays scanning status, metadata fetching, and image processing jobs in progress with live progress bars at the top of the application.',
          image: '/documentations/interface/interface3.png'
        },
        {
          title: t('about.docs_wizard.features_tour.general_layout_details.history_nav_title') || 'History Navigation (Back & Forward)',
          description: t('about.docs_wizard.features_tour.general_layout_details.history_nav_desc') || 'Located in the top header. Allows you to easily navigate back and forward through your recently visited pages, similar to a web browser.',
          image: '/documentations/interface/interface4.png'
        },
        {
          title: t('about.docs_wizard.features_tour.general_layout_details.global_search_title') || 'Global Search',
          description: t('about.docs_wizard.features_tour.general_layout_details.global_search_desc') || 'Located in the top header. Allows you to search your entire media library, performers, studios, and categories instantly from anywhere in the application.',
          image: '/documentations/interface/interface5.png'
        }
      ]
    },
    {
      id: 'dashboard',
      icon: <Home size={16} />,
      title: t('about.docs_wizard.features_tour.dashboard_title') || 'Dashboard',
      description: t('about.docs_wizard.features_tour.dashboard_desc') || 'Your library landing page and central hub. Features clean widgets showing continue watching, recently added videos, spotlight items, and database counts.',
      image: '/documentations/dashboard/dashboard1.png',
      details: [
        {
          title: t('about.docs_wizard.features_tour.dashboard_details.greeting_title') || 'Dynamic Greeting',
          description: t('about.docs_wizard.features_tour.dashboard_details.greeting_desc') || 'Greets you contextually based on the time of day, onboarding status, and SFW/NSFW session modes.',
          image: '/documentations/dashboard/dashboard1.png'
        },
        {
          title: t('about.docs_wizard.features_tour.dashboard_details.customizer_title') || 'Dashboard Customizer',
          description: t('about.docs_wizard.features_tour.dashboard_details.customizer_desc') || 'A drawer widget that allows toggling visibility and drag-and-drop reordering of widgets, persisting settings to local storage.',
          image: '/documentations/dashboard/dashboard2.png'
        },
        {
          title: t('about.docs_wizard.features_tour.dashboard_details.error_boundary_title') || 'Modular Widget System & Error Boundaries',
          description: t('about.docs_wizard.features_tour.dashboard_details.error_boundary_desc') || 'Each widget runs within its own boundary (WidgetErrorBoundary), preventing a crash in one widget from bringing down the entire dashboard.',
          image: '/documentations/dashboard/dashboard3.png'
        },
        {
          title: t('about.docs_wizard.features_tour.dashboard_details.widgets_title') || 'Context-Sensitive Content Widgets',
          description: t('about.docs_wizard.features_tour.dashboard_details.widgets_desc') || 'Includes Continue Watching, Trending (Spotlight), Fresh Arrivals, lately tracked artists, and recommendations.',
          description_nsfw: (t('about.docs_wizard.features_tour.dashboard_details.widgets_desc') || 'Includes Continue Watching, Trending (Spotlight), Fresh Arrivals, lately tracked artists, and recommendations.') + '\n\nIn NSFW mode, SFW widgets are updated to show adult stars, and recommendations are adjusted accordingly.',
          image: '/documentations/dashboard/dashboard4.png',
          image_nsfw: '/documentations/dashboard/dashboard4_nsfw.png'
        },
        {
          title: t('about.docs_wizard.features_tour.dashboard_details.adult_widget_title') || 'Adult Recommendations',
          description: t('about.docs_wizard.features_tour.dashboard_details.adult_widget_desc') || 'Exclusively displays personalized adult recommendations when the application is toggled to NSFW session mode.',
          image: '/documentations/dashboard/dashboard5.png',
          nsfw: true
        }
      ]
    },
    {
      id: 'organizer',
      icon: <FolderSync size={16} />,
      title: t('about.docs_wizard.features_tour.organizer_title') || 'Organizer',
      description: t('about.docs_wizard.features_tour.organizer_desc') || 'The control center for scanning and sorting. Input folder paths to parse video metadata, index files offline, check collisions, and match videos with online databases.',
      image: '/documentations/features/organizer.png',
      details: [
        {
          title: t('about.docs_wizard.features_tour.organizer_details.modes_title') || 'Scan Modes',
          description: t('about.docs_wizard.features_tour.organizer_details.modes_desc') || 'Run directory scans across Movies & TV Shows (TMDb) or Offline lists depending on your library setup. In SFW mode, the Offline scan organizes files under a general \'Videos\' tab, which dynamically converts to a \'Scenes\' tab when the application\'s global NSFW toggle is active.',
          description_nsfw: t('about.docs_wizard.features_tour.organizer_details.modes_desc_nsfw') || 'Run directory scans across Movies & TV Shows (TMDb) or Offline lists depending on your library setup. In SFW mode, the Offline scan organizes files under a general \'Videos\' tab, which dynamically converts to a \'Scenes\' tab when the application\'s global NSFW toggle is active.\n\nIn NSFW mode, the Movies & TV Shows scan can also query adult movies from PornDB and TMDb (including adult TV shows from TMDb). Adult matches are completely filtered out from TMDb in SFW mode, whereas in NSFW mode, the resolver specifically targets adult entries. Additionally, you can unlock the Scenes scan mode to parse performer and studio metadata using StashDB, FansDB, or PornDB.',
          image: '/documentations/features/organizer_modes.png',
          image_nsfw: '/documentations/features/organizer_modes_nsfw.png'
        },
        {
          title: t('about.docs_wizard.features_tour.organizer_details.statuses_title') || 'Statuses, Overrides & Extras',
          description: t('about.docs_wizard.features_tour.organizer_details.statuses_desc') || 'Track scan results using color-coded match statuses (Matched, Unmatched, Manual, Collision). Set custom overrides to lock matches, and let the parser automatically catalog media Extras like trailers, deleted scenes, or featurettes.',
          image: '/documentations/features/organizer_statuses.png'
        },
        {
          title: t('about.docs_wizard.features_tour.organizer_details.renaming_title') || 'Automated Renaming & In-Place Indexing',
          description: t('about.docs_wizard.features_tour.organizer_details.renaming_desc') || 'Customize your library naming layouts and automatically rename or reorganize files. For torrent seeders or users with pre-arranged collections, you can disable folder organization completely in settings, letting the program index the files in-place without moving or renaming them.',
          image: '/documentations/features/organizer_rename.png'
        },
        {
          title: t('about.docs_wizard.features_tour.organizer_details.matching_title') || 'Manual Match & Bulk Resolving',
          description: t('about.docs_wizard.features_tour.organizer_details.matching_desc') || 'Manually query and link metadata using the Match Resolver. For TV Shows, resolve matching conflicts in bulk at the series level to link entire seasons or show runs at once.',
          image: '/documentations/features/organizer_match.png'
        },
        {
          title: t('about.docs_wizard.features_tour.organizer_details.context_title') || 'Context Menus & File Deletion',
          description: t('about.docs_wizard.features_tour.organizer_details.context_desc') || 'Quickly trigger actions via right-click context menus or hover action overlay shortcuts. Manage unwanted files safely with 3 deletion levels: remove item only from database, move file to system Recycle Bin, or delete file permanently from disk.',
          image: '/documentations/features/organizer_context.png'
        },
        {
          title: t('about.docs_wizard.features_tour.organizer_details.scenes_title') || 'NSFW Scenes Scan',
          description: t('about.docs_wizard.features_tour.organizer_details.scenes_desc') || 'Retrieve performers, studio details, categories, and high-quality scene covers automatically.',
          image: '/documentations/features/organizer_scenes.png',
          nsfw: true
        }
      ]
    },
    {
      id: 'library',
      icon: <Library size={16} />,
      title: t('about.docs_wizard.features_tour.library_title') || 'Media Library',
      description: t('about.docs_wizard.features_tour.library_desc') || 'Browse and filter your entire collection. Filter by performers, studios, release year, tags, resolution, or type. Edit video settings, change posters, and add custom details.',
      image: '/documentations/features/library.png',
      details: [
        {
          title: t('about.docs_wizard.features_tour.library_details.browsing_title') || 'Library Browsing & Filtering',
          description: t('about.docs_wizard.features_tour.library_details.browsing_desc') || 'Navigate through your collection using dedicated tabs for Movies, TV Shows, and People. Find files instantly with live search, sorting criteria, and advanced filtering options.',
          image: '/documentations/features/library_browsing.png'
        },
        {
          title: t('about.docs_wizard.features_tour.library_details.metadata_profiles_title') || 'Detailed Metadata Profiles',
          description: t('about.docs_wizard.features_tour.library_details.metadata_profiles_desc') || 'Dive into comprehensive detail pages. Access synopses, company production info, external ratings, cast lists, and interactive seasons/episodes selectors.',
          description_nsfw: t('about.docs_wizard.features_tour.library_details.metadata_profiles_desc_nsfw') || 'Each media item opens into an immersive full-screen detail hub. SWAYA parses and displays high-fidelity backdrops, logos, movie/show posters, structural cast lists, budget details, box office stats, external rating scores, and studio links. For TV Shows, it renders interactive season grids and episode selectors, letting you easily track your progress.\n\nIn NSFW mode, Scenes detail pages are enriched with technical video stream specifications, explicit category tag lists, and an interactive Peaks panel. The Peaks panel displays player heatmaps showing crowd-sourced high-activity points of the video, letting you skip directly to the highlights of any matched scene.',
          image: '/documentations/features/library_detail.png',
          image_nsfw: '/documentations/features/library_detail_nsfw.png'
        },
        {
          title: t('about.docs_wizard.features_tour.library_details.tagging_title') || 'Tagging, Playlists & Watch History',
          description: t('about.docs_wizard.features_tour.library_details.tagging_desc') || 'Manage and organize cataloged files on-the-fly. Edit tags, add items to custom lists/playlists, and keep track of your watch counts and play history.',
          description_nsfw: t('about.docs_wizard.features_tour.library_details.tagging_desc_nsfw') || 'Manage and organize cataloged files on-the-fly. Edit tags, add items to custom lists/playlists, and keep track of your watch counts and play history.\n\nIn NSFW mode, you can also track interactive player peaks, video markers, and customize a distinct "Finish Count" widget on the activity panel.',
          image: '/documentations/features/library_tagging.png',
          image_nsfw: '/documentations/features/library_tagging_nsfw.png'
        },
        {
          title: t('about.docs_wizard.features_tour.library_details.people_title') || 'People & Cast Profiles',
          description: t('about.docs_wizard.features_tour.library_details.people_desc') || 'Explore cast, crew, and director profiles. Browse performer bios, birth details, and discover all linked media files available in your collections.',
          description_nsfw: t('about.docs_wizard.features_tour.library_details.people_desc_nsfw') || 'Explore cast, crew, and director profiles. Browse performer bios, birth details, and discover all linked media files available in your collections.\n\nIn NSFW mode, performer profiles display interactive adult links, aliases, anatomical stats, and custom social link integrations (e.g. OnlyFans, Twitter).',
          image: '/documentations/features/library_people.png',
          image_nsfw: '/documentations/features/library_people_nsfw.png'
        }
      ]
    },
    {
      id: 'lists',
      icon: <Bookmark size={16} />,
      title: t('about.docs_wizard.features_tour.lists_title') || 'Lists & Playlists',
      description: t('about.docs_wizard.features_tour.lists_desc') || 'Organize your videos into custom playlists or watch lists. Perfect for cataloguing files by genre, custom series, performer playlists, or personal favorites.',
      image: '/documentations/features/lists.png'
    },
    {
      id: 'ratings',
      icon: <Star size={16} />,
      title: t('about.docs_wizard.features_tour.ratings_title') || 'Ratings System',
      description: t('about.docs_wizard.features_tour.ratings_desc') || 'Rate your videos using a clean star system. Sort your media library by rating to quickly locate your top-rated films and media.',
      image: '/documentations/features/ratings.png'
    },
    {
      id: 'statistics',
      icon: <BarChart2 size={16} />,
      title: t('about.docs_wizard.features_tour.statistics_title') || 'Statistics & Insights',
      description: t('about.docs_wizard.features_tour.statistics_desc') || 'Analyze your collection. View size breakdowns, distribution by resolution, performer/studio counts, and total library duration.',
      image: '/documentations/features/statistics.png'
    },
    {
      id: 'history',
      icon: <History size={16} />,
      title: t('about.docs_wizard.features_tour.history_title') || 'Watch History',
      description: t('about.docs_wizard.features_tour.history_desc') || 'Track your watching habits. See what files you watched, how many times they were played, and resume from exactly where you left off.',
      image: '/documentations/features/history.png'
    },
    {
      id: 'settings',
      icon: <Settings size={16} />,
      title: t('about.docs_wizard.features_tour.settings_title') || 'Settings & Presets',
      description: t('about.docs_wizard.features_tour.settings_desc') || 'Configure the core application. Customize file naming patterns, target directories, metadata providers priority, and cache maintenance.',
      image: '/documentations/features/settings.png'
    }
  ];

  const docSubItems = [
    { id: 'docs_tmdb', label: t('about.resources.docs_items.tmdb') || 'TMDb API Key' },
    { id: 'docs_omdb', label: t('about.resources.docs_items.omdb') || 'OMDb API Key' },
    { id: 'docs_stashdb', label: t('about.resources.docs_items.stashdb') || 'StashDB' },
    { id: 'docs_fansdb', label: t('about.resources.docs_items.fansdb') || 'FansDB' },
    { id: 'docs_porndb', label: t('about.resources.docs_items.porndb') || 'ThePornDB' },
    { id: 'docs_offline', label: t('about.resources.docs_items.offline') || 'Offline Scan' },
    { id: 'docs_features', label: t('about.resources.docs_items.features') || 'Feature Tour' },
  ];

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const target = e.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    if (activeTab !== 'changelog' || hasLoadedChangelog || isLoadingChangelog) return;

    const loadChangelog = async () => {
      setIsLoadingChangelog(true);
      setChangelogError(null);
      try {
        const data = await fetchJson('/api/settings/changelog');
        if (data.status === 'success') {
          setChangelogContent(data.content || '');
          setHasLoadedChangelog(true);
        } else {
          throw new Error(data.message || 'Failed to load changelog');
        }
      } catch (err) {
        setChangelogError(err.message || 'Failed to load changelog');
        setHasLoadedChangelog(true);
      } finally {
        setIsLoadingChangelog(false);
      }
    };

    loadChangelog();
  }, [activeTab, hasLoadedChangelog, isLoadingChangelog]);

  const tabs = [
    { id: 'info', label: t('about.general'), icon: Info },
    { id: 'docs', label: t('about.resources.docs') || 'Documentation', icon: CircleHelp, subItems: docSubItems },
    { id: 'changelog', label: t('about.resources.changelog'), icon: ScrollText },
    { id: 'privacy', label: t('about.notices.privacy'), icon: Lock },
    { id: 'license', label: t('about.notices.license'), icon: ScrollText },
    { id: 'third_party', label: t('about.notices.third_party'), icon: Library },
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



  const isDocsTabActive = activeTab === 'docs' || activeTab.startsWith('docs_');
  const sidebarGroups = tabs.map((tab) => {
    if (tab.subItems) {
      return {
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        isActive: isDocsTabActive,
        isExpanded: isDocsExpanded || isDocsTabActive,
        onToggle: () => {
          setIsDocsExpanded(!isDocsExpanded);
          if (!activeTab.startsWith('docs_')) {
            handleSetActiveTab('docs_tmdb');
          }
        },
        subItems: tab.subItems.map((sub) => ({
          id: sub.id,
          label: sub.label,
          isActive: activeTab === sub.id,
        })),
      };
    }
    return {
      id: tab.id,
      label: tab.label,
      icon: tab.icon,
      isActive: activeTab === tab.id,
    };
  });

  return (
    <div className="ui-overlay">
      <div className="ui-close-container ui-overlay__close-container">
        <IconButton
          className="ui-close-btn"
          onClick={handleClose}
          label={t('common.close')}
          title={null}
          size="md"
        >
          <X size={18} />
        </IconButton>
        <span className="ui-close-esc-hint">{t('settingsPage.closeShortcut') || 'ESC'}</span>
      </div>
      <Sidebar
        header={t('about.title')}
        groups={sidebarGroups}
        onTabSelect={handleSetActiveTab}
      />

      <main className="ui-overlay__content-wrapper">

        <div className={`ui-overlay__content ${activeTab === 'docs_features' ? 'ui-overlay__content--wide' : ''}`}>
          <div className="settings-tab-content">
            {activeTab === 'info' && (
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
                      <a href="https://swaya.io" className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink('https://swaya.io'); }}>
                        <Globe size={16} />
                        <span>{t('about.links.website') || 'Website'}</span>
                      </a>
                      <a href="https://github.com/stargate91/SWAYA" className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/stargate91/SWAYA'); }}>
                        <GitHubIcon size={16} />
                        <span>{t('about.links.github') || 'GitHub'}</span>
                      </a>
                      <a href="https://discord.gg/swaya" className="ui-button ui-button--secondary ui-button--md" onClick={(e) => { e.preventDefault(); openExternalLink('https://discord.gg/swaya'); }}>
                        <DiscordIcon size={16} />
                        <span>{t('about.links.discord_server') || 'Discord Server'}</span>
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
            {activeTab === 'docs_tmdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">{t('about.resources.docs_items.tmdb') || 'TMDb API Key'}</h2>
                  {renderWizard(tmdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_omdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">{t('about.resources.docs_items.omdb') || 'OMDb API Key'}</h2>
                  {renderWizard(omdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_stashdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">{t('about.resources.docs_items.stashdb') || 'StashDB'}</h2>
                  {renderWizard(stashdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_fansdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">{t('about.resources.docs_items.fansdb') || 'FansDB'}</h2>
                  {renderWizard(fansdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_porndb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">{t('about.resources.docs_items.porndb') || 'ThePornDB'}</h2>
                  {renderWizard(porndbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_offline' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">{t('about.resources.docs_items.offline') || 'Offline Scan'}</h2>
                  {renderWizard(offlineWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_features' && (() => {
              const activeItem = featuresTourData[activeTourIndex];
              const hasSubFeature = activeSubFeatureIndex !== null && activeItem.details && activeItem.details[activeSubFeatureIndex];
              const currentItemObj = hasSubFeature ? activeItem.details[activeSubFeatureIndex] : activeItem;
              
              const displayTitle = (showNsfwDocs && currentItemObj.title_nsfw) ? currentItemObj.title_nsfw : currentItemObj.title;
              const displayDescription = (showNsfwDocs && currentItemObj.description_nsfw) ? currentItemObj.description_nsfw : currentItemObj.description;
              const displayImage = (showNsfwDocs && currentItemObj.image_nsfw) ? currentItemObj.image_nsfw : currentItemObj.image;

              return (
                <div className="about-features-tour-container">
                  <h2 className="about-features-tour-title">{t('about.resources.docs_items.features') || 'Feature Tour'}</h2>
                  <div className="about-features-tour-body">
                    {/* Left Sidebar List of Pages & Sub-features */}
                    <div className="about-features-tour-sidebar">
                      <div className="about-features-nsfw-toggle">
                        <span className="about-features-nsfw-label">
                          {t('about.docs_wizard.show_nsfw_features') || 'Show NSFW Features'}
                        </span>
                        <Switch
                          checked={showNsfwDocs}
                          onChange={() => {
                            setShowNsfwDocs(!showNsfwDocs);
                            if (showNsfwDocs && hasSubFeature && activeItem.details[activeSubFeatureIndex].nsfw) {
                              setActiveSubFeatureIndex(null);
                            }
                          }}
                        />
                      </div>

                      {featuresTourData.map((f, idx) => {
                        const isMainActive = activeTourIndex === idx && activeSubFeatureIndex === null;
                        const isAnyActive = activeTourIndex === idx;
                        const filteredDetails = f.details ? f.details.filter(detail => showNsfwDocs || !detail.nsfw) : [];
                        const activeSubIndex = f.details ? filteredDetails.findIndex(detail => f.details.indexOf(detail) === activeSubFeatureIndex) : -1;

                        return (
                          <div key={f.id} className="about-features-sidebar-group">
                            <div
                              className={`ui-sidebar-item ${isMainActive ? 'active' : ''}`}
                              onClick={() => {
                                setActiveTourIndex(idx);
                                setActiveSubFeatureIndex(null);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setActiveTourIndex(idx);
                                  setActiveSubFeatureIndex(null);
                                }
                              }}
                            >
                              <span className="ui-sidebar-item-icon about-features-item-icon">{f.icon}</span>
                              <span className="ui-sidebar-label about-features-item-label">{f.title}</span>
                              {f.details && (
                                <span className="about-features-item-expand">
                                  {isAnyActive ? '▼' : '▶'}
                                </span>
                              )}
                            </div>

                            {f.details && isAnyActive && filteredDetails.length > 0 && (
                              <div className="ui-sidebar-sub-menu is-open about-features-sub-menu">
                                {activeSubIndex !== -1 && (
                                  <div
                                    className="ui-sidebar-sub-indicator about-features-sub-indicator"
                                    // eslint-disable-next-line react/forbid-dom-props
                                    style={{ top: `${activeSubIndex * 32}px` }}
                                  />
                                )}
                                {filteredDetails.map((detail) => {
                                  const originalIndex = f.details.indexOf(detail);
                                  const isSubActive = activeTourIndex === idx && activeSubFeatureIndex === originalIndex;
                                  return (
                                    <div
                                      key={originalIndex}
                                      className={`ui-sidebar-sub-item ${isSubActive ? 'active' : ''}`}
                                      onClick={() => {
                                        setActiveTourIndex(idx);
                                        setActiveSubFeatureIndex(originalIndex);
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setActiveTourIndex(idx);
                                          setActiveSubFeatureIndex(originalIndex);
                                        }
                                      }}
                                    >
                                      <span className="about-features-sub-item-text">{detail.title}</span>
                                      {detail.nsfw && (
                                        <span className="about-features-nsfw-badge">
                                          {NSFW_TEXT}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Content Panel (Split details + image) */}
                    <div className="about-features-content-panel">
                      <h3 className="about-features-content-title">
                        {displayTitle}
                      </h3>

                      {/* Screenshot / Image Showcase */}
                      <div
                        className={`about-features-screenshot-wrapper ${displayImage ? '' : 'about-features-screenshot-wrapper--placeholder'}`}
                        onClick={() => {
                          if (displayImage) {
                            setActiveLightboxUrl(displayImage);
                          }
                        }}
                        role="button"
                        tabIndex={displayImage ? 0 : -1}
                        onKeyDown={displayImage ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveLightboxUrl(displayImage);
                          }
                        } : undefined}
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={displayTitle}
                            className="about-features-screenshot-image"
                          />
                        ) : (
                          <div className="about-features-placeholder-content">
                            <span className="about-features-placeholder-icon">{CAMERA_EMOJI}</span>
                            <span className="about-features-placeholder-label">{t('about.docs_wizard.screenshot_placeholder') || 'Screenshot Placeholder'}</span>
                            <span className="about-features-placeholder-title">{displayTitle}</span>
                          </div>
                        )}
                      </div>

                      {/* Features / Details of the selected page */}
                      <div className="about-features-description-container">
                        <p className="about-features-description-text">
                          {displayDescription}
                        </p>
                        {showNsfwDocs && currentItemObj.description_nsfw && (
                          <div className="about-features-nsfw-description">
                            {/* Extract only the nsfw specific extension part if description_nsfw starts with base description */}
                            {currentItemObj.description_nsfw.replace(currentItemObj.description, '').trim().replace(/^\n+/, '')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                    <li>{t('about.notices.points.no_telemetry')}</li>
                    <li>{t('about.notices.points.no_sharing')}</li>
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
                        <span className="thanks-name">{SILUR_NAME}</span>
                        <div className="thanks-links">
                          <a href="https://github.com/Silur" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/Silur'); }}>
                            <GitHubIcon size={12} />
                            <span>{GITHUB_LABEL}</span>
                          </a>
                        </div>
                      </div>
                      <div className="thanks-item">
                        <span className="thanks-name">{KERRIGAN_NAME}</span>
                        <div className="thanks-links">
                          <a href="https://github.com/rasztasd" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/rasztasd'); }}>
                            <GitHubIcon size={12} />
                            <span>{GITHUB_1_LABEL}</span>
                          </a>
                          <span className="thanks-divider">{BULLET_SEP}</span>
                          <a href="https://github.com/danielmcallisterSG" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/danielmcallisterSG'); }}>
                            <GitHubIcon size={12} />
                            <span>{GITHUB_2_LABEL}</span>
                          </a>
                        </div>
                      </div>
                      <div className="thanks-item">
                        <span className="thanks-name">{YASHOCK_NAME}</span>
                        <div className="thanks-links">
                          <a href="https://github.com/YaShock" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/YaShock'); }}>
                            <GitHubIcon size={12} />
                            <span>{GITHUB_LABEL}</span>
                          </a>
                        </div>
                      </div>
                      <div className="thanks-item">
                        <span className="thanks-name">{DATA_NAME}</span>
                        <div className="thanks-links">
                          <a href="https://github.com/adamgyongyosi" className="thanks-link" onClick={(e) => { e.preventDefault(); openExternalLink('https://github.com/adamgyongyosi'); }}>
                            <GitHubIcon size={12} />
                            <span>{GITHUB_LABEL}</span>
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
      <Lightbox imageUrl={activeLightboxUrl} onClose={() => setActiveLightboxUrl(null)} t={t} />
    </div>
  );
}
