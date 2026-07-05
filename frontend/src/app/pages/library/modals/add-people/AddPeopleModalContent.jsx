import { useState, useRef } from 'react';
import { useUpdatePersonStatusMutation, useAddPersonTmdbMutation } from '@/queries';
import SegmentedControl from '@/ui/SegmentedControl';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import AddPeopleLocal from './AddPeopleLocal';
import AddPeopleSearch from './AddPeopleSearch';

export default function AddPeopleModalContent({ isAdult, t }) {
  const [activeMode, setActiveMode] = useState('local'); // 'local', 'search'
  const [optimisticStatus, setOptimisticStatus] = useState({});
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [queuedIds, setQueuedIds] = useState(new Set());

  // Search results state shared to allow activation queue access
  const [tmdbResults, setTmdbResults] = useState([]);

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

  return (
    <div className="add-people-modal add-people-modal--people">
      <div className="add-people-modal__mode-selector">
        <SegmentedControl
          value={activeMode}
          onChange={setActiveMode}
          options={[
            { value: 'local', label: t('library.addPeople.modes.local') || 'Local Pack' },
            { value: 'search', label: t('common.search') || 'TMDB Search' },
          ]}
          className="add-people-modal__segmented-control"
        />
      </div>

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
          setTmdbResults={setTmdbResults}
        />
      )}
    </div>
  );
}
