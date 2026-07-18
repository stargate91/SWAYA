import { useState } from 'react';
import PropTypes from 'prop-types';
import useListManagement from '../../../hooks/useListManagement';
import { List, Plus, Check, Minus, Loader2 } from '@/ui/icons';
import Checkbox from '@/ui/Checkbox';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import Popover from '@/ui/Popover';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import styles from './ListsPopover.module.css';

export default function ListsPopover({ item, type, t }) {
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
  const [isHovered, setIsHovered] = useState(false);

  const onSubmitCreate = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await handleCreateList(newListName);
    setNewListName('');
  };

  return (
    <Popover
      align="right"
      width="min(24rem, calc(100vw - 2.5rem))"
      trigger={
        <button
          type="button"
          className="media-detail-page__side-nav-toggle"
          title={t('lists.title') || 'Lists'}
        >
          <List size={18} />
        </button>
      }
    >
      <Card
        title={t('lists.title') || 'Lists'}
        headerVariant="shaded"
        padding="md"
        fullWidth
        actions={watchlist && (
          <Button
            type="button"
            variant={isWatchlistAdded ? 'success' : 'glass-accent'}
            className={styles['watchlist-btn']}
            aria-pressed={isWatchlistAdded}
            size="sm"
            onClick={() => handleToggleList(watchlist)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={isWatchlistAdded ? (t('lists.remove_from_watchlist') || 'Remove from Watchlist') : (t('lists.add_to_watchlist') || 'Add to Watchlist')}
            leftIcon={isWatchlistAdded ? (isHovered ? <Minus size={14} /> : <Check size={14} />) : <Plus size={14} />}
          >
            {isWatchlistAdded ? (isHovered ? (t('common.remove') || 'Remove') : (t('lists.watchlist_name') || 'Watchlist')) : (t('lists.watchlist_name') || 'Watchlist')}
          </Button>
        )}
      >
        <Stack gap="md">
          {loading ? (
            <Spinner size="1.25rem" label={t('common.loading') || 'Loading...'} />
          ) : (
            <>
              {otherLists.length > 0 ? (
                <Stack
                  scrollable
                  gap="sm"
                  className="u-max-h-10rem u-pr-xs custom-scrollbar"
                >
                  {otherLists.map((list) => {
                    const isAdded = actualListIds.includes(list.id);
                    return (
                      <div
                        key={list.id}
                        className="u-interactive-list-item"
                        aria-selected={isAdded}
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
                        <Checkbox checked={isAdded} readOnly />
                        <span>{list.name}</span>
                      </div>
                    );
                  })}
                </Stack>
              ) : (
                <Text
                  as="div"
                  variant="small"
                  color="muted"
                  className="u-text-center u-font-italic u-py-sm"
                >
                  {t('lists.no_lists_yet') || 'No custom lists created yet.'}
                </Text>
              )}

              <form onSubmit={onSubmitCreate}>
                <Inline align="center" gap="sm" fullWidth>
                  <Input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder={t('lists.create_quick_placeholder') || 'Quick create list...'}
                    size="sm"
                    flex={1}
                    disabled={creating}
                  />
                  <Button
                    type="submit"
                    variant="secondary-neutral"
                    size="sm"
                    disabled={creating || !newListName.trim()}
                    leftIcon={creating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  />
                </Inline>
              </form>
            </>
          )}
        </Stack>
      </Card>
    </Popover>
  );
}

ListsPopover.propTypes = {
  item: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};
