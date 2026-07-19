import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationStateStore } from '@/stores/useNavigationStateStore';

export function useScrollRestoration(selector, dependencies = []) {
  const location = useLocation();
  const currentPath = location.pathname;
  const navType = useNavigationType();
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (navType !== 'POP') return undefined;

    // If any dependency is true, it indicates a loading state. Wait until loading is false.
    const isLoading = dependencies.some(dep => dep === true);
    console.log('[scrollRestoration] POP event', { currentPath, isLoading, dependencies });
    if (isLoading) return undefined;

    const container = document.querySelector(selector);
    if (!container) return undefined;

    // Restore scroll position
    const savedState = useNavigationStateStore.getState().getPageState(currentPath);
    console.log('[scrollRestoration] Saved state found:', savedState);
    if (savedState.scrollTop !== undefined) {
      isRestoringRef.current = true;
      container.scrollTop = savedState.scrollTop;

      let frameId;
      let count = 0;
      const target = savedState.scrollTop;

      // Find the main page content container instead of the absolute header
      const contentEl = container.firstElementChild;

      if (savedState.scrollHeight !== undefined && contentEl) {
        contentEl.style.minHeight = `${savedState.scrollHeight}px`;
      }

      console.log('[scrollRestoration] Restoring scroll to:', target, 'scrollHeight:', savedState.scrollHeight);

      const performScroll = () => {
        if (!container) return;
        container.scrollTop = target;
        console.log('[scrollRestoration] Scroll iteration:', count, 'current scrollTop:', container.scrollTop);
        if (Math.abs(container.scrollTop - target) < 1 || count++ > 5) {
          if (contentEl) {
            contentEl.style.minHeight = '';
          }
          isRestoringRef.current = false;
          console.log('[scrollRestoration] Restoration finished');
          return;
        }
        frameId = requestAnimationFrame(performScroll);
      };

      frameId = requestAnimationFrame(performScroll);
      return () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
        if (contentEl) {
          contentEl.style.minHeight = '';
        }
        isRestoringRef.current = false;
      };
    }
    return undefined;
  }, [currentPath, selector, navType, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const container = document.querySelector(selector);
    if (!container) return undefined;

    const handleScroll = () => {
      if (isRestoringRef.current) return;
      if (dependencies.some(dep => dep === true)) return;

      // Support both HashRouter (for Electron) and BrowserRouter
      const getActualSubPath = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#')) {
          return hash.slice(1).split('?')[0];
        }
        return window.location.pathname;
      };

      if (getActualSubPath() !== currentPath) return;

      console.log('[scrollRestoration] Saving scroll:', container.scrollTop, 'scrollHeight:', container.scrollHeight);
      useNavigationStateStore.getState().setPageState(currentPath, {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentPath, selector, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
}
