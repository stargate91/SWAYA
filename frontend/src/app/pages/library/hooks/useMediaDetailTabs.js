import { useState, useEffect } from 'react';

export function useMediaDetailTabs({ cleanId, isMovie, isScene }) {
  const [activePanel, setActivePanel] = useState(() => {
    if (isScene) return null;
    if (isMovie) return 'details';
    return 'seasons';
  });
  const [isSideNavVisible, setIsSideNavVisible] = useState(true);

  // Sync active panel when cleanId changes
  useEffect(() => {
    if (isScene) {
      setActivePanel(null);
    } else if (isMovie) {
      setActivePanel('details');
    } else {
      setActivePanel('seasons');
    }
  }, [cleanId, isMovie, isScene]);

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
