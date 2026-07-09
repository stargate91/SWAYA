import Button from '../../../ui/Button';
import CardMetadata from '../../../ui/CardMetadata';
import NavButton from '../../../ui/NavButton';

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
    <div className="organizer-match-modal__browser-toolbar">
      <NavButton onClick={onBack}>
        {t('common.back')}
      </NavButton>
      <div className="organizer-match-modal__browser-copy">
        <strong className="organizer-match-modal__browser-title">{browserTitle}</strong>
        <CardMetadata.Row className="organizer-match-modal__browser-meta" items={browserMetaItems} />
      </div>
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
        <div className="organizer-match-modal__browser-actions">
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
        </div>
      ) : null}
    </div>
  );
}
