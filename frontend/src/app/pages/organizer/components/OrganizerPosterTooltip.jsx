import { forwardRef } from 'react';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '../../../lib/backend';
import styles from './OrganizerPosterTooltip.module.css';

const OrganizerPosterTooltip = forwardRef(function OrganizerPosterTooltip({ activeRow, visible, initialX, initialY }, ref) {
  if (!visible || !activeRow) return null;

  const images = activeRow.images || [];
  if (images.length === 0) return null;

  const imageUrl = resolveMediaImageUrl(images[0].path, 'poster', API_BASE);

  const style = {
    transform: `translate3d(${initialX + 15}px, ${initialY + 15}px, 0)`,
  };

  return (
    <div ref={ref} className={styles['organizer-poster-tooltip']} style={style}>
      <img
        src={imageUrl}
        alt="Preview"
        className={styles['organizer-poster-tooltip__image']}
      />
    </div>
  );
});

export default OrganizerPosterTooltip;
