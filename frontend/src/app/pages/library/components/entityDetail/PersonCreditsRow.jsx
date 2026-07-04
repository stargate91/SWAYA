import { usePlayMediaMutation } from '@/queries';
import PersonCreditsCard from './PersonCreditsCard';

export default function PersonCreditsRow({
  items,
  mediaType,
  navigate,
  t
}) {
  const isScene = mediaType === 'scenes' || mediaType.includes('scene');
  const playMutation = usePlayMediaMutation();

  return (
    <div className={`person-credits-discover-grid ${isScene ? 'grid-16-9' : 'grid-2-3'}`}>
      {items.map((item) => (
        <PersonCreditsCard
          key={`${item.id}-${item.type || mediaType}`}
          item={item}
          mediaType={mediaType}
          navigate={navigate}
          playMutation={playMutation}
          t={t}
          alwaysShowSourceBadge={true}
          showLibraryBadge={false}
          placeholderIconSize={18}
        />
      ))}
    </div>
  );
}
