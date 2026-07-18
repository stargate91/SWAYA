import { useState } from 'react';
import {
  useListsQuery,
  useItemMembershipQuery,
  useAddListItemMutation,
  useRemoveListItemMutation,
  useCreateListMutation
} from '@/queries';
import { useSettingsQuery } from '@/queries/settingsQueries';

export default function useListManagement({ item, type }) {
  const isTv = type === 'tv';
  const isPerson = type === 'person' || type === 'people';
  const listType = isPerson ? 'person' : 'media';

  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = (settings?.include_adult === true || settings?.include_adult === 'true') || !!item?.is_adult || type === 'scene';

  // Construct item_id for membership check
  const membershipItemId = isPerson
    ? (item?.id ? `person_${item.id}` : undefined)
    : (isTv
        ? (item?.id && String(item.id).startsWith('tmdb_') ? item.id : `tmdb_${item?.id}`)
        : item?.id);

  // Queries
  const { data: lists = [], isLoading: listsLoading } = useListsQuery(includeAdult);
  const { data: membershipData = { list_ids: [], memberships: [] }, isLoading: membershipLoading } =
    useItemMembershipQuery(membershipItemId);

  // Mutations
  const addMutation = useAddListItemMutation();
  const removeMutation = useRemoveListItemMutation();
  const createMutation = useCreateListMutation();

  const [creating, setCreating] = useState(false);
  const [prevListIds, setPrevListIds] = useState(membershipData.list_ids);
  const [optimisticListIds, setOptimisticListIds] = useState(null);

  const arraysEqual = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  };

  if (!arraysEqual(membershipData.list_ids, prevListIds)) {
    setPrevListIds(membershipData.list_ids);
    setOptimisticListIds(null);
  }

  const actualListIds = optimisticListIds !== null ? optimisticListIds : (membershipData.list_ids || []);

  // Filter lists by correct type (person vs media)
  const filteredLists = lists.filter(l => l.list_type === listType);

  // Identify Watchlist (Watchlist is only for media)
  const watchlist = !isPerson ? filteredLists.find(l => l.is_watchlist) : null;
  const otherLists = !isPerson ? filteredLists.filter(l => !l.is_watchlist) : filteredLists;

  const isWatchlistAdded = watchlist ? actualListIds.includes(watchlist.id) : false;

  const handleToggleList = async (list) => {
    const listId = list.id;
    const isAdded = actualListIds.includes(listId);

    if (isAdded) {
      setOptimisticListIds((prev) => (prev || membershipData.list_ids || []).filter(id => id !== listId));
      const membership = membershipData.memberships?.find(m => m.list_id === listId);
      if (membership) {
        try {
          await removeMutation.mutateAsync({
            listId,
            itemId: membership.list_item_id
          });
        } catch {
          setOptimisticListIds(membershipData.list_ids);
        }
      }
    } else {
      setOptimisticListIds((prev) => [...(prev || membershipData.list_ids || []), listId]);
      try {
        let payload;
        if (isPerson) {
          payload = {
            person_id: item.id,
            media_type: 'person',
            title: item.name,
            poster_path: item.profile_path
          };
        } else {
          const isTvItem = type === 'tv';
          const isSceneItem = type === 'scene';
          const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : item.poster_path;

          payload = {
            media_item_id: !isTvItem ? item.id : undefined,
            tmdb_id: isTvItem ? item.id : undefined,
            media_type: type,
            title: item.title || item.name || item.filename,
            poster_path: poster,
            year: item.year ? parseInt(item.year, 10) : undefined
          };
        }

        await addMutation.mutateAsync({
          listId,
          payload
        });
      } catch {
        setOptimisticListIds(membershipData.list_ids);
      }
    }
  };

  const handleCreateList = async (newListName) => {
    if (!newListName.trim()) return;

    try {
      setCreating(true);
      const newList = await createMutation.mutateAsync({
        name: newListName.trim(),
        description: '',
        color: 'var(--color-accent-blue)',
        list_type: listType
      });

      if (newList && newList.id) {
        let payload = {};
        if (isPerson) {
          payload = {
            person_id: item.id,
            media_type: 'person',
            title: item.name,
            poster_path: item.profile_path
          };
        } else {
          const isTvItem = type === 'tv';
          const isSceneItem = type === 'scene';
          const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : item.poster_path;

          payload = {
            media_item_id: !isTvItem ? item.id : undefined,
            tmdb_id: isTvItem ? item.id : undefined,
            media_type: type,
            title: item.title || item.name || item.filename,
            poster_path: poster,
            year: item.year ? parseInt(item.year, 10) : undefined
          };
        }

        await addMutation.mutateAsync({
          listId: newList.id,
          payload
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return {
    loading: listsLoading || membershipLoading,
    watchlist,
    otherLists,
    isWatchlistAdded,
    actualListIds,
    handleToggleList,
    handleCreateList,
    creating
  };
}
