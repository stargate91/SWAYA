import { Suspense, useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QK, invalidateEntity } from '@/lib/queryKeys';
import AppClosePrompt from './AppClosePrompt';
import WindowTitlebar from './WindowTitlebar';
import PlayerControlBar from './PlayerControlBar';
import Sidebar from './Sidebar';
import Spinner from '../ui/Spinner';
import { useSettingsQuery, useScanStatusQuery } from '../queries';
import { useUi } from '../providers/UiProvider';
import { useTranslation } from '../providers/LanguageContext';
import api from '../lib/api';
import { useNavigationStore } from '../stores/useNavigationStore';

const getBulkImportBannerStorageKey = (adultOnly) => adultOnly ? 'showBulkImportBanner:nsfw' : 'showBulkImportBanner:sfw';

function PeopleImportCompletionWatcher() {
  const queryClient = useQueryClient();
  const { toast } = useUi();
  const { t } = useTranslation();
  const scanStatusQuery = useScanStatusQuery();
  const prevScanStatusActive = useRef(false);
  const prevScanStatusPhase = useRef('');
  const prevPeopleAdultOnly = useRef(false);
  const prevLastCompleted = useRef(scanStatusQuery.data?.last_completed || 0);
  const completedImportHandledRef = useRef(false);

  useEffect(() => {
    const data = scanStatusQuery.data;
    if (!data) return;

    const didPeopleImportFinish =
      prevScanStatusActive.current &&
      prevScanStatusPhase.current === 'people_importing' &&
      !data.active;
    const didBackgroundPeopleImportFinish =
      prevLastCompleted.current !== 0 &&
      (data.last_completed || 0) > prevLastCompleted.current &&
      prevScanStatusPhase.current === 'people_importing';

    if (data.active && data.phase === 'people_importing') {
      completedImportHandledRef.current = false;
      prevPeopleAdultOnly.current = Boolean(data.people_adult_only);
    }

    if ((didPeopleImportFinish || didBackgroundPeopleImportFinish) && !completedImportHandledRef.current) {
      completedImportHandledRef.current = true;
      const adultOnly = prevPeopleAdultOnly.current;
      api.people.bulkImportReport('all', { adultOnly }).then((rep) => {
        if (rep && rep.status === 'completed' && rep.report) {
          const hasUnresolved = (rep.report.multiple_match_count > 0) || (rep.report.no_match_count > 0);
          if (hasUnresolved) {
            localStorage.setItem(getBulkImportBannerStorageKey(adultOnly), 'true');
          }
          window.dispatchEvent(new CustomEvent('people-bulk-import-complete', {
            detail: { hasUnresolved, adultOnly }
          }));
          queryClient.invalidateQueries({ queryKey: QK.library });
          queryClient.invalidateQueries({ queryKey: QK.stats });
          toast(t(adultOnly ? 'library.addPeople.adultBulkFinishedToast' : 'library.addPeople.bulkFinishedToast'), 'success');
        }
      }).catch(() => {
        // Ignore completion-report failures here.
      });
    }

    if (data.last_completed) {
      prevLastCompleted.current = data.last_completed;
    }
    prevScanStatusActive.current = data.active;
    prevScanStatusPhase.current = data.phase;
  }, [queryClient, scanStatusQuery.data, t, toast]);

  return null;
}

export default function AppShell() {
  const { data: settings } = useSettingsQuery();
  const theme = settings?.ui_theme || 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const pushPath = useNavigationStore((state) => state.pushPath);
  const navType = useNavigationType();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (navType !== 'POP') {
      pushPath(location.pathname + location.search);
    }
  }, [location, pushPath, navType]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('theme-changed', theme);
    } catch {
      // Ignored outside Electron
    }
  }, [theme]);

  const [playerState, setPlayerState] = useState({
    active: false,
    itemId: null,
    title: '',
    duration: 0,
    currentTime: 0,
    isPaused: false,
    isPip: false,
    isMinimized: false
  });

  useEffect(() => {
    let ipcRenderer = null;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch (err) {
      console.error(err);
    }

    if (!ipcRenderer) return;

    const handlePlayerStateUpdate = (event, data) => {
      setPlayerState((prev) => {
        if (data.event === 'start') {
          return {
            active: true,
            itemId: data.itemId,
            title: data.title,
            duration: data.duration,
            currentTime: data.currentTime,
            isPaused: data.isPaused,
            isPip: data.isPip,
            isMinimized: data.isMinimized
          };
        }
        if (data.event === 'close') {
          queryClient.invalidateQueries({ queryKey: ['library'] });
          queryClient.invalidateQueries({ queryKey: QK.stats });
          queryClient.invalidateQueries({ queryKey: QK.watchedHistory });
          if (prev.itemId) {
            invalidateEntity(queryClient, prev.itemId);
          }
          return { ...prev, active: false };
        }
        if (data.event === 'time-pos') {
          return { ...prev, currentTime: data.currentTime };
        }
        if (data.event === 'duration') {
          return { ...prev, duration: data.duration };
        }
        if (data.event === 'pause') {
          return { ...prev, isPaused: data.isPaused };
        }
        if (data.event === 'pip-change') {
          return { ...prev, isPip: data.isPip };
        }
        if (data.event === 'minimize-change') {
          return { ...prev, isMinimized: data.isMinimized };
        }
        return prev;
      });
    };

    ipcRenderer.on('player-state-update', handlePlayerStateUpdate);
    return () => {
      ipcRenderer.off('player-state-update', handlePlayerStateUpdate);
    };
  }, [queryClient]);

  const handleTogglePlay = () => {
    try {
      const ipcRenderer = window.require('electron').ipcRenderer;
      ipcRenderer.send('mpv-command', ['cycle', 'pause']);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMaximize = () => {
    try {
      const ipcRenderer = window.require('electron').ipcRenderer;
      ipcRenderer.send('mpv-restore');
    } catch (err) {
      console.error(err);
    }
  };

  const handleClosePlayer = () => {
    try {
      const ipcRenderer = window.require('electron').ipcRenderer;
      ipcRenderer.send('mpv-close');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (settings && !settings.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [settings, navigate]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (err) {
      console.error(err);
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  return (
    <div className={`shell ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <PeopleImportCompletionWatcher />
      <button
        type="button"
        tabIndex={0}
        autoFocus
        className="shell__focus-sentinel"
        aria-hidden="true"
      />
      <WindowTitlebar />
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />

      <div className="shell__main">
        <main className="shell__content">
          <header className="shell__utility-bar">
            <div className="shell__utility-bar-left" aria-label="Context actions placeholder" />
            <div className="shell__utility-bar-center" id="shell-utility-bar-center" />
          </header>
          <Suspense fallback={
            <div className="shell__suspense-fallback">
              <Spinner label="Loading page..." />
            </div>
          }>
            <Outlet />
          </Suspense>
          <footer className="shell__utility-bar-bottom">
            <div className="shell__utility-bar-bottom-left" aria-label="Context bottom-left actions placeholder" />
            <div className="shell__utility-bar-bottom-center" id="shell-utility-bar-bottom-center" />
            <div className="shell__utility-bar-bottom-right" aria-label="Context bottom-right actions placeholder" />
          </footer>
        </main>
      </div>
      <PlayerControlBar
        state={playerState}
        onTogglePlay={handleTogglePlay}
        onMaximize={handleMaximize}
        onClose={handleClosePlayer}
      />
      <AppClosePrompt />
    </div>
  );
}
