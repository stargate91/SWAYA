import { useState } from 'react';
import Card from '../../../ui/Card';
import Button from '@/ui/Button';
import {
  CAMERA_EMOJI,
  COLON_SEPARATOR,
  CHECKMARK_EMOJI,
  CROSS_EMOJI
} from '../utils/aboutHelpers';
import {
  getTmdbWizardSteps,
  getOmdbWizardSteps,
  getStashdbWizardSteps,
  getFansdbWizardSteps,
  getPorndbWizardSteps,
  getOfflineWizardSteps
} from '../utils/aboutData';
import baseStyles from '../AboutPage.module.css';
import styles from './DocsWizardPanel.module.css';

export default function DocsWizardPanel({
  activeTab,
  wizardStep,
  setWizardStep,
  settings,
  updateSettingsMutation,
  setActiveLightboxUrl,
  t
}) {
  const [wizardInputs, setWizardInputs] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'

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

  let steps = [];
  if (activeTab === 'docs_tmdb') {
    steps = getTmdbWizardSteps(t, getWizardInputValue, handleInputChange, handleSaveSetting);
  } else if (activeTab === 'docs_omdb') {
    steps = getOmdbWizardSteps(t, getWizardInputValue, handleInputChange, handleSaveSetting);
  } else if (activeTab === 'docs_stashdb') {
    steps = getStashdbWizardSteps(t, getWizardInputValue, handleInputChange, handleSaveSetting);
  } else if (activeTab === 'docs_fansdb') {
    steps = getFansdbWizardSteps(t, getWizardInputValue, handleInputChange, handleSaveSetting);
  } else if (activeTab === 'docs_porndb') {
    steps = getPorndbWizardSteps(t, getWizardInputValue, handleInputChange, handleSaveSetting);
  } else if (activeTab === 'docs_offline') {
    steps = getOfflineWizardSteps(t);
  }

  const currentStepIdx = wizardStep >= steps.length ? 0 : wizardStep;
  const step = steps[currentStepIdx];
  if (!step) return null;
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === steps.length - 1;

  return (
    <div className="about-tab-panel docs-panel">
      <Card className={`${baseStyles['about-card']} docs-card`}>
        <h2 className={baseStyles['about-section-title']}>{t(`about.resources.docs_items.${activeTab.replace('docs_', '')}`) || step.title}</h2>
        <div className={styles['docs-wizard-container']}>
          {steps.length > 1 && (
            <div className={styles['docs-wizard-progress']}>
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`${styles['docs-wizard-progress-step']} ${idx === currentStepIdx ? styles['is-active'] : idx < currentStepIdx ? styles['is-passed'] : ''}`}
                />
              ))}
            </div>
          )}

          <div className={styles['docs-wizard-slide']}>
            <h3 className={styles['docs-wizard-slide-title']}>
              {step.title}
            </h3>

            <p className={styles['docs-wizard-slide-desc']}>
              {step.description}
            </p>

            {step.links && (
              <div className={styles['docs-wizard-slide-links']}>
                {step.links.map((link, lidx) => (
                  <Button
                    key={lidx}
                    variant="secondary"
                    className={styles['docs-wizard-link-btn-inline']}
                    onClick={(e) => { e.preventDefault(); window.open(link.url, '_blank', 'noopener,noreferrer'); }}
                  >
                    <span>{link.label}</span>
                  </Button>
                ))}
              </div>
            )}

            {step.image ? (
              <button
                type="button"
                className={styles['about-wizard-image-btn']}
                onClick={() => setActiveLightboxUrl(step.image)}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className={styles['about-wizard-image']}
                />
              </button>
            ) : step.screenshotPlaceholder && (
              <div className={styles['docs-wizard-screenshot-placeholder']}>
                {CAMERA_EMOJI}{t('about.docs_wizard.screenshot_placeholder') || 'Screenshot'}{COLON_SEPARATOR}{step.screenshotPlaceholder}
              </div>
            )}

            {step.renderInputs && step.renderInputs()}

            {step.onSave && (
              <div className={styles['docs-wizard-save-container']}>
                <Button
                  variant="primary"
                  className={styles['docs-wizard-save-btn']}
                  onClick={step.onSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (t('about.docs_wizard.saving') || 'Saving...') : (t('about.docs_wizard.save') || 'Save')}
                </Button>
                {saveStatus === 'success' && <span className={styles['docs-wizard-save-status-success']}>{CHECKMARK_EMOJI}{t('about.docs_wizard.saved') || 'Saved successfully!'}</span>}
                {saveStatus === 'error' && <span className={styles['docs-wizard-save-status-error']}>{CROSS_EMOJI}{t('about.docs_wizard.save_failed') || 'Failed to save'}</span>}
              </div>
            )}
          </div>

          {steps.length > 1 && (
            <div className={styles['docs-wizard-footer']}>
              {!isFirst ? (
                <Button
                  variant="secondary"
                  className={styles['docs-wizard-btn-back']}
                  onClick={() => {
                    setWizardStep(currentStepIdx - 1);
                    setSaveStatus(null);
                  }}
                >
                  {t('about.docs_wizard.back') || 'Back'}
                </Button>
              ) : <div />}

              {!isLast && (
                <Button
                  variant="secondary"
                  className={styles['docs-wizard-btn-next']}
                  onClick={() => {
                    setWizardStep(currentStepIdx + 1);
                    setSaveStatus(null);
                  }}
                >
                  {isFirst ? (t('about.docs_wizard.start') || "Let's get it!") : (t('about.docs_wizard.next') || 'Next Step')}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
