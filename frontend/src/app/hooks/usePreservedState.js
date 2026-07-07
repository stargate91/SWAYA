import { useState, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationStateStore } from '@/stores/useNavigationStateStore';

export function usePreservedState(stateKey, defaultValue) {
  const location = useLocation();
  const currentPath = location.pathname;
  const navType = useNavigationType();

  const savedState = useNavigationStateStore.getState().getPageState(currentPath);
  const savedValue = savedState[stateKey];
  
  // Reset to default on PUSH navigations (direct clicks/sidebar/search)
  const initialValue = navType === 'PUSH' ? defaultValue : (savedValue !== undefined ? savedValue : defaultValue);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    useNavigationStateStore.getState().setPageState(currentPath, {
      [stateKey]: value
    });
  }, [currentPath, stateKey, value]);

  return [value, setValue];
}
