import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import useListManagement from '../../hooks/useListManagement';
import { List, Plus, Check, Loader2 } from '@/ui/icons';
import './BespokeListPanel.css';
import './ListsPopover.css';

export default function ListsPopover({ item, type, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

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

  const onSubmitCreate = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await handleCreateList(newListName);
    setNewListName('');
  };

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
                {otherLists.length > 0 ? (
                  <div className="bespoke-list-panel-list custom-scrollbar">
                    {otherLists.map((list) => {
                      const isAdded = actualListIds.includes(list.id);
                      return (
                        <div
                          key={list.id}
                          className={`bespoke-list-panel-item ${isAdded ? 'is-added' : ''}`}
                          onClick={() => handleToggleList(list)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleList(list);
                            }
                          }}
                          /* eslint-disable-next-line react/forbid-dom-props */
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

                <form onSubmit={onSubmitCreate} className="bespoke-list-panel-create-form">
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

ListsPopover.propTypes = {
  item: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};
