import { useState, useMemo } from 'react';
import { useSettingsQuery } from '@/queries';
import api from '@/lib/api';
import Input from '@/ui/Input';
import Spinner from '@/ui/Spinner';
import IconButton from '@/ui/IconButton';
import Tooltip from '@/ui/Tooltip';
import EmptyState from '@/ui/EmptyState';
import Dropdown from '@/ui/Dropdown';
import { Search } from 'lucide-react';
import ActivationButton from './ActivationButton';

const QUESTION_MARK = '?';

export default function AddPeopleSearch({
  isAdult,
  t,
  textKey,
  resolveProfileUrl,
  optimisticStatus,
  loadingIds,
  queuedIds,
  enqueueToggleStatus,
  tmdbResults,
  setTmdbResults,
}) {
  const { data: settings } = useSettingsQuery();
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [searchSource, setSearchSource] = useState('tmdb');
  const [isSearching, setIsSearching] = useState(false);
  const [searchingError, setSearchingError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const filteredTmdbResults = useMemo(() => {
    if (!isAdult || !settings?.adult_gender_preference || settings.adult_gender_preference === 'all') {
      return tmdbResults;
    }
    const pref = settings.adult_gender_preference;
    return tmdbResults.filter((person) => {
      const g = person.gender;
      if (pref === 'female') return g === 1 || g === '1';
      if (pref === 'male') return g === 2 || g === '2';
      return true;
    });
  }, [tmdbResults, isAdult, settings?.adult_gender_preference]);

  return (
    <div className="add-people-modal__tab-panel">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!tmdbQuery.trim()) return;
          setIsSearching(true);
          setSearchingError('');
          try {
            const results = await api.people.searchTmdb(tmdbQuery.trim(), { adultOnly: isAdult, source: searchSource });
            setTmdbResults(results);
            setHasSearched(true);
          } catch (err) {
            setSearchingError(err.message || 'Failed to search');
          } finally {
            setIsSearching(false);
          }
        }}
        className="add-people-modal__search-form"
      >
        <div className="add-people-modal__search-input-group">
          {isAdult && (
            <div className="add-people-modal__search-source">
              <Dropdown
                className="add-people-dropdown"
                menuClassName="search-source-dropdown-menu"
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                options={[
                  { value: 'tmdb', label: 'TMDb' },
                  { value: 'stashdb', label: 'StashDB' },
                  { value: 'fansdb', label: 'FansDB' },
                  { value: 'theporndb', label: 'THEPornDB' },
                ]}
              />
            </div>
          )}
          <div className="add-people-modal__form-input-wrapper">
            <Input
              type="text"
              placeholder={t(textKey('library.addPeople.adultTmdbSearchPlaceholder', 'library.addPeople.tmdbSearchPlaceholder'))}
              value={tmdbQuery}
              onChange={(e) => setTmdbQuery(e.target.value)}
            />
          </div>
        </div>
        <Tooltip
          content={isSearching ? t('library.addPeople.searching') || 'Searching...' : t('common.search') || 'Search'}
          side="top"
        >
          <IconButton
            type="submit"
            variant="secondary"
            disabled={isSearching}
            label={isSearching ? t('library.addPeople.searching') || 'Searching...' : t('common.search') || 'Search'}
            title={null}
          >
            <Search size={15} />
          </IconButton>
        </Tooltip>
      </form>

      {isSearching ? (
        <div className="add-people-modal__loading-wrapper">
          <Spinner label={t('library.addPeople.searching') || 'Searching...'} />
        </div>
      ) : searchingError ? (
        <div className="add-people-modal__error-message">
          {searchingError}
        </div>
      ) : !hasSearched ? (
        <div className="add-people-modal__empty-fill">
          <EmptyState
            title={t(textKey('library.addPeople.adultSearchEmptyTitle', 'library.addPeople.searchEmptyTitle'))}
            description={t(textKey('library.addPeople.adultSearchEmptyDesc', 'library.addPeople.searchEmptyDesc'))}
            variant="modal-intro"
          />
        </div>
      ) : filteredTmdbResults.length === 0 ? (
        <div className="add-people-modal__empty-fill">
          <EmptyState
            title={t(textKey('library.addPeople.adultSearchNoResultsTitle', 'library.addPeople.searchNoResultsTitle'))}
            description={t(textKey('library.addPeople.adultSearchNoResultsDesc', 'library.addPeople.searchNoResultsDesc'))}
            variant="modal-search"
          />
        </div>
      ) : (
        <div className="add-people-modal__list">
          {filteredTmdbResults.map((person) => {
            const isActive = optimisticStatus[person.id] !== undefined
              ? optimisticStatus[person.id]
              : person.is_active;
            const isPendingForPerson = loadingIds.has(person.id) || queuedIds.has(person.id);

            return (
              <div
                key={person.id}
                className="add-people-modal__card"
              >
                <div className="add-people-modal__card-left">
                  <div className="add-people-modal__avatar">
                    {person.profile_path ? (
                      <img
                        src={resolveProfileUrl(person.profile_path)}
                        alt={person.name}
                        className="add-people-modal__avatar-img"
                      />
                    ) : (
                      <div className="add-people-modal__avatar-placeholder">
                        {QUESTION_MARK}
                      </div>
                    )}
                  </div>
                  <div className="add-people-modal__card-info">
                    <strong className="add-people-modal__card-name">{person.name}</strong>
                    <span className="add-people-modal__card-meta add-people-modal__card-meta--wrap">
                      {person.known_for_department || ''}
                      {Array.isArray(person.known_for) && person.known_for.length > 0 && ` - Known for: ${person.known_for.map(k => k.title || k.name).filter(Boolean).slice(0, 3).join(', ')}`}
                    </span>
                  </div>
                </div>
                <ActivationButton
                  isActive={isActive}
                  onClick={(newActiveStatus) => enqueueToggleStatus({
                    personId: person.id,
                    newActiveStatus,
                    previousStatus: isActive,
                    source: 'search',
                  })}
                  disabled={isPendingForPerson}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
