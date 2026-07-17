import { useState } from 'react';
import {
  useListsQuery,
  useItemMembershipQuery,
  useAddListItemMutation,
  useRemoveListItemMutation,
  useCreateListMutation
} from '@/queries';
import { useMediaDetailContext } from '../MediaDetailContext';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { Plus, Check, Loader2 } from '@/ui/icons';
import Card from '@/ui/Card';
import './BespokeListPanel.css';

export default function BespokeListPanel() {
  const { state, type, t } = useMediaDetailContext();
  const { item, cleanId } = state;

  const isTv = type === 'tv';

  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = (settings?.include_adult === true || settings?.include_adult === 'true') || !!item?.is_adult || type === 'scene';

  // Construct item_id for membership check
  const membershipItemId = isTv
    ? (item?.id && String(item.id).startsWith('tmdb_') ? item.id : `tmdb_${cleanId}`)
    : (item?.id || cleanId);

  // Queries
  const { data: membershipData = { list_ids: [], memberships: [] }, isLoading: membershipLoading } =
    useItemMembershipQuery(membershipItemId);
  const { data: lists = [], isLoading: listsLoading } = useListsQuery(includeAdult);

  // Mutations
  const addMutation = useAddListItemMutation();
  const removeMutation = useRemoveListItemMutation();
  const createMutation = useCreateListMutation();

  const [newListName, setNewListName] = useState('');
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

  // Filter media lists only
  const mediaLists = lists.filter(l => l.list_type === 'media');

  // Identify Watchlist
  const watchlist = mediaLists.find(l => l.is_watchlist);
  const otherLists = mediaLists.filter(l => !l.is_watchlist);

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
        const isSceneItem = type === 'scene';
        const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : item.poster_path;
        const inLibrary = item.in_library !== false;

        await addMutation.mutateAsync({
          listId,
          payload: {
            media_item_id: inLibrary ? (item.library_item_id || item.id) : undefined,
            tmdb_id: !inLibrary ? (item.tmdb_id || item.id || cleanId) : undefined,
            media_type: type,
            title: item.title || item.name || item.filename,
            poster_path: poster,
            year: item.year ? parseInt(item.year, 10) : undefined
          }
        });
      } catch {
        setOptimisticListIds(membershipData.list_ids);
      }
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      setCreating(true);
      const newList = await createMutation.mutateAsync({
        name: newListName.trim(),
        description: '',
        color: 'var(--color-accent-blue)',
        list_type: 'media'
      });
      if (newList && newList.id) {
        const isSceneItem = type === 'scene';
        const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : item.poster_path;
        const inLibrary = item.in_library !== false;

        await addMutation.mutateAsync({
          listId: newList.id,
          payload: {
            media_item_id: inLibrary ? (item.library_item_id || item.id) : undefined,
            tmdb_id: !inLibrary ? (item.tmdb_id || item.id || cleanId) : undefined,
            media_type: type,
            title: item.title || item.name || item.filename,
            poster_path: poster,
            year: item.year ? parseInt(item.year, 10) : undefined
          }
        });
      }

      setNewListName('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const loading = listsLoading || membershipLoading;

  return (
    <Card variant="glass-shaded" padding="none">
      <div className="bespoke-list-panel-header">
        <span className="bespoke-list-panel-title">
          {t('lists.title') || 'Lists'}
        </span>
        {watchlist && (
          <button
            type="button"
            className={`bespoke-list-panel-watchlist-btn ${isWatchlistAdded ? 'is-active' : ''}`}
            onClick={() => handleToggleList(watchlist)}
            title={isWatchlistAdded ? (t('lists.remove_from_watchlist') || 'Remove from Watchlist') : (t('lists.add_to_watchlist') || 'Add to Watchlist')}
          >
            {isWatchlistAdded ? <Check size={14} /> : <Plus size={14} />}
            <span>{t('lists.watchlist_name') || 'Watchlist'}</span>
          </button>
        )}
      </div>

      <div className="bespoke-list-panel-content">
        {loading ? (
          <div className="bespoke-list-panel-loading">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : (
          <>
            <div className="bespoke-list-panel-items-wrapper">
              {otherLists.map((list) => {
                const isAdded = actualListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    className={`bespoke-list-panel-item ${isAdded ? 'is-active' : ''}`}
                    onClick={() => handleToggleList(list)}
                  >
                    <span className="bespoke-list-panel-item-name">{list.name}</span>
                    {isAdded ? <Check size={12} className="bespoke-list-panel-check" /> : <Plus size={12} className="bespoke-list-panel-plus" />}
                  </button>
                );
              })}
            </div>

            <form className="bespoke-list-panel-form" onSubmit={handleCreateList}>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={t('lists.create_quick_placeholder') || 'Quick create list...'}
                className="bespoke-list-panel-input"
                disabled={creating}
              />
              <button
                type="submit"
                className="bespoke-list-panel-add-btn"
                disabled={creating || !newListName.trim()}
              >
                {creating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
              </button>
            </form>
          </>
        )}
      </div>
    </Card>
  );
}
