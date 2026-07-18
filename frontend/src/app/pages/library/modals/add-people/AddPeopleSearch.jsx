import { useMemo } from 'react';
import { useSettingsQuery } from '@/queries';
import Spinner from '@/ui/Spinner';
import EmptyState from '@/ui/EmptyState';
import styles from './AddPeopleModalContent.module.css';
import CompactCard from '@/ui/CompactCard';
import ActivationButton from './ActivationButton';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';


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
    <Stack gap="lg" fill className={styles['tab-panel']}>

      {isSearching ? (
        <Stack align="center" justify="center" className={styles['loading-wrapper']}>
          <Spinner label={t('library.addPeople.searching') || 'Searching...'} />
        </Stack>
      ) : searchingError ? (
        <Text color="danger" align="center" className={styles['error-message']}>
          {searchingError}
        </Text>
      ) : !hasSearched ? (
        <Stack fill className={styles['empty-fill']}>
          <EmptyState
            title={t(textKey('library.addPeople.adultSearchEmptyTitle', 'library.addPeople.searchEmptyTitle'))}
            description={t(textKey('library.addPeople.adultSearchEmptyDesc', 'library.addPeople.searchEmptyDesc'))}
            size="md"
            border="dashed"
            background="translucent"
            fillHeight={true}
          />
        </Stack>
      ) : filteredTmdbResults.length === 0 ? (
        <Stack fill className={styles['empty-fill']}>
          <EmptyState
            title={t(textKey('library.addPeople.adultSearchNoResultsTitle', 'library.addPeople.searchNoResultsTitle'))}
            description={t(textKey('library.addPeople.adultSearchNoResultsDesc', 'library.addPeople.searchNoResultsDesc'))}
            size="md"
            border="dashed"
            background="translucent"
            fillHeight={true}
          />
        </Stack>
      ) : (
        <Stack gap="sm" scrollable className={styles.list}>
          {filteredTmdbResults.map((person) => {
            const isActive = optimisticStatus[person.id] !== undefined
              ? optimisticStatus[person.id]
              : person.is_active;
            const isPendingForPerson = loadingIds.has(person.id) || queuedIds.has(person.id);

            const metaContent = (
              <>
                {person.known_for_department 
                  ? (t(`library.people.roles.${person.known_for_department.toLowerCase()}`) || person.known_for_department)
                  : ''}
                {Array.isArray(person.known_for) && person.known_for.length > 0 && ` - Known for: ${person.known_for.map(k => k.title || k.name).filter(Boolean).slice(0, 3).join(', ')}`}
              </>
            );

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
                      source: 'search',
                    })}
                    disabled={isPendingForPerson}
                  />
                }
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
