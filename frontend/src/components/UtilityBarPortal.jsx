import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UtilityBarPortal({ children, enabled = true, align = 'left' }) {
  const [targetEl, setTargetEl] = useState(null);

  useEffect(() => {
    if (enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetEl(document.getElementById(`page-bar-top-${align}`));
    } else {
      setTargetEl(null);
    }
  }, [enabled, align]);

  if (!targetEl) return null;

  return createPortal(children, targetEl);
}
