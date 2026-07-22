import { useState } from 'react';
import Page from '@/ui/Page';
import Button from '@/ui/Button';
import { List as ListIcon, Edit2, AlertTriangle } from '@/ui/icons';
import { useUi } from '@/providers/UiProvider';
import useListsPageState from './hooks/useListsPageState';
import ListsSidebar from './components/ListsSidebar';
import ListsHeader from './components/ListsHeader';
import ListsGrid from './components/ListsGrid';
import ListsAddDrawer from './components/ListsAddDrawer';
import CreateListModalContent from './CreateListModalContent';
import DeleteListModalContent from './components/DeleteListModalContent';
import ListImageSelectorDrawer from './components/ListImageSelectorDrawer';
import styles from './ListsPage.module.css';

export default function ListsPage() {
  const { openModal, closeModal } = useUi();
  const {
    t,
    isLoading,
    lists,
    activeListId,
    setActiveListId,
    isDrawerOpen,
    setIsDrawerOpen,
    listSearchQuery,
    setListSearchQuery,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    watchedFilter,
    setWatchedFilter,
    mediaTypeFilter,
    setMediaTypeFilter,
    genreFilter,
    setGenreFilter,
    genderFilter,
    setGenderFilter,
    jobFilter,
    setJobFilter,
    activeList,
    activeListDetails,
    isDetailsLoading,
    fileInputRef,
    handleFileChange,
    handleTriggerImport,
    handleExportList,
    handleStartAddItems,
    handleCardClick,
    handleRemoveListItem,
    createdLabel,
    availableGenres,
    sortOptions,
    filteredListItems,
    addListItemMutation,
    createMutation,
    updateMutation,
    deleteMutation,
    uploadImageMutation,
    overrideImageMutation,
    settings,
    sessionMode,
  } = useListsPageState();
  const [isImageDrawerOpen, setIsImageDrawerOpen] = useState(false);

  const handleStartCreate = () => {
    openModal({
      title: t('lists.create_title') || 'Create Custom List',
      icon: ListIcon,
      content: (
        <CreateListModalContent
          onClose={closeModal}
          t={t}
          mode="create"
          existingNames={lists.map((l) => l.name)}
          defaultIsAdult={sessionMode === 'nsfw'}
          onSave={(payload) => {
            createMutation.mutate(payload, {
              onSuccess: (newList) => {
                closeModal();
                if (newList && newList.id) {
                  setActiveListId(newList.id);
                }
              },
            });
          }}
        />
      ),
      footer: (
        <div className={styles['lists-modal-footer']}>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" form="create-list-form">
            {t('common.create') || 'Create'}
          </Button>
        </div>
      ),
    });
  };

  const handleStartEdit = (list, e) => {
    e.stopPropagation();
    openModal({
      title: t('lists.edit_title') || 'Edit List Details',
      icon: Edit2,
      content: (
        <CreateListModalContent
          onClose={closeModal}
          t={t}
          initialList={list}
          mode="edit"
          existingNames={lists.map((l) => l.name)}
          onSave={(payload) => {
            updateMutation.mutate(
              {
                listId: list.id,
                payload,
              },
              {
                onSuccess: () => {
                  closeModal();
                },
              }
            );
          }}
        />
      ),
      footer: (
        <div className={styles['lists-modal-footer']}>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" form="create-list-form">
            {t('common.save') || 'Save'}
          </Button>
        </div>
      ),
    });
  };

  const handleDelete = (listId, e) => {
    e.stopPropagation();
    openModal({
      title: t('lists.delete_confirm_title') || 'Delete List',
      icon: AlertTriangle,
      variant: 'danger',
      content: <DeleteListModalContent t={t} />,
      footer: (
        <>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteMutation.mutate(listId, {
                onSuccess: () => {
                  if (activeListId === listId) {
                    const nextList = lists.find((l) => l.id !== listId);
                    setActiveListId(nextList ? nextList.id : null);
                  }
                  closeModal();
                },
              });
            }}
          >
            {t('common.delete') || 'Delete'}
          </Button>
        </>
      ),
    });
  };

  return (
    <Page variant="viewport" className={styles['lists-page']}>
      <div className={styles['lists-layout']}>
        <ListsSidebar
          t={t}
          isLoading={isLoading}
          lists={lists}
          activeListId={activeListId}
          setActiveListId={setActiveListId}
          handleTriggerImport={handleTriggerImport}
          handleStartCreate={handleStartCreate}
          handleStartEdit={handleStartEdit}
          handleDelete={handleDelete}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileChange}
          hidden
        />

        <main className={styles['lists-main']}>
          {activeList ? (
            <>
              <ListsHeader
                activeList={activeList}
                createdLabel={createdLabel}
                t={t}
                handleExportList={handleExportList}
                handleStartAddItems={handleStartAddItems}
                listSearchQuery={listSearchQuery}
                setListSearchQuery={setListSearchQuery}
                watchedFilter={watchedFilter}
                setWatchedFilter={setWatchedFilter}
                mediaTypeFilter={mediaTypeFilter}
                setMediaTypeFilter={setMediaTypeFilter}
                genreFilter={genreFilter}
                setGenreFilter={setGenreFilter}
                genderFilter={genderFilter}
                setGenderFilter={setGenderFilter}
                jobFilter={jobFilter}
                setJobFilter={setJobFilter}
                sortKey={sortKey}
                setSortKey={setSortKey}
                sortOptions={sortOptions}
                sortDirection={sortDirection}
                setSortDirection={setSortDirection}
                availableGenres={availableGenres}
                onImageClick={() => setIsImageDrawerOpen(true)}
              />
              <div className={styles['lists-content']}>
                <ListsGrid
                  isDetailsLoading={isDetailsLoading}
                  activeList={activeList}
                  activeListDetails={activeListDetails}
                  filteredListItems={filteredListItems}
                  sessionMode={sessionMode}
                  settings={settings}
                  t={t}
                  handleCardClick={handleCardClick}
                  handleRemoveListItem={handleRemoveListItem}
                />
              </div>
            </>
          ) : (
            <div className={styles['lists-main__placeholder']}>
              <ListIcon size={32} className={styles['lists-main__placeholder-icon']} />
              <span className={styles['lists-main__placeholder-text']}>
                {t('lists.no_list_selected_desc') || 'Select a list from the sidebar to view its items.'}
              </span>
            </div>
          )}
        </main>
      </div>

      <ListsAddDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeList={activeList}
        addListItemMutation={addListItemMutation}
        activeListDetails={activeListDetails}
        settings={settings}
        t={t}
      />

      <ListImageSelectorDrawer
        isOpen={isImageDrawerOpen}
        onClose={() => setIsImageDrawerOpen(false)}
        list={activeList}
        state={{
          t,
          uploadImageMutation,
          overrideImageMutation,
        }}
      />
    </Page>
  );
}
