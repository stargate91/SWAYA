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
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import IconButton from '../../ui/IconButton';
import Card from '../../ui/Card';
import { fetchJson } from '../../lib/http';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../queries';
import ImageLightbox from '../library/components/detail/modals/ImageLightbox';
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
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const { data: settings = {} } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [activeLightboxUrl, setActiveLightboxUrl] = useState(null);

  const [wizardInputs, setWizardInputs] = useState({
    tmdb_api_key: '',
    tmdb_bearer_token: '',
    omdb_api_key: '',
    stashdb_api_key: '',
    stashdb_endpoint: 'https://stashdb.org/graphql',
    porndb_api_key: '',
    porndb_endpoint: 'https://theporndb.net/graphql',
    fansdb_api_key: '',
    fansdb_endpoint: 'https://fansdb.cc/graphql',
  });

  useEffect(() => {
    setWizardStep(0);
  }, [activeTab]);

  useEffect(() => {
    if (settings) {
      setWizardInputs({
        tmdb_api_key: settings.tmdb_api_key || '',
        tmdb_bearer_token: settings.tmdb_bearer_token || '',
        omdb_api_key: settings.omdb_api_key || '',
        stashdb_api_key: settings.stashdb_api_key || '',
        stashdb_endpoint: settings.stashdb_endpoint || 'https://stashdb.org/graphql',
        porndb_api_key: settings.porndb_api_key || '',
        porndb_endpoint: settings.porndb_endpoint || 'https://theporndb.net/graphql',
        fansdb_api_key: settings.fansdb_api_key || '',
        fansdb_endpoint: settings.fansdb_endpoint || 'https://fansdb.cc/graphql',
      });
    }
  }, [settings]);

  const handleSaveSetting = async (fieldMap) => {
    setSaveStatus('saving');
    try {
      const payload = {};
      Object.keys(fieldMap).forEach((key) => {
        payload[key] = wizardInputs[fieldMap[key]];
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
      <div className="docs-wizard-container" style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '380px',
        justifyContent: 'space-between',
        gap: '20px',
        marginTop: '15px'
      }}>
        {steps.length > 1 && (
          <div className="docs-wizard-progress" style={{ display: 'flex', gap: '8px' }}>
            {steps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: idx === currentStepIdx ? 'var(--color-accent)' : idx < currentStepIdx ? 'var(--color-accent-subtle, var(--color-muted))' : 'var(--color-border-subtle, var(--color-line))',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        )}

        <div className="docs-wizard-slide" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: 1
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
            {step.title}
          </h3>
          
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--color-text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
            {step.description}
          </p>

          {step.links && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              {step.links.map((link, lidx) => (
                <button
                  key={lidx}
                  className="about-action-btn"
                  onClick={(e) => { e.preventDefault(); openExternalLink(link.url); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'auto' }}
                >
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
          )}

          {step.image ? (
            <div
              style={{
                marginTop: '10px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--color-border-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => setActiveLightboxUrl(step.image)}
            >
              <img
                src={step.image}
                alt={step.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          ) : step.screenshotPlaceholder && (
            <div style={{
              background: 'var(--color-bg-subtle, rgba(255,255,255,0.02))',
              border: '1px dashed var(--color-border-default)',
              borderRadius: '12px',
              padding: '30px 20px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              📷 {t('about.docs_wizard.screenshot_placeholder') || 'Screenshot'}: {step.screenshotPlaceholder}
            </div>
          )}

          {step.renderInputs && step.renderInputs()}

          {step.onSave && (
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="about-action-btn"
                onClick={step.onSave}
                disabled={saveStatus === 'saving'}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  borderColor: 'var(--color-accent)',
                  width: 'auto'
                }}
              >
                {saveStatus === 'saving' ? (t('about.docs_wizard.saving') || 'Saving...') : (t('about.docs_wizard.save') || 'Save')}
              </button>
              {saveStatus === 'success' && <span style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>✓ {t('about.docs_wizard.saved') || 'Saved successfully!'}</span>}
              {saveStatus === 'error' && <span style={{ color: 'var(--color-danger)', fontSize: '13px', fontWeight: 600 }}>✗ {t('about.docs_wizard.save_failed') || 'Failed to save'}</span>}
            </div>
          )}
        </div>

        {steps.length > 1 && (
          <div className="docs-wizard-footer" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: '15px'
          }}>
            {!isFirst ? (
              <button
                className="about-action-btn"
                onClick={() => {
                  setWizardStep(currentStepIdx - 1);
                  setSaveStatus(null);
                }}
                style={{ width: 'auto' }}
              >
                {t('about.docs_wizard.back') || 'Back'}
              </button>
            ) : <div />}

            {!isLast && (
              <button
                className="about-action-btn"
                onClick={() => {
                  setWizardStep(currentStepIdx + 1);
                  setSaveStatus(null);
                }}
                style={{ backgroundColor: 'var(--color-bg-hover)', width: 'auto' }}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '10px',
            background: 'var(--color-bg-subtle, rgba(255,255,255,0.01))',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-subtle)',
            boxSizing: 'border-box'
          }}>
            {dummyData.map((d, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'var(--color-bg-canvas, rgba(0,0,0,0.2))',
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid var(--color-border-default)',
                minWidth: 0
              }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', minWidth: 0 }}>
                  <strong style={{ color: 'var(--color-text-secondary)', fontSize: '10px', display: 'block', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</strong>
                  <span style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{d.value}</span>
                </div>
                {!d.noCopy && (
                  <button
                    className="about-action-btn"
                    onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(d.value); }}
                    style={{
                      padding: '3px 8px',
                      fontSize: '10px',
                      width: 'auto',
                      minWidth: '45px',
                      height: 'auto',
                      flexShrink: 0
                    }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.tmdb.label_key') || 'TMDb API Key'}
            </label>
            <input
              type="text"
              value={wizardInputs.tmdb_api_key}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, tmdb_api_key: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
              placeholder={t('about.docs_wizard.tmdb.placeholder_key') || 'API Key...'}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.tmdb.label_token') || 'TMDb Read Access Token'}
            </label>
            <textarea
              value={wizardInputs.tmdb_bearer_token}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, tmdb_bearer_token: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                height: '70px',
                resize: 'none',
                outline: 'none'
              }}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '10px',
            background: 'var(--color-bg-subtle, rgba(255,255,255,0.01))',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-subtle)',
            boxSizing: 'border-box'
          }}>
            {dummyData.map((d, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'var(--color-bg-canvas, rgba(0,0,0,0.2))',
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid var(--color-border-default)',
                minWidth: 0,
                gridColumn: d.label === 'Use' ? 'span 2' : 'auto'
              }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', minWidth: 0 }}>
                  <strong style={{ color: 'var(--color-text-secondary)', fontSize: '10px', display: 'block', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</strong>
                  <span style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{d.value}</span>
                </div>
                {!d.noCopy && (
                  <button
                    className="about-action-btn"
                    onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(d.value); }}
                    style={{
                      padding: '3px 8px',
                      fontSize: '10px',
                      width: 'auto',
                      minWidth: '45px',
                      height: 'auto',
                      flexShrink: 0
                    }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {t('about.docs_wizard.omdb.label_key') || 'OMDb API Key'}
          </label>
          <input
            type="text"
            value={wizardInputs.omdb_api_key}
            onChange={(e) => setWizardInputs(prev => ({ ...prev, omdb_api_key: e.target.value }))}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-default)',
              background: 'var(--color-bg-subtle)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
            placeholder={t('about.docs_wizard.omdb.placeholder_key') || 'OMDb API Key...'}
          />
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '10px',
            background: 'var(--color-bg-subtle, rgba(255,255,255,0.01))',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-subtle)',
            boxSizing: 'border-box'
          }}>
            {inviteCodes.map((c, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'var(--color-bg-canvas, rgba(0,0,0,0.2))',
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid var(--color-border-default)',
                minWidth: 0
              }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', minWidth: 0 }}>
                  <strong style={{ color: 'var(--color-text-secondary)', fontSize: '10px', display: 'block', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</strong>
                  <span style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.value}</span>
                </div>
                <button
                  className="about-action-btn"
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(c.value); }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    width: 'auto',
                    minWidth: '45px',
                    height: 'auto',
                    flexShrink: 0
                  }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.stashdb.label_endpoint') || 'StashDB API Endpoint'}
            </label>
            <input
              type="text"
              value={wizardInputs.stashdb_endpoint}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, stashdb_endpoint: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
              placeholder={t('about.docs_wizard.stashdb.placeholder_endpoint') || 'API Endpoint...'}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.stashdb.label_key') || 'StashDB API Key'}
            </label>
            <input
              type="text"
              value={wizardInputs.stashdb_api_key}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, stashdb_api_key: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.fansdb.label_endpoint') || 'FansDB API Endpoint'}
            </label>
            <input
              type="text"
              value={wizardInputs.fansdb_endpoint}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, fansdb_endpoint: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
              placeholder={t('about.docs_wizard.fansdb.placeholder_endpoint') || 'API Endpoint...'}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.fansdb.label_key') || 'FansDB API Key'}
            </label>
            <input
              type="text"
              value={wizardInputs.fansdb_api_key}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, fansdb_api_key: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.porndb.label_endpoint') || 'ThePornDB API Endpoint'}
            </label>
            <input
              type="text"
              value={wizardInputs.porndb_endpoint}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, porndb_endpoint: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
              placeholder={t('about.docs_wizard.porndb.placeholder_endpoint') || 'API Endpoint...'}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {t('about.docs_wizard.porndb.label_key') || 'ThePornDB API Key'}
            </label>
            <input
              type="text"
              value={wizardInputs.porndb_api_key}
              onChange={(e) => setWizardInputs(prev => ({ ...prev, porndb_api_key: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
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

  const docSubItems = [
    { id: 'docs_tmdb', label: 'TMDb API Key' },
    { id: 'docs_omdb', label: 'OMDb API Key' },
    { id: 'docs_stashdb', label: 'StashDB' },
    { id: 'docs_fansdb', label: 'FansDB' },
    { id: 'docs_porndb', label: 'ThePornDB' },
    { id: 'docs_offline', label: 'Offline Scan' },
    { id: 'docs_features', label: 'Feature Tour' },
  ];

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
    { id: 'docs', label: t('about.resources.docs') || 'Documentation', icon: <BookOpen size={18} />, subItems: docSubItems },
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
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isDocsTabActive = activeTab === 'docs' || activeTab.startsWith('docs_');

            if (tab.subItems) {
              const isSubMenuVisible = isDocsExpanded || isDocsTabActive;
              const activeSubIndex = tab.subItems.findIndex((sub) => sub.id === activeTab);

              return (
                <div key={tab.id}>
                  {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                  <div
                    className={`settings-sidebar-item${isDocsTabActive ? ' active' : ''}`}
                    onClick={() => {
                      setIsDocsExpanded(!isDocsExpanded);
                      if (!activeTab.startsWith('docs_')) {
                        setActiveTab('docs_tmdb');
                      }
                    }}
                  >
                    {Icon}
                    <span className="settings-sidebar-label">{tab.label}</span>
                    {isSubMenuVisible ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div
                    className={`settings-sidebar-sub-menu${isSubMenuVisible ? ' is-open' : ' is-closed'}`}
                    aria-hidden={!isSubMenuVisible}
                  >
                    {activeSubIndex !== -1 && (
                      <div
                        className={`settings-sidebar-sub-indicator settings-sidebar-sub-indicator--${activeSubIndex}`}
                      />
                    )}
                    {tab.subItems.map((sub) => {
                      return (
                        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                        <div
                          key={sub.id}
                          className={`settings-sidebar-sub-item${activeTab === sub.id ? ' active' : ''}`}
                          onClick={() => setActiveTab(sub.id)}
                        >
                          <span>{sub.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions
              <div
                key={tab.id}
                className={`settings-sidebar-item${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {Icon}
                <span className="settings-sidebar-label">{tab.label}</span>
              </div>
            );
          })}
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
            {activeTab === 'docs_tmdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">TMDb API Key</h2>
                  {renderWizard(tmdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_omdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">OMDb API Key</h2>
                  {renderWizard(omdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_stashdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">StashDB</h2>
                  {renderWizard(stashdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_fansdb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">FansDB</h2>
                  {renderWizard(fansdbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_porndb' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">ThePornDB</h2>
                  {renderWizard(porndbWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_offline' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">Offline Scan</h2>
                  {renderWizard(offlineWizardSteps)}
                </Card>
              </div>
            )}
            {activeTab === 'docs_features' && (
              <div className="about-tab-panel docs-panel">
                <Card className="about-card docs-card">
                  <h2 className="about-section-title">Feature Tour</h2>
                  <div className="docs-content-container">
                    <p className="docs-intro">Explore SWAYA's key features designed to organize, enrich, and enjoy your media collection.</p>
                    
                    <div className="docs-sections">
                      <div className="docs-section">
                        <h3>📊 1. Personal Dashboard</h3>
                        <p>Get a comprehensive overview of your media library. Personalize your layout by enabling, disabling, or rearranging widgets like Continue Watching, Trending Spotlight, and custom recommendations.</p>
                        <div className="docs-screenshot-placeholder" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-line-strong)', borderRadius: '8px', padding: '20px', textAlign: 'center', marginTop: '10px', color: 'var(--color-muted)', fontSize: '13px' }}>
                          📷 [Dashboard Screenshot Placeholder]
                        </div>
                      </div>

                      <div className="docs-section">
                        <h3>⚙️ 2. Organizer & Matcher</h3>
                        <p>Input your folder paths and let SWAYA scan and parse file structures. Easily match files with online databases, rename files dynamically to match clean metadata, and organize your physical library into clean directories.</p>
                        <div className="docs-screenshot-placeholder" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-line-strong)', borderRadius: '8px', padding: '20px', textAlign: 'center', marginTop: '10px', color: 'var(--color-muted)', fontSize: '13px' }}>
                          📷 [Organizer & Matcher Screenshot Placeholder]
                        </div>
                      </div>

                      <div className="docs-section">
                        <h3>🎬 3. Video Player & Previews</h3>
                        <p>Enjoy smooth high-quality playback powered by an embedded MPV player. Watch 16-second dynamic backdrops directly in the details page and resume playback instantly from where you left off.</p>
                        <div className="docs-screenshot-placeholder" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-line-strong)', borderRadius: '8px', padding: '20px', textAlign: 'center', marginTop: '10px', color: 'var(--color-muted)', fontSize: '13px' }}>
                          📷 [Player & Live Previews Screenshot Placeholder]
                        </div>
                      </div>

                      <div className="docs-section">
                        <h3>👤 4. Artists & Performers</h3>
                        <p>Follow your favorite directors, writers, actors, or performers. SWAYA builds detailed profiles containing physical attributes, complete list of appearances in your collection, and dynamic links.</p>
                        <div className="docs-screenshot-placeholder" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-line-strong)', borderRadius: '8px', padding: '20px', textAlign: 'center', marginTop: '10px', color: 'var(--color-muted)', fontSize: '13px' }}>
                          📷 [Artists Profiles Screenshot Placeholder]
                        </div>
                      </div>
                    </div>
                  </div>
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
      <ImageLightbox lightboxUrl={activeLightboxUrl} onClose={() => setActiveLightboxUrl(null)} t={t} />
    </div>
  );
}
