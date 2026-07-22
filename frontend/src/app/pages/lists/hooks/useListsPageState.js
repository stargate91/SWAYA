import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/providers/LanguageContext';
import { AlertTriangle } from '@/ui/icons';
import {
  useListsQuery,
  useListDetailsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useAddListItemMutation,
  useUploadListImageMutation,
  useOverrideListImageMutation,
  useSettingsQuery,
  useRemoveListItemMutation
} from '@/queries';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useUi } from '@/providers/UiProvider';

export default function useListsPageState() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, openModal } = useUi();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings } = useSettingsQuery();
  const isAdultSettingEnabled = settings?.include_adult === true || settings?.include_adult === 'true';
  const { data: rawLists = [], isLoading } = useListsQuery(isAdultSettingEnabled);

  const lists = useMemo(() => {
    return rawLists.filter((l) => {
      if (l.is_watchlist) return true;
      const isAdultList = !!l.is_adult;
      return sessionMode === 'nsfw' ? isAdultList : !isAdultList;
    });
  }, [rawLists, sessionMode]);

  const createMutation = useCreateListMutation();
  const updateMutation = useUpdateListMutation();
  const deleteMutation = useDeleteListMutation();
  const addListItemMutation = useAddListItemMutation();
  const uploadImageMutation = useUploadListImageMutation();
  const overrideImageMutation = useOverrideListImageMutation();

  const fileInputRef = useRef(null);

  const [activeListId, setActiveListId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('added_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [watchedFilter, setWatchedFilter] = useState('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const activeList = lists.find((l) => l.id === activeListId);
  const { data: activeListDetails, isLoading: isDetailsLoading } = useListDetailsQuery(
    activeListId,
    {
      watched_filter: watchedFilter,
      media_type_filter: mediaTypeFilter,
      genre_filter: genreFilter,
      gender_filter: genderFilter,
      job_filter: jobFilter,
      search: listSearchQuery,
      sort_by: sortKey,
      sort_direction: sortDirection,
    },
    { enabled: !!activeListId }
  );

  const [prevActiveListId, setPrevActiveListId] = useState(null);
  const listsDeps = lists.map((l) => l.id).join(',');
  const [prevListsDeps, setPrevListsDeps] = useState('');

  if (activeListId !== prevActiveListId) {
    setPrevActiveListId(activeListId);
    setIsDrawerOpen(false);
    setListSearchQuery('');
    setSortKey('added_at');
    setSortDirection('desc');
    setWatchedFilter('all');
    setMediaTypeFilter('all');
    setGenreFilter('all');
    setGenderFilter('all');
    setJobFilter('all');
  }

  if (listsDeps !== prevListsDeps) {
    setPrevListsDeps(listsDeps);
    if (lists.length > 0 && activeListId === null) {
      const watchlist = lists.find((l) => l.is_watchlist) || lists[0];
      setActiveListId(watchlist.id);
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.name) {
          openModal({
            title: t('common.error') || 'Error',
            icon: AlertTriangle,
            variant: 'danger',
            content: t('lists.import_invalid_format') || 'Invalid list format: "name" is required.'
          });
          return;
        }

        let listName = data.name;
        let suffix = 1;
        while (lists.some((l) => l.name.toLowerCase() === listName.toLowerCase())) {
          listName = `${data.name} (${suffix})`;
          suffix++;
        }

        const newList = await createMutation.mutateAsync({
          name: listName,
          description: data.description || '',
          color: data.color || 'var(--color-accent-blue)',
          list_type: data.list_type === 'media' || !data.list_type
            ? (data.is_adult ? 'video_scene' : 'movie_tv')
            : data.list_type,
          is_adult: !!data.is_adult
        });

        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            await addListItemMutation.mutateAsync({
              listId: newList.id,
              payload: {
                media_item_id: item.media_item_id,
                tmdb_id: item.tmdb_id,
                media_type: item.media_type || 'movie'
              }
            });
          }
        }

        if (newList && newList.id) {
          setActiveListId(newList.id);
        }
      } catch (err) {
        openModal({
          title: t('common.error') || 'Error',
          icon: AlertTriangle,
          variant: 'danger',
          content: (t('lists.import_failed') || 'Failed to import list: ') + (err.message || err)
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleExportList = (listId) => {
    const listToExport = lists.find((l) => l.id === listId);
    if (!listToExport) return;

    try {
      const details = activeListId === listId ? activeListDetails : null;
      const items = details?.items || [];

      const exportData = {
        name: listToExport.name,
        description: listToExport.description || '',
        color: listToExport.color || 'var(--color-accent-blue)',
        list_type: listToExport.list_type === 'media'
          ? (listToExport.is_adult ? 'video_scene' : 'movie_tv')
          : listToExport.list_type,
        items: items.map((item) => ({
          media_item_id: item.media_item_id,
          tmdb_id: item.tmdb_id,
          media_type: item.media_type || 'movie'
        }))
      };

      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${listToExport.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_list.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast(t('lists.export_success') || 'List exported successfully', 'success');
    } catch (err) {
      console.error(err);
      toast(t('lists.export_failed') || 'Failed to export list', 'danger');
    }
  };

  const handleStartAddItems = () => {
    setIsDrawerOpen(true);
  };

  const removeListItemMutation = useRemoveListItemMutation();

  const handleRemoveListItem = async (itemId) => {
    try {
      await removeListItemMutation.mutateAsync({
        listId: activeListId,
        itemId
      });
      toast(t('lists.item_removed_success') || 'Item removed from list', 'success');
    } catch (err) {
      toast(err.message || t('lists.remove_item_failed') || 'Failed to remove item', 'danger');
    }
  };


  const handleCardClick = (item) => {
    if (item.target_path) {
      navigate(item.target_path, { state: { allowAdult: true } });
      return;
    }
    const rawType = item.media_type || 'movie';
    let mediaType = rawType === 'show' ? 'tv' : rawType;
    if (mediaType === 'episode' || mediaType === 'season') {
      mediaType = 'tv';
    }
    let itemId = item.media_item_id || item.tmdb_id || item.external_id || item.match_id;
    const targetPath = mediaType === 'person'
      ? `/library/people/${item.person_id || itemId}`
      : `/library/${mediaType}/${itemId}`;
    navigate(targetPath, { state: { allowAdult: true } });
  };

  const createdLabel = activeList?.created_at
    ? ((t('lists.created_prefix') || 'CREATED') + ': ' + new Date(activeList.created_at).toLocaleDateString())
    : '';

  const availableGenres = useMemo(() => {
    return ['all', ...(activeListDetails?.genres || [])];
  }, [activeListDetails]);

  const sortOptions = useMemo(() => {
    const isPeopleList = activeList?.list_type === 'person';
    const options = [
      { value: 'added_at', label: t('lists.sort_date_added') || 'Date Added' },
      { value: 'title', label: isPeopleList ? (t('lists.sort_name') || 'Name') : (t('lists.sort_title') || 'Title') },
      { value: 'user_rating', label: t('lists.sort_user_rating') || 'User Rating' }
    ];
    if (!isPeopleList) {
      options.push({ value: 'release_date', label: t('lists.sort_release_date') || 'Release Date' });
    }
    return options;
  }, [activeList, t]);

  const filteredListItems = useMemo(() => {
    return activeListDetails?.items || [];
  }, [activeListDetails]);

  return {
    t,
    isLoading,
    lists,
    settings,
    sessionMode,
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
  };
}
