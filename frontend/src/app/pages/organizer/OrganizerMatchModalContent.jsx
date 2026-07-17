import { useState } from 'react';
import Spinner from '../../ui/Spinner';
import Skeleton from '../../ui/Skeleton';
import MatchModalSearchForm from './components/MatchModalSearchForm';
import MatchModalBrowserToolbar from './components/MatchModalBrowserToolbar';
import MatchModalBucket from './components/MatchModalBucket';
import MatchModalConfirmDialog from './components/MatchModalConfirmDialog';
import MatchModalResults from './components/MatchModalResults';
import MatchModalBrowser from './components/MatchModalBrowser';
import useMatchModalViewModel from './components/useMatchModalViewModel';
import EmptyState from '../../ui/EmptyState';
import Stack from '../../ui/Stack';
import Inline from '../../ui/Inline';
import Card from '../../ui/Card';
import Text from '../../ui/Text';
import styles from './MatchModal.module.css';

function getInitialMatchEmptyState({ row, mode, t }) {
  const isTvMode = mode === 'tv' || mode === 'tv';

  if (row?.rawStatus === 'no_match') {
    return {
      title: t('organizer.details.matchModal.noDetectedMatchesTitle') || 'No detected matches',
      description: isTvMode
        ? (t('organizer.details.matchModal.noDetectedMatchesTvDesc') || 'We could not detect a usable tv match for this item. Search above to find the right show.')
        : (t('organizer.details.matchModal.noDetectedMatchesMovieDesc') || 'We could not detect a usable movie match for this item. Search above to find the right title.'),
    };
  }

  if (row?.rawStatus === 'error') {
    return {
      title: t('organizer.details.matchModal.errorDetectedMatchesTitle') || 'Automatic matching ran into an issue',
      description: isTvMode
        ? (t('organizer.details.matchModal.errorDetectedMatchesTvDesc') || 'This item could not be matched automatically right now. Search above to choose the correct show manually.')
        : (t('organizer.details.matchModal.errorDetectedMatchesMovieDesc') || 'This item could not be matched automatically right now. Search above to choose the correct movie manually.'),
    };
  }

  return {
    title: t('organizer.details.matchModal.noDetectedMatchesTitle') || 'No detected matches',
    description: isTvMode
      ? (t('organizer.details.matchModal.noDetectedMatchesTvDesc') || 'We could not detect a usable tv match for this item. Search above to find the right show.')
      : (t('organizer.details.matchModal.noDetectedMatchesMovieDesc') || 'We could not detect a usable movie match for this item. Search above to find the right title.'),
  };
}

