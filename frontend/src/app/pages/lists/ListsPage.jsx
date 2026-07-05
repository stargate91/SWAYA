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
import './ListsPage.css';

export default function ListsPage() {
  const { openModal, closeModal } = useUi();
  const state = useListsPageState();
  const [isImageDrawerOpen, setIsImageDrawerOpen] = useState(false);

  const handleStartCreate = () => {
    openModal({
      title: state.t('lists.create_title') || 'Create Custom List',
      icon: ListIcon,
      content: (
        <CreateListModalContent
          onClose={closeModal}
          t={state.t}
          mode="create"
          existingNames={state.lists.map((l) => l.name)}
          onSave={(payload) => {
            state.createMutation.mutate(payload, {
              onSuccess: (newList) => {
                closeModal();
                if (newList && newList.id) {
                  state.setActiveListId(newList.id);
                }
              },
            });
          }}
        />
      ),
      footer: (
        <div className="lists-modal-footer">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {state.t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" form="create-list-form">
            {state.t('common.create') || 'Create'}
          </Button>
        </div>
      ),
    });
  };

  const handleStartEdit = (list, e) => {
    e.stopPropagation();
    openModal({
      title: state.t('lists.edit_title') || 'Edit List Details',
      icon: Edit2,
      content: (
        <CreateListModalContent
          onClose={closeModal}
          t={state.t}
          initialList={list}
          mode="edit"
          existingNames={state.lists.map((l) => l.name)}
          onSave={(payload) => {
            state.updateMutation.mutate(
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
        <div className="lists-modal-footer">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {state.t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" form="create-list-form">
            {state.t('common.save') || 'Save'}
          </Button>
        </div>
      ),
    });
  };

  const handleDelete = (listId, e) => {
    e.stopPropagation();
    openModal({
      title: state.t('lists.delete_confirm_title') || 'Delete List',
      icon: AlertTriangle,
      variant: 'danger',
      content: <DeleteListModalContent t={state.t} />,
      footer: (
        <>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {state.t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              state.deleteMutation.mutate(listId, {
                onSuccess: () => {
                  if (state.activeListId === listId) {
                    const nextList = state.lists.find((l) => l.id !== listId);
                    state.setActiveListId(nextList ? nextList.id : null);
                  }
                  closeModal();
                },
              });
            }}
          >
            {state.t('common.delete') || 'Delete'}
          </Button>
        </>
      ),
    });
  };

  return (
    <Page className="lists-page">
      <div className="lists-layout">
        <ListsSidebar
          t={state.t}
          isLoading={state.isLoading}
          lists={state.lists}
          activeListId={state.activeListId}
          setActiveListId={state.setActiveListId}
          handleTriggerImport={state.handleTriggerImport}
          handleStartCreate={handleStartCreate}
          handleStartEdit={handleStartEdit}
          handleDelete={handleDelete}
        />
        <input
          type="file"
          ref={state.fileInputRef}
          accept=".json"
          onChange={state.handleFileChange}
          hidden
        />

        <main className="lists-main">
          {state.activeList ? (
            <>
              <ListsHeader
                activeList={state.activeList}
                createdLabel={state.createdLabel}
                t={state.t}
                handleExportList={state.handleExportList}
                handleStartAddItems={state.handleStartAddItems}
                listSearchQuery={state.listSearchQuery}
                setListSearchQuery={state.setListSearchQuery}
                watchedFilter={state.watchedFilter}
                setWatchedFilter={state.setWatchedFilter}
                mediaTypeFilter={state.mediaTypeFilter}
                setMediaTypeFilter={state.setMediaTypeFilter}
                genreFilter={state.genreFilter}
                setGenreFilter={state.setGenreFilter}
                genderFilter={state.genderFilter}
                setGenderFilter={state.setGenderFilter}
                jobFilter={state.jobFilter}
                setJobFilter={state.setJobFilter}
                sortKey={state.sortKey}
                setSortKey={state.setSortKey}
                sortOptions={state.sortOptions}
                sortDirection={state.sortDirection}
                setSortDirection={state.setSortDirection}
                availableGenres={state.availableGenres}
                onImageClick={() => setIsImageDrawerOpen(true)}
              />
              <div className="lists-content">
                <ListsGrid
                  isDetailsLoading={state.isDetailsLoading}
                  activeList={state.activeList}
                  activeListDetails={state.activeListDetails}
                  filteredListItems={state.filteredListItems}
                  sessionMode={state.sessionMode}
                  settings={state.settings}
                  t={state.t}
                  handleCardClick={state.handleCardClick}
                  handleRemoveListItem={state.handleRemoveListItem}
                />
              </div>
            </>
          ) : (
            <div className="lists-main__placeholder">
              <ListIcon size={32} className="lists-main__placeholder-icon" />
              <span className="lists-main__placeholder-text">
                {state.t('lists.no_list_selected_desc') || 'Select a list from the sidebar to view its items.'}
              </span>
            </div>
          )}
        </main>
      </div>

      <ListsAddDrawer
        isOpen={state.isDrawerOpen}
        onClose={() => state.setIsDrawerOpen(false)}
        activeList={state.activeList}
        addListItemMutation={state.addListItemMutation}
        activeListDetails={state.activeListDetails}
        settings={state.settings}
        t={state.t}
      />

      <ListImageSelectorDrawer
        isOpen={isImageDrawerOpen}
        onClose={() => setIsImageDrawerOpen(false)}
        list={state.activeList}
        state={state}
      />
    </Page>
  );
}
