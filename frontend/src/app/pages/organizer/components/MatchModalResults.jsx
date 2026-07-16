import MatchCandidateCard from './MatchCandidateCard';
import EmptyState from '../../../ui/EmptyState';
import ScrollRow from '../../../ui/ScrollRow';
import styles from '../MatchModal.module.css';

export default function MatchModalResults({
  results,
  visibleResultCandidates,
  shouldShowPosterResults,
  shouldShowListResults,
  mode,
  isResolvingId,
  isBrowserLoading,
  isSearching,
  onCandidateSelect,
  row,
  t,
  hasSearched,
  view,
}) {
  return (
    <>
      {shouldShowPosterResults ? (
        <ScrollRow
          enableWheelScroll
          showArrows
          className={`${styles['organizer-match-modal__poster-results']} ${mode === 'scene' || visibleResultCandidates.some(c => c.type === 'scene' || c.media_type === 'scene') ? styles['is-scene'] : ''}`}
        >
          {visibleResultCandidates.map((candidate) => (
            <MatchCandidateCard
              key={`existing-${candidate.tmdb_id || candidate.id}`}
              candidate={candidate}
              sourceLabel="existing"
              variant="poster"
              mode={mode}
              isResolvingId={isResolvingId}
              isBrowserLoading={isBrowserLoading}
              onSelect={onCandidateSelect}
              t={t}
              rowStatus={row?.rawStatus}
            />
          ))}
        </ScrollRow>
      ) : null}

      {shouldShowListResults ? (
        <div className={styles['organizer-match-modal__results']}>
          {results.map((candidate) => (
            <MatchCandidateCard
              key={`search-${candidate.tmdb_id || candidate.id}`}
              candidate={candidate}
              sourceLabel="search"
              variant="list"
              mode={mode}
              isResolvingId={isResolvingId}
              isBrowserLoading={isBrowserLoading}
              onSelect={onCandidateSelect}
              t={t}
              rowStatus={row?.rawStatus}
            />
          ))}
        </div>
      ) : null}

      {view === 'results' && hasSearched && results.length === 0 && !isBrowserLoading && !isSearching ? (
        <EmptyState
          title={mode === 'tv' || mode === 'tv'
            ? (t('organizer.details.matchModal.noResultsTvTitle') || 'No matching tv found')
            : (t('organizer.details.matchModal.noResultsMovieTitle') || 'No matching movies found')
          }
          description={mode === 'tv' || mode === 'tv'
            ? (t('organizer.details.matchModal.noResultsTvDesc') || 'We could not find any tv matching your search. Try adjusting the title or year.')
            : (t('organizer.details.matchModal.noResultsMovieDesc') || 'We could not find any movies matching your search. Try adjusting the title or year.')
          }
          size="md"
          border="dashed"
          background="translucent"
        />
      ) : null}
    </>
  );
}
