import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ORGANIZATION_TAB_IDS, ADULT_TAB_IDS, SETTINGS_TAB_IDS } from '../settingsConstants.js';

export default function useSettingsNavigation(form, isDirty) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(SETTINGS_TAB_IDS.GENERAL);
  const [isShaking, setIsShaking] = useState(false);

  const isOrganizationTabActive = useMemo(
    () => ORGANIZATION_TAB_IDS.includes(activeTab),
    [activeTab]
  );

  const isAdultTabActive = useMemo(
    () => ADULT_TAB_IDS.includes(activeTab),
    [activeTab]
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } else {
      navigate(-1);
    }
  }, [navigate, isDirty]);

  const [isOrgExpandedManual, setIsOrgExpandedManual] = useState(true);
  const [isAdultExpandedManual, setIsAdultExpandedManual] = useState(true);

  const isOrgExpanded = isOrganizationTabActive && isOrgExpandedManual;
  const isAdultExpanded = isAdultTabActive && isAdultExpandedManual;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  return {
    activeTab,
    setActiveTab,
    isOrgExpanded,
    setIsOrgExpanded: setIsOrgExpandedManual,
    isAdultExpanded,
    setIsAdultExpanded: setIsAdultExpandedManual,
    isOrganizationTabActive,
    isAdultTabActive,
    organizationTabs: ORGANIZATION_TAB_IDS,
    adultTabs: ADULT_TAB_IDS,
    handleClose,
    isShaking,
  };
}
