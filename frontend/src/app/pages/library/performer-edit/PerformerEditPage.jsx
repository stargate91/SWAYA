import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersonDetailQuery } from '@/queries/metadataQueries';
import { Link2, GitMerge, Sliders } from '@/ui/icons';
import PerformerLinkingTab from './tabs/PerformerLinkingTab';
import PerformerMixerTab from './tabs/PerformerMixerTab';
import PerformerCustomValuesTab from './tabs/PerformerCustomValuesTab';
import { useTranslation } from '@/providers/LanguageContext';
import Sidebar from '@/ui/Sidebar';
import Overlay from '@/ui/Overlay';
import './PerformerEditPage.css';

export default function PerformerEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: person, isLoading, error } = usePersonDetailQuery(id);
  const [activeTab, setActiveTab] = useState('linking');
  const [isCustomDirty, setIsCustomDirty] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [prevPerson, setPrevPerson] = useState(null);

  if (person !== prevPerson) {
    setPrevPerson(person);
    if (person && !person.is_adult && activeTab === 'linking') {
      setActiveTab('mixer');
    }
  }

  const handleClose = useCallback(() => {
    if (isCustomDirty) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } else {
      navigate(-1);
    }
  }, [navigate, isCustomDirty]);

  const handleTabClick = (tabId) => {
    if (isCustomDirty) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } else {
      setActiveTab(tabId);
    }
  };

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

  if (isLoading) {
    return (
      <div className="settings-overlay settings-overlay--centered">
        <div className="settings-loading-state">
          <span className="settings-loading-text">{t('library.performerEdit.loadingPerformer') || 'Loading Performer...'}</span>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="settings-overlay settings-overlay--centered">
        <div className="settings-error-card">
          <div className="settings-error-content">
            <h3>{t('library.performerEdit.failedToLoadPerformer') || 'Failed to load performer'}</h3>
            <button className="btn btn--primary" onClick={handleClose}>{t('common.back') || 'Back'}</button>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    ...(person.is_adult ? [{ id: 'linking', label: t('library.performerEdit.linkedProfiles') || 'Linked Profiles', icon: Link2 }] : []),
    { id: 'mixer', label: t('library.performerEdit.dataMixer') || 'Data Mixer', icon: GitMerge },
    { id: 'custom', label: t('library.performerEdit.customValues') || 'Custom Values', icon: Sliders },
  ];

  const sidebarGroups = TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    isActive: activeTab === tab.id,
  }));

  const sidebarHeader = (
    <>
      <h1 className="ui-sidebar-header performer-edit-sidebar-header">
        {person.is_adult ? (t('library.performerEdit.editPerformer') || 'Edit Star') : (t('library.performerEdit.editArtist') || 'Edit Artist')}
      </h1>
      <div className="performer-edit-sidebar-title-container">
        <h2 className="performer-edit-sidebar-name">{person.name}</h2>
      </div>
    </>
  );

  return (
    <Overlay onClose={handleClose} escHint={t('library.performerEdit.esc')}>
      <Sidebar
        header={sidebarHeader}
        groups={sidebarGroups}
        onTabSelect={handleTabClick}
      />

      <Overlay.ContentWrapper>
        <Overlay.Content className="performer-edit-content-wrapper--wide">
          {activeTab === 'linking' && (
            <div className="performer-edit-section">
              <h3 className="settings-section-title performer-edit-section-title">{t('library.performerEdit.linkedProfiles') || 'Linked Profiles'}</h3>
              <p className="settings-section-subtitle performer-edit-section-subtitle">{t('library.performerEdit.linkedProfilesSubtitle') || 'Manage connections to external performer registries to import attributes automatically.'}</p>
              <PerformerLinkingTab
                personId={person.id}
                defaultQuery={person.name}
                person={person}
                onClose={handleClose}
              />
            </div>
          )}

          {activeTab === 'mixer' && (
            <div className="performer-edit-section">
              <h3 className="settings-section-title performer-edit-section-title">{t('library.performerEdit.dataMixerGrid') || 'Data Mixer Grid'}</h3>
              <p className="settings-section-subtitle performer-edit-section-subtitle">{t('library.performerEdit.dataMixerGridSubtitle') || 'Select which provider source takes priority on a per-field basis.'}</p>
              <PerformerMixerTab
                person={person}
                onBack={handleClose}
              />
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="performer-edit-section">
              <PerformerCustomValuesTab
                personId={person.id}
                person={person}
                onDirtyChange={setIsCustomDirty}
                isShaking={isShaking}
              />
            </div>
          )}
        </Overlay.Content>
      </Overlay.ContentWrapper>
    </Overlay>
  );
}
