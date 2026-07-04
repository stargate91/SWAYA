import { useEffect } from 'react';

export default function useClickOutside(ref, callback, excludeClass = 'ui-dropdown__menu') {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        if (excludeClass && event.target.closest(`.${excludeClass}`)) {
          return;
        }
        callback();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback, excludeClass]);
}
