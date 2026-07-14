import { ENTITY_ICONS } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import styles from './ListsSidebar.module.css';

export default function ListCollageIcon({ samplePosters, listType, color, customImagePath, iconSize = 20 }) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const iconColor = color || 'var(--color-accent-blue)';

  if (customImagePath) {
    const isAdult = customImagePath.includes('#adult');
    const shouldBlur = isAdult && sessionMode !== 'nsfw';
    return (
      <div className={`${styles['lists-sidebar__collage']} ${styles['lists-sidebar__collage--1']}`}>
        <img
          src={resolveMediaImageUrl(customImagePath)}
          className={`${styles['lists-sidebar__collage-img']} ${styles['lists-sidebar__collage-img--0']} ${shouldBlur ? styles['lists-sidebar__collage-img--blurred-heavy'] : ''}`}
          alt=""
        />
      </div>
    );
  }

  if (samplePosters && samplePosters.length > 0) {
    const count = Math.min(4, samplePosters.length);
    return (
      <div className={`${styles['lists-sidebar__collage']} ${styles[`lists-sidebar__collage--${count}`]}`}>
        {samplePosters.slice(0, 4).map((path, idx) => {
          const isAdult = path.includes('#adult');
          const shouldBlur = isAdult && sessionMode !== 'nsfw';
          return (
            <img
              key={idx}
              src={resolveMediaImageUrl(path, 'posterThumb')}
              className={`${styles['lists-sidebar__collage-img']} ${styles[`lists-sidebar__collage-img--${idx}`]} ${shouldBlur ? (count === 1 ? styles['lists-sidebar__collage-img--blurred-heavy'] : styles['lists-sidebar__collage-img--blurred-light']) : ''}`}
              alt=""
            />
          );
        })}
      </div>
    );
  }

  const FallbackIcon = listType === 'person' ? ENTITY_ICONS.performer : ENTITY_ICONS.movie;

  return (
    <div
      className={`${styles['lists-sidebar__collage']} ${styles['lists-sidebar__collage--fallback']}`}
      // eslint-disable-next-line react/forbid-dom-props
      style={{
        backgroundColor: `color-mix(in srgb, ${iconColor} 15%, rgba(255, 255, 255, 0.02))`,
        border: `1px solid color-mix(in srgb, ${iconColor} 30%, rgba(255, 255, 255, 0.08))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
      }}
    >
      {/* eslint-disable-next-line react/forbid-component-props */}
      <FallbackIcon size={iconSize} color={iconColor} style={{ opacity: 0.95 }} />
    </div>
  );
}
