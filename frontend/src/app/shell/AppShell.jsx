import { Suspense, useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QK, invalidateEntity } from '@/lib/queryKeys';
import AppClosePrompt from './AppClosePrompt';
import WindowTitlebar from './WindowTitlebar';
import PlayerControlBar from './PlayerControlBar';
import Sidebar from './Sidebar';
import Spinner from '../ui/Spinner';
import { useSettingsQuery } from '../queries';
import { useScanStatusQuery, useHydrateStatusQuery } from '../queries/scanQueries';
import { useNavigationStore } from '../stores/useNavigationStore';
import styles from './AppShell.module.css';
import { useRef } from 'react';

export default function AppShell() {
  const { data: settings } = useSettingsQuery();
  const theme = settings?.ui_theme || 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const syncPath = useNavigationStore((state) => state.syncPath);
  const navType = useNavigationType();
  const queryClient = useQueryClient();

  const scanStatusQuery = useScanStatusQuery();
  const hydrateStatusQuery = useHydrateStatusQuery();

  const prevScanActiveRef = useRef(false);
  const prevHydrateActiveRef = useRef(false);

  useEffect(() => {
    const scanActive = Boolean(scanStatusQuery.data?.active);
    const wasScanActive = prevScanActiveRef.current;
    
    if (wasScanActive && !scanActive) {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['person-detail'] });
      queryClient.invalidateQueries({ queryKey: ['person-credits'] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail'] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail'] });
    }
    
    prevScanActiveRef.current = scanActive;
  }, [scanStatusQuery.data?.active, queryClient]);

  useEffect(() => {
    const hydrateActive = Boolean(hydrateStatusQuery.data?.active);
    const wasHydrateActive = prevHydrateActiveRef.current;
    
    if (wasHydrateActive && !hydrateActive) {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['person-detail'] });
      queryClient.invalidateQueries({ queryKey: ['person-credits'] });
    }
    
    prevHydrateActiveRef.current = hydrateActive;
  }, [hydrateStatusQuery.data?.active, queryClient]);

  useEffect(() => {
    syncPath(location.pathname + location.search, navType);
  }, [location, syncPath, navType]);

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
          queryClient.invalidateQueries({ queryKey: QK.continueWatching });
          if (prev.itemId) {
            invalidateEntity(queryClient, prev.itemId, { continueWatching: true, watchedHistory: true });
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
    <div className={`${styles.shell} shell ${isSidebarCollapsed ? styles['is-sidebar-collapsed'] : ''}`}>
      <button
        type="button"
        tabIndex={0}
        autoFocus
        className={styles['focus-sentinel']}
        aria-hidden="true"
      />
      <WindowTitlebar />
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />

      <div className={styles.main}>
        <main className={`${styles.content} shell__content`}>
          <Suspense fallback={
            <div className={styles['suspense-fallback']}>
              <Spinner label="Loading page..." />
            </div>
          }>
            <Outlet />
          </Suspense>
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
