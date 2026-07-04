import { useState } from 'react';

export function useMediaDetailTabs({ cleanId, isMovie, isScene }) {
  const [activePanel, setActivePanel] = useState(() => {
    if (isScene) return null;
    if (isMovie) return 'details';
    return 'seasons';
  });
  const [isSideNavVisible, setIsSideNavVisible] = useState(true);

  const [prevCleanId, setPrevCleanId] = useState(cleanId);

  if (cleanId !== prevCleanId) {
    setPrevCleanId(cleanId);
    if (isScene) {
      setActivePanel(null);
    } else if (isMovie) {
      setActivePanel('details');
    } else {
      setActivePanel('seasons');
    }
  }

  const togglePanel = (panelName) => {
    setActivePanel(prev => prev === panelName ? null : panelName);
  };

  const handleToggleSideNav = () => {
    setIsSideNavVisible(prev => {
      const next = !prev;
      if (!next) {
        setActivePanel(null);
      }
      return next;
    });
  };

  return {
    activePanel,
    isSideNavVisible,
    togglePanel,
    handleToggleSideNav,
    setActivePanel
  };
}
