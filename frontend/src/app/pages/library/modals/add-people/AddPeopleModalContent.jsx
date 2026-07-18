import { useState, useRef } from 'react';
import { useUpdatePersonStatusMutation, useAddPersonTmdbMutation } from '@/queries';
import SearchInputCombo from '@/ui/SearchInputCombo';
import Stack from '@/ui/Stack';
import styles from './AddPeopleModalContent.module.css';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import api from '@/lib/api';
import AddPeopleLocal from './AddPeopleLocal';
import AddPeopleSearch from './AddPeopleSearch';

export default function AddPeopleModalContent({ isAdult, t }) {
  const [selectedOption, setSelectedOption] = useState('local'); // 'local', 'tmdb', 'stashdb', ...
  const [searchQuery, setSearchQuery] = useState('');
  const [optimisticStatus, setOptimisticStatus] = useState({});
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [queuedIds, setQueuedIds] = useState(new Set());

  // Search results and searching states
  const [tmdbResults, setTmdbResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingError, setSearchingError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const addPersonMutation = useAddPersonTmdbMutation();
  const updateStatusMutation = useUpdatePersonStatusMutation();
  const actionQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);

  const textKey = (adultKey, defaultKey) => (isAdult ? adultKey : defaultKey);

  const resolveProfileUrl = (path) => {
    return resolveMediaImageUrl(path, 'personThumb');
  };

  const processQueuedActions = async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    while (actionQueueRef.current.length > 0) {
      const task = actionQueueRef.current.shift();

      setQueuedIds((prev) => {
        const next = new Set(prev);
        next.delete(task.personId);
        return next;
      });
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.add(task.personId);
        return next;
      });

      try {
        if (task.source === 'search' && task.newActiveStatus) {
          const searchPerson = tmdbResults.find(p => p.id === task.personId);
          if (searchPerson) {
            await addPersonMutation.mutateAsync({
              tmdb_id: task.personId,
              name: searchPerson.name,
              profile_path: searchPerson.profile_path,
              gender: searchPerson.gender,
              is_adult: searchPerson.is_adult !== undefined ? searchPerson.is_adult : (searchPerson.adult !== undefined ? searchPerson.adult : isAdult),
            });
          } else {
            await addPersonMutation.mutateAsync(task.personId);
          }
        } else {
          await updateStatusMutation.mutateAsync({
            personId: task.personId,
            payload: { is_active: task.newActiveStatus }
          });
        }
      } catch (err) {
        console.error(err);
        setOptimisticStatus((prev) => ({ ...prev, [task.personId]: task.previousStatus }));
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(task.personId);
          return next;
        });
      }
    }

    isProcessingQueueRef.current = false;
  };

  const enqueueToggleStatus = ({ personId, newActiveStatus, previousStatus, source }) => {
    setOptimisticStatus((prev) => ({ ...prev, [personId]: newActiveStatus }));
    setQueuedIds((prev) => {
      const next = new Set(prev);
      next.add(personId);
      return next;
    });

    actionQueueRef.current.push({
      personId,
      newActiveStatus,
      previousStatus,
      source,
    });

    processQueuedActions();
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchingError('');
    try {
      const results = await api.people.searchTmdb(searchQuery.trim(), {
        adultOnly: isAdult,
        source: selectedOption
      });
      setTmdbResults(results);
      setHasSearched(true);
    } catch (err) {
      setSearchingError(err.message || 'Failed to search');
    } finally {
      setIsSearching(false);
    }
  };

  const options = [
    { value: 'local', label: t('library.addPeople.modes.local') || 'Local Pack' },
    { value: 'tmdb', label: 'TMDb' },
    ...(isAdult ? [
      { value: 'stashdb', label: 'StashDB' },
      { value: 'fansdb', label: 'FansDB' },
      { value: 'theporndb', label: 'THEPornDB' },
    ] : []),
  ];

  const activeMode = selectedOption === 'local' ? 'local' : 'search';

  const placeholderText = selectedOption === 'local'
    ? t(textKey('library.addPeople.adultSearchPlaceholder', 'library.addPeople.searchPlaceholder'))
    : t(textKey('library.addPeople.adultTmdbSearchPlaceholder', 'library.addPeople.tmdbSearchPlaceholder'));

  return (
    <Stack gap="lg" fullWidth fill>
      {activeMode === 'search' ? (
        <form onSubmit={handleSearchSubmit} className={styles['search-form-wrapper']}>
          <SearchInputCombo
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholderText}
            selectedOption={selectedOption}
            onOptionChange={(val) => {
              setSelectedOption(val);
              setSearchQuery('');
              setHasSearched(false);
              setTmdbResults([]);
            }}
            options={options}
          />
        </form>
      ) : (
        <SearchInputCombo
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholderText}
          selectedOption={selectedOption}
          onOptionChange={(val) => {
            setSelectedOption(val);
            setSearchQuery('');
            setHasSearched(false);
            setTmdbResults([]);
          }}
          options={options}
        />
      )}

      {activeMode === 'local' && (
        <AddPeopleLocal
          isAdult={isAdult}
          t={t}
          textKey={textKey}
          resolveProfileUrl={resolveProfileUrl}
          optimisticStatus={optimisticStatus}
          loadingIds={loadingIds}
          queuedIds={queuedIds}
          enqueueToggleStatus={enqueueToggleStatus}
          searchQuery={searchQuery}
        />
      )}

      {activeMode === 'search' && (
        <AddPeopleSearch
          isAdult={isAdult}
          t={t}
          textKey={textKey}
          resolveProfileUrl={resolveProfileUrl}
          optimisticStatus={optimisticStatus}
          loadingIds={loadingIds}
          queuedIds={queuedIds}
          enqueueToggleStatus={enqueueToggleStatus}
          tmdbResults={tmdbResults}
          isSearching={isSearching}
          searchingError={searchingError}
          hasSearched={hasSearched}
        />
      )}
    </Stack>
  );
}
