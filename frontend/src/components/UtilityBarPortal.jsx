import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UtilityBarPortal({ children, enabled = true, align = 'left' }) {
  const [targetEl, setTargetEl] = useState(null);

  useEffect(() => {
    if (enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetEl(document.querySelector(`.shell__utility-bar-${align}`));
    } else {
      setTargetEl(null);
    }
  }, [enabled, align]);

  if (!targetEl) return null;

  return createPortal(children, targetEl);
}
