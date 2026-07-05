import { useState, useRef, useEffect } from 'react';
import {
  useListsQuery,
  useItemMembershipQuery,
  useAddListItemMutation,
  useRemoveListItemMutation,
  useCreateListMutation
} from '@/queries';
import { List, Plus, Check, Loader2 } from '@/ui/icons';
import './ListsPopover.css';

export default function ListsPopover({ item, type, t }) {
  const isTv = type === 'tv';
  const isPerson = type === 'person' || type === 'people';
  const listType = isPerson ? 'person' : 'media';

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Construct item_id for membership check
  const membershipItemId = isPerson
    ? (item?.id ? `person_${item.id}` : undefined)
    : (isTv
        ? (item?.id && String(item.id).startsWith('tmdb_') ? item.id : `tmdb_${item?.id}`)
        : item?.id);

  // Queries
  const { data: lists = [], isLoading: listsLoading } = useListsQuery();
  const { data: membershipData = { list_ids: [], memberships: [] }, isLoading: membershipLoading } =
    useItemMembershipQuery(membershipItemId);

  // Mutations
  const addMutation = useAddListItemMutation();
  const removeMutation = useRemoveListItemMutation();
  const createMutation = useCreateListMutation();

  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter lists by correct type (person vs media)
  const filteredLists = lists.filter(l => l.list_type === listType);

  // Identify Watchlist (Watchlist is only for media)
  const watchlist = !isPerson ? filteredLists.find(l => l.is_watchlist) : null;
  const otherLists = !isPerson ? filteredLists.filter(l => !l.is_watchlist) : filteredLists;

  const isWatchlistAdded = watchlist ? membershipData.list_ids.includes(watchlist.id) : false;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleList = async (list) => {
    const listId = list.id;
    const isAdded = membershipData.list_ids.includes(listId);

    if (isAdded) {
      const membership = membershipData.memberships?.find(m => m.list_id === listId);
      if (membership) {
        await removeMutation.mutateAsync({
          listId,
          itemId: membership.list_item_id
        });
      }
    } else {
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
        listId,
        payload
      });
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

      setNewListName('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const loading = listsLoading || membershipLoading;

  return (
    <div ref={popoverRef} className={`media-lists-popover-wrap${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="media-detail-page__side-nav-toggle"
        title={t('lists.title') || 'Lists'}
        aria-expanded={isOpen}
      >
        <List size={18} />
      </button>

      {isOpen && (
        <div className="media-lists-popover bespoke-list-panel-card">
          <div className="bespoke-list-panel-header">
            <span className="bespoke-list-panel-title">
              {t('lists.title') || 'Lists'}
            </span>
            {watchlist && (
              <button
                type="button"
                className={`bespoke-list-panel-watchlist-btn ${isWatchlistAdded ? 'is-active' : ''}`}
                onClick={() => handleToggleList(watchlist)}
                disabled={addMutation.isPending || removeMutation.isPending}
                title={isWatchlistAdded ? (t('lists.remove_from_watchlist') || 'Remove from Watchlist') : (t('lists.add_to_watchlist') || 'Add to Watchlist')}
              >
                {isWatchlistAdded ? <Check size={14} /> : <Plus size={14} />}
                <span>Watchlist</span>
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
                {otherLists.length > 0 ? (
                  <div className="bespoke-list-panel-list custom-scrollbar">
                    {otherLists.map((list) => {
                      const isAdded = membershipData.list_ids.includes(list.id);
                      return (
                        <div
                          key={list.id}
                          className={`bespoke-list-panel-item ${isAdded ? 'is-added' : ''}`}
                          onClick={() => handleToggleList(list)}
                          style={{ '--list-color': list.color || 'var(--color-accent-blue)' }}
                        >
                          <div className="bespoke-list-panel-item-checkbox">
                            {isAdded && <Check size={12} />}
                          </div>
                          <span className="bespoke-list-panel-item-name">{list.name}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bespoke-list-panel-empty">
                    {t('lists.no_lists_yet') || 'No custom lists created yet.'}
                  </div>
                )}

                <form onSubmit={handleCreateList} className="bespoke-list-panel-create-form">
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
        </div>
      )}
    </div>
  );
}
