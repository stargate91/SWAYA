import { Search } from '@/ui/icons';
import IconButton from '../../../ui/IconButton';
import SegmentedControl from '../../../ui/SegmentedControl';
import Tooltip from '../../../ui/Tooltip';
import Input from '../../../ui/Input';
import SearchInputCombo from '../../../ui/SearchInputCombo';
import styles from '../MatchModal.module.css';

export default function MatchModalSearchForm({
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
  onSearch,
  onModeChange,
  isBulk = false,
  t,
  provider,
  setProvider,
  sessionMode,
  scanMode,
  providerOptions,
}) {
  return (
    <form className={styles['organizer-match-modal__search']} onSubmit={onSearch}>
      <div className={styles['organizer-match-modal__search-layout']}>
        <div
          className={styles['organizer-match-modal__search-grid']}
          /* eslint-disable-next-line react/forbid-dom-props */
          style={{
            gridTemplateColumns: isTvMode && !isBulk
              ? 'minmax(0, 1fr) var(--year-column-width) var(--space-7xl) var(--space-7xl)'
              : 'minmax(0, 1fr) var(--year-column-width)',
          }}
        >
          {sessionMode === 'nsfw' ? (
            <SearchInputCombo
              className={`${styles['organizer-match-modal__field']} ${styles['organizer-match-modal__field--query']}`}
              size="lg"
              showSearchIcon={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isTvMode
                  ? t('organizer.details.matchModal.queryPlaceholderTv')
                  : t('organizer.details.matchModal.queryPlaceholderMovie')
              }
              selectedOption={provider}
              onOptionChange={(val) => setProvider({ target: { value: val } })}
              options={providerOptions}
              aria-label={t('organizer.details.matchModal.query')}
            />
          ) : (
            <Input
              className={`${styles['organizer-match-modal__field']} ${styles['organizer-match-modal__field--query']}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isTvMode
                  ? t('organizer.details.matchModal.queryPlaceholderTv')
                  : t('organizer.details.matchModal.queryPlaceholderMovie')
              }
              aria-label={t('organizer.details.matchModal.query')}
            />
          )}
          <Input
            className={`${styles['organizer-match-modal__field']} ${styles['year-field']}`}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder={t('organizer.details.matchModal.year')}
            aria-label={t('organizer.details.matchModal.year')}
            inputMode="numeric"
          />
          {isTvMode && !isBulk ? (
            <Input
              className={`${styles['organizer-match-modal__field']} ${styles['compact-field']}`}
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              placeholder={t('organizer.details.matchModal.seasonShort')}
              aria-label={t('organizer.details.matchModal.seasonShort')}
              inputMode="numeric"
            />
          ) : null}
          {isTvMode && !isBulk ? (
            <Input
              className={`${styles['organizer-match-modal__field']} ${styles['compact-field']}`}
              value={episode}
              onChange={(event) => setEpisode(event.target.value)}
              placeholder={t('organizer.details.matchModal.episodeShort')}
              aria-label={t('organizer.details.matchModal.episodeShort')}
              inputMode="numeric"
            />
          ) : null}
        </div>
        <div className={styles['organizer-match-modal__search-actions']}>
          <Tooltip
            content={isSearching ? t('organizer.details.matchModal.searching') : t('common.search')}
            side="top"
          >
            <IconButton
              type="submit"
              variant="secondary"
              disabled={isSearching}
              label={isSearching ? t('organizer.details.matchModal.searching') : t('common.search')}
              title={null}
            >
              <Search size={15} />
            </IconButton>
          </Tooltip>
        </div>
        {!isBulk && ['tmdb', 'porndb'].includes(provider) && scanMode !== 'scenes' ? (
          <SegmentedControl
            className={styles['organizer-match-modal__mode-toggle']}
            options={
              provider === 'porndb'
                ? [
                    { value: 'movie', label: t('organizer.typeLabels.movie') || 'Movie' },
                    { value: 'scene', label: t('organizer.typeLabels.scene') || 'Scene' },
                  ]
                : [
                    { value: 'movie', label: t('organizer.details.matchModal.movie') },
                    { value: 'tv', label: t('organizer.details.matchModal.tv') },
                  ]
            }
            value={mode}
            onChange={onModeChange}
            ariaLabel={t('organizer.details.matchModal.type')}
          />
        ) : null}
      </div>
    </form>
  );
}


