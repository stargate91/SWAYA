import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../providers/LanguageContext';
import {
  Info,
  ScrollText,
  Lock,
  Library,
  CircleHelp,
} from '../../ui/icons';
import { fetchJson } from '../../lib/http';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../queries';
import Lightbox from '../../ui/Lightbox';
import Overlay from '../../ui/Overlay';

import AboutSidebar from './components/AboutSidebar';
import GeneralPanel from './components/GeneralPanel';
import NoticesPanel from './components/NoticesPanel';
import ThirdPartyPanel from './components/ThirdPartyPanel';
import DocsWizardPanel from './components/DocsWizardPanel';
import FeaturesTourPanel from './components/FeaturesTourPanel';
import ChangelogPanel from './components/ChangelogPanel';

import AboutPageStyles from './AboutPage.module.css';

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
  const [activeLightboxUrl, setActiveLightboxUrl] = useState(null);
  const [activeTourIndex, setActiveTourIndex] = useState(0);
  const [activeSubFeatureIndex, setActiveSubFeatureIndex] = useState(null);
  const showAdult = Boolean(settings?.include_adult);
  const [showNsfwDocsState, setShowNsfwDocsState] = useState(null);
  const showNsfwDocs = showNsfwDocsState !== null ? showNsfwDocsState : showAdult;

  const handleSetActiveTab = (tabId) => {
    setActiveTab(tabId);
    setWizardStep(0);
    setActiveSubFeatureIndex(null);
    if (!tabId.startsWith('docs_')) {
      setIsDocsExpanded(false);
    }
  };

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

  const docSubItems = [
    { id: 'docs_tmdb', label: t('about.resources.docs_items.tmdb') || 'TMDb API Key' },
    { id: 'docs_omdb', label: t('about.resources.docs_items.omdb') || 'OMDb API Key' },
    { id: 'docs_stashdb', label: t('about.resources.docs_items.stashdb') || 'StashDB' },
    { id: 'docs_fansdb', label: t('about.resources.docs_items.fansdb') || 'FansDB' },
    { id: 'docs_porndb', label: t('about.resources.docs_items.porndb') || 'ThePornDB' },
    { id: 'docs_offline', label: t('about.resources.docs_items.offline') || 'Offline Scan' },
    { id: 'docs_features', label: t('about.resources.docs_items.features') || 'Feature Tour' },
  ];

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

  return (
    <Overlay onClose={handleClose}>
      <AboutSidebar
        activeTab={activeTab}
        isDocsExpanded={isDocsExpanded}
        setIsDocsExpanded={setIsDocsExpanded}
        handleSetActiveTab={handleSetActiveTab}
        tabs={tabs}
        t={t}
      />

      <Overlay.ContentWrapper>
        <Overlay.Content className={activeTab === 'docs_features' ? AboutPageStyles['wide-content'] : ''}>
          <div className="settings-tab-content">
            {activeTab === 'info' && (
              <GeneralPanel t={t} appInfo={appInfo} />
            )}

            {activeTab === 'changelog' && (
              <ChangelogPanel
                t={t}
                isLoadingChangelog={isLoadingChangelog}
                changelogError={changelogError}
                changelogContent={changelogContent}
              />
            )}

            {activeTab.startsWith('docs_') && activeTab !== 'docs_features' && (
              <DocsWizardPanel
                activeTab={activeTab}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                settings={settings}
                updateSettingsMutation={updateSettingsMutation}
                setActiveLightboxUrl={setActiveLightboxUrl}
                t={t}
              />
            )}

            {activeTab === 'docs_features' && (
              <FeaturesTourPanel
                activeTourIndex={activeTourIndex}
                setActiveTourIndex={setActiveTourIndex}
                activeSubFeatureIndex={activeSubFeatureIndex}
                setActiveSubFeatureIndex={setActiveSubFeatureIndex}
                showNsfwDocs={showNsfwDocs}
                setShowNsfwDocs={setShowNsfwDocsState}
                setActiveLightboxUrl={setActiveLightboxUrl}
                t={t}
              />
            )}

            {(activeTab === 'privacy' || activeTab === 'license') && (
              <NoticesPanel t={t} activeTab={activeTab} />
            )}

            {activeTab === 'third_party' && (
              <ThirdPartyPanel t={t} />
            )}
          </div>
        </Overlay.Content>
      </Overlay.ContentWrapper>
      <Lightbox imageUrl={activeLightboxUrl} onClose={() => setActiveLightboxUrl(null)} t={t} />
    </Overlay>
  );
}