export default function OrganizerMatchModalContent({
  row,
  rows = [],
  t,
  toast,
  onResolved,
  scanMode,
  sessionMode,
}) {
  const {
    query,
    setQuery,
    year,
    setYear,
    season,
    setSeason,
    episode,
    setEpisode,
    mode,
    isTvMode,
    isSearching,
    hasSearched,
    isBrowserLoading,
    browserTitle,
    browserMetaItems,
    results,
    confirmState,
    setConfirmState,
    browserState,
    bucketEpisodeNumbers,
    visibleResultCandidates,
    shouldShowPosterResults,
    shouldShowListResults,
    isResolvingId,
    provider,
    providerOptions,
    handleSearch,
    handleModeChange,
    handleCandidateSelect,
    handleBrowseSeason,
    handleSelectEpisode,
    handleBrowserBack,
    handleResolve,
    handleProviderChange,
    toggleBucketEpisode,
    handleApplyBucket,
  } = useMatchModalViewModel({ row, rows, t, toast, onResolved, scanMode });

  const targetRows = rows.length > 0 ? rows : (row ? [row] : []);
  const isBulk = targetRows.length > 1;
  const shouldShowStatusEmptyState = !isBulk && !hasSearched && browserState.view === 'results' && ['no_match', 'new', 'error'].includes(row?.rawStatus);
  const initialMatchEmptyState = shouldShowStatusEmptyState
    ? getInitialMatchEmptyState({ row, mode, t })
    : null;

  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirmMatch = () => {
    if (!confirmState) return;
    if (dontShowAgain) {
      localStorage.setItem(confirmState.skipKey, 'true');
    }
    confirmState.onConfirm();
    setDontShowAgain(false);
  };

  const handleCancelConfirm = () => {
    setConfirmState(null);
    setDontShowAgain(false);
  };

  return (
    <Stack gap="lg">
      <MatchModalSearchForm
        query={query}
        setQuery={setQuery}
        year={year}
        setYear={setYear}
        season={season}
        setSeason={setSeason}
        episode={episode}
        setEpisode={setEpisode}
        mode={mode}
        isTvMode={isTvMode}
        isSearching={isSearching}
        onSearch={handleSearch}
        onModeChange={handleModeChange}
        isBulk={isBulk}
        t={t}
        provider={provider}
        setProvider={handleProviderChange}
        sessionMode={sessionMode}
        scanMode={scanMode}
        providerOptions={providerOptions}
      />

      <Stack gap="md" as="section">
        {isBulk && !hasSearched && browserState.view === 'results' ? (
          <EmptyState
            size="md"
            border="dashed"
            background="translucent"
            title={t('organizer.details.matchModal.bulkSearchIntroTitle')}
            description={t('organizer.details.matchModal.bulkSearchIntroDesc')}
          />
        ) : shouldShowStatusEmptyState ? (
          <EmptyState
            size="md"
            border="dashed"
            background="translucent"
            title={initialMatchEmptyState.title}
            description={initialMatchEmptyState.description}
          />
        ) : (
          <>
            <Stack gap="2xs">
              <Text variant="small" weight="bold">
                {browserState.view === 'results'
                  ? (hasSearched
                      ? t('organizer.details.matchModal.searchResults')
                      : t('organizer.details.matchModal.detectedMatches'))
                  : browserState.view === 'seasons'
                    ? t('organizer.details.matchModal.seasons')
                    : t('organizer.details.matchModal.episodes')}
              </Text>
              <Text variant="small" color="muted">
                {browserState.view === 'results'
                  ? (hasSearched
                      ? t('organizer.details.matchModal.searchResultsHint')
                      : t('organizer.details.matchModal.detectedMatchesHint'))
                  : browserState.view === 'seasons'
                    ? t('organizer.details.matchModal.seasonsHint')
                    : t('organizer.details.matchModal.episodesHint')}
              </Text>
            </Stack>

            <MatchModalBrowserToolbar
              view={browserState.view}
              browserTitle={browserTitle}
              browserMetaItems={browserMetaItems}
              tvCandidate={browserState.tvCandidate}
              selectedSeason={browserState.selectedSeason}
              bucketEpisodeNumbers={bucketEpisodeNumbers}
              onBack={handleBrowserBack}
              onResolve={handleResolve}
              onApplyBucket={handleApplyBucket}
              t={t}
            />

            {!isBulk ? (
              <MatchModalBucket
                view={browserState.view}
                bucketEpisodeNumbers={bucketEpisodeNumbers}
                onToggle={toggleBucketEpisode}
                t={t}
              />
            ) : null}

            {isBrowserLoading || isSearching ? (
              hasSearched ? (
                <Stack gap="md">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Card key={idx} variant="default" padding="md">
                      <Inline gap="md">
                        <Skeleton className={`${styles['organizer-match-modal__skeleton-image']} ${mode === 'scene' ? styles['organizer-match-modal__skeleton-image--scene'] : styles['organizer-match-modal__skeleton-image--poster']}`} variant="rect" />
                        <Stack gap="sm" flex={1} justify="center">
                          <Skeleton className={styles['organizer-match-modal__skeleton-text-title']} variant="text" />
                          <Skeleton className={styles['organizer-match-modal__skeleton-text-subtitle']} variant="text" />
                          <Skeleton className={styles['organizer-match-modal__skeleton-text-body']} variant="text" />
                        </Stack>
                      </Inline>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Inline gap="md" className={styles['organizer-match-modal__skeleton-poster-container']}>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton.Card key={idx} className={mode === 'scene' ? styles['organizer-match-modal__skeleton-card--scene'] : styles['organizer-match-modal__skeleton-card--poster']} />
                  ))}
                </Inline>
              )
            ) : isResolvingId ? (
              <Spinner label={t('organizer.details.matchModal.applying')} />
            ) : null}

            {!isBrowserLoading && !isSearching ? (
              <MatchModalResults
                results={results}
                visibleResultCandidates={visibleResultCandidates}
                shouldShowPosterResults={shouldShowPosterResults}
                shouldShowListResults={shouldShowListResults}
                mode={mode}
                isResolvingId={isResolvingId}
                isBrowserLoading={isBrowserLoading}
                isSearching={isSearching}
                onCandidateSelect={handleCandidateSelect}
                row={row}
                t={t}
                hasSearched={hasSearched}
                view={browserState.view}
              />
            ) : null}

            <MatchModalBrowser
              browserState={browserState}
              isBrowserLoading={isBrowserLoading}
              row={row}
              bucketEpisodeNumbers={bucketEpisodeNumbers}
              isResolvingId={isResolvingId}
              onBrowseSeason={handleBrowseSeason}
              onSelectEpisode={handleSelectEpisode}
              onToggleBucketEpisode={toggleBucketEpisode}
              episode={episode}
              t={t}
            />
          </>
        )}
      </Stack>

      <MatchModalConfirmDialog
        confirmState={confirmState}
        dontShowAgain={dontShowAgain}
        setDontShowAgain={setDontShowAgain}
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmMatch}
        t={t}
      />
    </Stack>
  );
}
