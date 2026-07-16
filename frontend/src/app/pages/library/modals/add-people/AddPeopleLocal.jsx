import { useState, useMemo } from 'react';
import { usePeopleInfiniteQuery, useSettingsQuery } from '@/queries';
import Spinner from '@/ui/Spinner';
import EmptyState from '@/ui/EmptyState';
import Dropdown from '@/ui/Dropdown';
import CompactCard from '@/ui/CompactCard';
import ActivationButton from './ActivationButton';


export default function AddPeopleLocal({
  isAdult,
  t,
  resolveProfileUrl,
  optimisticStatus,
  loadingIds,
  queuedIds,
  enqueueToggleStatus,
  searchQuery,
}) {
  const { data: settings } = useSettingsQuery();
  const [roleFilter, setRoleFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('library_count');
  const [sortDirection, setSortDirection] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('not_added'); // 'added', 'not_added'

  const hideGenderFilter = isAdult && settings?.adult_gender_preference && settings.adult_gender_preference !== 'all';

  // Fetch people with pagination and infinite scroll
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePeopleInfiniteQuery({
    include_inactive: true,
    adult_only: isAdult,
    pageSize: 100,
    search: searchQuery.trim() || undefined,
    role: roleFilter !== 'all' ? ({ actor: 'Actor', director: 'Director', writer: 'Writer', sound: 'Sound' }[roleFilter]) : undefined,
    gender: hideGenderFilter ? settings.adult_gender_preference : (genderFilter !== 'all' ? genderFilter : undefined),
    sort_by: sortBy === 'library_count' ? `library_count_${sortDirection}` : `name_${sortDirection}`,
  });

  const people = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  const visiblePeople = useMemo(() => {
    return people.filter((person) => {
      const isActive = optimisticStatus[person.id] !== undefined
        ? optimisticStatus[person.id]
        : person.is_active;
      if (statusFilter === 'added') return isActive;
      if (statusFilter === 'not_added') return !isActive;
      return true;
    });
  }, [people, statusFilter, optimisticStatus]);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasActiveFilters = roleFilter !== 'all' || (!hideGenderFilter && genderFilter !== 'all') || statusFilter !== 'all';

  return (
    <div className="add-people-modal__local-panel">

      <div className="add-people-modal__filter-row">
        <Dropdown
          className="add-people-dropdown"
          variant="sorter"
          layout="inline"
          label={t('library.sort.label') || 'Sort:'}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          sortDirection={sortDirection}
          onSortDirectionToggle={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          options={[
            { value: 'library_count', label: t('library.sort.libraryCount') || 'Library Count' },
            { value: 'name', label: t('library.sort.name') || 'Name' },
          ]}
        />

        <Dropdown
          className="add-people-dropdown"
          variant="sorter"
          layout="inline"
          label={t('library.filter.roleLabel') || 'Role:'}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: 'all', label: t('library.filter.all') || 'All Roles' },
            { value: 'actor', label: t('library.people.roles.actor') || 'Actor' },
            { value: 'director', label: t('library.people.roles.director') || 'Director' },
            { value: 'writer', label: t('library.people.roles.writer') || 'Writer' },
            { value: 'sound', label: t('library.people.roles.sound') || 'Composer' },
          ]}
        />

        {!hideGenderFilter && (
          <Dropdown
            className="add-people-dropdown"
            variant="sorter"
            layout="inline"
            label={t('library.filter.genderLabel') || 'Gender:'}
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            options={[
              { value: 'all', label: t('library.filter.all') || 'All Genders' },
              { value: 'female', label: t('library.filter.female') || 'Female' },
              { value: 'male', label: t('library.filter.male') || 'Male' },
            ]}
          />
        )}

        <Dropdown
          className="add-people-dropdown"
          variant="sorter"
          layout="inline"
          label={t('library.filter.statusLabel') || 'Status:'}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'not_added', label: t('library.filter.notAdded') || 'Not Added' },
            { value: 'added', label: t('library.filter.added') || 'Added' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="add-people-modal__loading-wrapper">
          <Spinner label={t('library.addPeople.loading') || 'Loading people...'} />
        </div>
      ) : visiblePeople.length === 0 ? (
        <div className="add-people-modal__empty-fill">
          <EmptyState
            title={hasSearchQuery
              ? (isAdult
                  ? (t('library.addPeople.adultNoSearchResultsTitle') || 'No matching adult people found')
                  : (t('library.addPeople.noSearchResultsTitle') || 'No matching people found'))
              : hasActiveFilters
                ? (isAdult
                    ? (t('library.addPeople.adultNoFilterResultsTitle') || 'Nothing fits these filters')
                    : (t('library.addPeople.noFilterResultsTitle') || 'Nothing fits these filters'))
                : (isAdult
                    ? (t('library.addPeople.adultNoInactive') || 'All discovered adult people are already in your library.')
                    : (t('library.addPeople.noInactive') || 'No people found.'))
            }
            description={hasSearchQuery
              ? (isAdult
                  ? (t('library.addPeople.adultNoSearchResultsDesc') || 'No adult people in your local pack matched this search. Try another name.')
                  : (t('library.addPeople.noSearchResultsDesc') || 'No people in your local pack matched this search. Try another name.'))
              : hasActiveFilters
                ? (isAdult
                    ? (t('library.addPeople.adultNoFilterResultsDesc') || 'Try clearing or relaxing the local adult people filters to see more suggestions.')
                    : (t('library.addPeople.noFilterResultsDesc') || 'Try clearing or relaxing the local people filters to see more suggestions.'))
                : (isAdult
                    ? (t('library.addPeople.adultNoInactiveDesc') || 'Scan and organize new adult titles to find more cast and creator suggestions.')
                    : (t('library.addPeople.noInactiveDesc') || 'All people from organized items are already active.'))
            }
            size="md"
            border="dashed"
            background="translucent"
            fillHeight={true}
          />
        </div>
      ) : (
        <div
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop - clientHeight < 50 && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          className="add-people-modal__list"
        >
          {visiblePeople.map((person) => {
            const isActive = optimisticStatus[person.id] !== undefined
              ? optimisticStatus[person.id]
              : person.is_active;
            const isPendingForPerson = loadingIds.has(person.id) || queuedIds.has(person.id);

            const metaContent = person.known_for 
              ? (t(`library.people.roles.${person.known_for.toLowerCase()}`) || person.known_for)
              : '';

            return (
              <CompactCard
                key={person.id}
                aspect="circle"
                imageUrl={person.profile_path ? resolveProfileUrl(person.profile_path) : null}
                title={person.name}
                meta={metaContent}
                rightElement={
                  <ActivationButton
                    isActive={isActive}
                    onClick={(newActiveStatus) => enqueueToggleStatus({
                      personId: person.id,
                      newActiveStatus,
                      previousStatus: isActive,
                      source: 'local',
                    })}
                    disabled={isPendingForPerson}
                  />
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
