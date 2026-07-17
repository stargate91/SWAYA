import Chip from '../../../ui/Chip';
import Inline from '../../../ui/Inline';
import Card from '../../../ui/Card';
import Text from '../../../ui/Text';
import Stack from '../../../ui/Stack';

const getEpisodeLabel = (num) => `E${num}`;

export default function MatchModalBucket({
  view,
  bucketEpisodeNumbers,
  onToggle,
  t,
}) {
  if (view !== 'episodes' || bucketEpisodeNumbers.length === 0) {
    return null;
  }

  return (
    <Card variant="soft" padding="md">
      <Stack gap="sm">
        <Text variant="small" weight="bold">
          {t('organizer.details.matchModal.bucketTitle')}
        </Text>
        <Inline gap="sm">
          {bucketEpisodeNumbers.map((episodeNumber) => (
            <Chip
              key={`bucket-${episodeNumber}`}
              onRemove={() => onToggle(episodeNumber)}
            >
              {getEpisodeLabel(episodeNumber)}
            </Chip>
          ))}
        </Inline>
      </Stack>
    </Card>
  );
}
