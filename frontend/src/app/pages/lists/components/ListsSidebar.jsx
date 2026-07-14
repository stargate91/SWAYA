import { Loader2, Plus, Download, Edit2, Trash2 } from '@/ui/icons';
import Tooltip from '@/ui/Tooltip';
import ListCollageIcon from './ListCollageIcon';
import styles from './ListsSidebar.module.css';

export default function ListsSidebar({
  t,
  isLoading,
  lists,
  activeListId,
  setActiveListId,
  handleTriggerImport,
  handleStartCreate,
  handleStartEdit,
  handleDelete,
}) {
  return (
    <aside className={styles['lists-sidebar']}>
      <div className={styles['lists-sidebar__header']}>
        <span className={styles['lists-sidebar__title']}>
          {t('lists.sidebar_title') || 'My Lists'}
        </span>
        <div className={styles['lists-sidebar__actions']}>
          <Tooltip content={t('lists.import_title') || 'Import List'} side="top">
            <button
              type="button"
              className={styles['lists-sidebar__import-btn']}
              onClick={handleTriggerImport}
              title={null}
            >
              <Download size={18} />
            </button>
          </Tooltip>
          <Tooltip content={t('lists.create_title') || 'Create New List'} side="top">
            <button
              type="button"
              className={styles['lists-sidebar__create-btn']}
              onClick={handleStartCreate}
              title={null}
            >
              <Plus size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={`${styles['lists-sidebar__content']} no-scrollbar`}>
        {isLoading ? (
          <div className={styles['lists-sidebar__loading']}>
            <Loader2 className="spinner" size={20} />
          </div>
        ) : (
          <div className={styles['lists-sidebar__list']}>
            {lists.map((list) => {
              const isActive = activeListId === list.id;

              return (
                <div
                  key={list.id}
                  className={`${styles['lists-sidebar__item']} ${isActive ? styles['is-active'] : ''}`}
                  onClick={() => setActiveListId(list.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveListId(list.id)}
                  // eslint-disable-next-line react/forbid-dom-props
                  style={{ '--list-theme-color': list.color || 'var(--color-accent-blue)' }}
                >
                  <div className={styles['lists-sidebar__item-left']}>
                    <div className={styles['lists-sidebar__item-icon-wrap']}>
                      <ListCollageIcon
                        samplePosters={list.sample_posters}
                        listType={list.list_type}
                        color={list.color}
                        customImagePath={list.custom_image_path}
                      />
                    </div>
                    <div className={styles['lists-sidebar__item-info']}>
                      <span className={styles['lists-sidebar__item-name']}>
                        {list.name}
                      </span>
                      <span className={styles['lists-sidebar__item-desc']}>
                        {list.description || t('lists.no_description') || 'No description'}
                      </span>
                      <span className={styles['lists-sidebar__item-meta']}>
                        {list.item_count} {t('lists.items_suffix') || 'ITEMS'}
                      </span>
                    </div>
                  </div>

                  <div className={styles['lists-sidebar__item-right']}>
                    {!list.is_watchlist && (
                      <div className={styles['lists-sidebar__item-actions']}>
                        <Tooltip content={t('common.edit') || 'Edit'} side="top">
                          <button
                            type="button"
                            className={`${styles['lists-sidebar__action-btn']} ${styles['lists-sidebar__action-btn--edit']}`}
                            onClick={(e) => handleStartEdit(list, e)}
                            title={null}
                          >
                            <Edit2 size={12} />
                          </button>
                        </Tooltip>
                        <Tooltip content={t('common.delete') || 'Delete'} side="top">
                          <button
                            type="button"
                            className={`${styles['lists-sidebar__action-btn']} ${styles['lists-sidebar__action-btn--delete']}`}
                            onClick={(e) => handleDelete(list.id, e)}
                            title={null}
                          >
                            <Trash2 size={12} />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
