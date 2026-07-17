import { usePlayMediaMutation } from '@/queries';
import Grid from '@/ui/Grid';
import PersonCreditsCard from './PersonCreditsCard';
import './PersonCreditsRow.css';

export default function PersonCreditsRow({
  items,
  mediaType,
  navigate,
  t
}) {
  const isScene = mediaType === 'scenes' || mediaType.includes('scene');
  const playMutation = usePlayMediaMutation();

  return (
    <Grid variant={isScene ? 'auto-scene' : 'auto-poster'}>
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
    </Grid>
  );
}
