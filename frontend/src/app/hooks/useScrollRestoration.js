import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationStateStore } from '@/stores/useNavigationStateStore';

export function useScrollRestoration(selector, dependencies = []) {
  const location = useLocation();
  const currentPath = location.pathname;
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') return undefined;

    const container = document.querySelector(selector);
    if (!container) return undefined;

    // Restore scroll position
    const savedState = useNavigationStateStore.getState().getPageState(currentPath);
    if (savedState.scrollTop !== undefined) {
      container.scrollTop = savedState.scrollTop;

      let frameId;
      let count = 0;
      const target = savedState.scrollTop;

      const performScroll = () => {
        if (!container) return;
        container.scrollTop = target;
        if (Math.abs(container.scrollTop - target) < 1 || count++ > 5) {
          return;
        }
        frameId = requestAnimationFrame(performScroll);
      };

      frameId = requestAnimationFrame(performScroll);
      return () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
      };
    }
    return undefined;
  }, [currentPath, selector, navType, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const container = document.querySelector(selector);
    if (!container) return undefined;

    const handleScroll = () => {
      useNavigationStateStore.getState().setPageState(currentPath, {
        scrollTop: container.scrollTop
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentPath, selector, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
}
