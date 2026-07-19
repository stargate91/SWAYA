import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UtilityBarBottomPortal({ children, side = 'left', enabled = true }) {
  const [targetEl, setTargetEl] = useState(null);

  useEffect(() => {
    if (enabled) {
      let selector = 'page-bar-bottom-left';
      if (side === 'center') {
        selector = 'page-bar-bottom-center';
      } else if (side === 'right') {
        selector = 'page-bar-bottom-right';
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetEl(document.getElementById(selector));
    } else {
      setTargetEl(null);
    }
  }, [enabled, side]);

  if (!targetEl) return null;

  return createPortal(children, targetEl);
}
