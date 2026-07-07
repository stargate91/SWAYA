import { ENTITY_ICONS } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

export default function ListCollageIcon({ samplePosters, listType, color, customImagePath, iconSize = 20 }) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const iconColor = color || 'var(--color-accent-blue)';

  if (customImagePath) {
    const isAdult = customImagePath.includes('#adult');
    const shouldBlur = isAdult && sessionMode !== 'nsfw';
    return (
      <div className="lists-sidebar__collage lists-sidebar__collage--1">
        <img
          src={resolveMediaImageUrl(customImagePath)}
          className="lists-sidebar__collage-img lists-sidebar__collage-img--0"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...(shouldBlur ? { filter: 'blur(10px) brightness(0.6)' } : {})
          }}
          alt=""
        />
      </div>
    );
  }

  if (samplePosters && samplePosters.length > 0) {
    return (
      <div className={`lists-sidebar__collage lists-sidebar__collage--${Math.min(4, samplePosters.length)}`}>
        {samplePosters.slice(0, 4).map((path, idx) => {
          const isAdult = path.includes('#adult');
          const shouldBlur = isAdult && sessionMode !== 'nsfw';
          return (
            <img
              key={idx}
              src={resolveMediaImageUrl(path, 'posterThumb')}
              className={`lists-sidebar__collage-img lists-sidebar__collage-img--${idx}`}
              style={shouldBlur ? { filter: 'blur(6px) brightness(0.6)' } : undefined}
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
      className="lists-sidebar__collage lists-sidebar__collage--fallback"
      style={{
        backgroundColor: `color-mix(in srgb, ${iconColor} 15%, rgba(255, 255, 255, 0.02))`,
        border: `1px solid color-mix(in srgb, ${iconColor} 30%, rgba(255, 255, 255, 0.08))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: '6px',
      }}
    >
      <FallbackIcon size={iconSize} color={iconColor} style={{ opacity: 0.95 }} />
    </div>
  );
}
