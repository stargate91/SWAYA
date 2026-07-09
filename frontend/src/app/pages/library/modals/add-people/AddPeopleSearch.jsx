import { useMemo } from 'react';
import { useSettingsQuery } from '@/queries';
import Spinner from '@/ui/Spinner';
import EmptyState from '@/ui/EmptyState';
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
  isSearching,
  searchingError,
  hasSearched,
}) {
  const { data: settings } = useSettingsQuery();

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
                      {person.known_for_department 
                        ? (t(`library.people.roles.${person.known_for_department.toLowerCase()}`) || person.known_for_department)
                        : ''}
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
