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
      const timers = [50, 150, 300, 600].map((delay) =>
        setTimeout(() => {
          if (container) {
            container.scrollTop = savedState.scrollTop;
          }
        }, delay)
      );
      return () => timers.forEach(clearTimeout);
    }
    return undefined;
  }, [currentPath, selector, navType, ...dependencies]);

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
  }, [currentPath, selector, ...dependencies]);
}
