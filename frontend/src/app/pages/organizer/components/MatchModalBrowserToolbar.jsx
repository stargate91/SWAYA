import Button from '../../../ui/Button';
import CardMetadata from '../../../ui/CardMetadata';
import { ArrowLeft } from '../../../ui/icons';
import Inline from '../../../ui/Inline';
import Stack from '../../../ui/Stack';
import Text from '../../../ui/Text';

export default function MatchModalBrowserToolbar({
  view,
  browserTitle,
  browserMetaItems,
  tvCandidate,
  selectedSeason,
  bucketEpisodeNumbers,
  onBack,
  onResolve,
  onApplyBucket,
  t,
}) {
  if (view === 'results') {
    return null;
  }

  return (
    <Inline justify="between" align="center" gap="md" fullWidth>
      <Button variant="secondary-neutral" size="sm" leftIcon={<ArrowLeft size={14} />} animateIcon onClick={onBack}>
        {t('common.back')}
      </Button>
      <Stack gap="2xs" flex={1} className="u-min-w-0">
        <Text weight="bold" truncate>
          {browserTitle}
        </Text>
        <CardMetadata.Row items={browserMetaItems} />
      </Stack>
      {view === 'seasons' ? (
        <Button
          type="button"
          variant="secondary-neutral"
          size="sm"
          onClick={() => onResolve(tvCandidate, { season: null, episode: null })}
        >
          {t('organizer.details.matchModal.useTv')}
        </Button>
      ) : null}
      {view === 'episodes' ? (
        <Inline align="center" gap="sm" className="u-flex-shrink-0">
          <Button
            type="button"
            variant="secondary-neutral"
            size="sm"
            onClick={() => onResolve(tvCandidate, {
              season: selectedSeason?.season_number,
              episode: null,
            })}
          >
            {t('organizer.details.matchModal.useSeason')}
          </Button>
          <Button
            type="button"
            variant="secondary-neutral"
            size="sm"
            disabled={bucketEpisodeNumbers.length === 0}
            onClick={onApplyBucket}
          >
            {t('organizer.details.matchModal.useBucket')}
          </Button>
        </Inline>
      ) : null}
    </Inline>
  );
}
