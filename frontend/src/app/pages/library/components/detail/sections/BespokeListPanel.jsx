import { useState } from 'react';
import { useMediaDetailContext } from '../MediaDetailContext';
import useListManagement from '../../hooks/useListManagement';
import { Plus, Check, Loader2 } from '@/ui/icons';
import Card from '@/ui/Card';
import './BespokeListPanel.css';

export default function BespokeListPanel() {
  const { state, type, t } = useMediaDetailContext();
  const { item } = state;

  const {
    loading,
    watchlist,
    otherLists,
    isWatchlistAdded,
    actualListIds,
    handleToggleList,
    handleCreateList,
    creating
  } = useListManagement({ item, type, t });

  const [newListName, setNewListName] = useState('');

  const onSubmitCreate = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await handleCreateList(newListName);
    setNewListName('');
  };

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

            <form className="bespoke-list-panel-form" onSubmit={onSubmitCreate}>
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
