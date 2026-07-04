import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const matchesLibraryEntity = (item, rawItemId, cleanId) => {
  if (!item || typeof item !== 'object') return false;
  const itemId = String(item.id ?? '');
  const tmdbId = String(item.tmdb_id ?? '');
  const tvTmdbId = String(item.tv_tmdb_id ?? '');
  return (
    itemId === String(rawItemId)
    || itemId === String(cleanId)
    || itemId === `tv_${cleanId}`
    || itemId === `collection_${cleanId}`
    || tmdbId === String(cleanId)
    || tvTmdbId === String(cleanId)
  );
};

const normalizeLocalPosterPath = (path) => {
  if (!path || typeof path !== 'string') return path;
  const cleanPath = path.replace(/\\/g, '/');
  const marker = 'media/images/posters/';
  if (cleanPath.includes(marker)) {
    return cleanPath.split(marker).pop();
  }
  return path;
};

const applyPosterFields = (item, data, rawItemId) => {
  if (!item || typeof item !== 'object') return item;
  const nextPosterPath = data?.poster_path ?? item.poster_path;
  const nextLocalPosterPath = normalizeLocalPosterPath(data?.local_poster_path ?? item.local_poster_path);
  const nextDisplayPoster = nextLocalPosterPath || nextPosterPath || item.displayPoster;

  const nextItem = {
    ...item,
    poster_path: nextPosterPath,
    local_poster_path: nextLocalPosterPath,
    displayPoster: nextDisplayPoster,
  };

  if (String(rawItemId).startsWith('tv_')) {
    nextItem.tv_poster_path = nextPosterPath;
  }

  return nextItem;
};

const updatePosterInCacheData = (cacheData, rawItemId, cleanId, data) => {
  if (!cacheData || typeof cacheData !== 'object') return cacheData;

  if (Array.isArray(cacheData)) {
    let changed = false;
    const nextArray = cacheData.map((entry) => {
      const nextEntry = updatePosterInCacheData(entry, rawItemId, cleanId, data);
      if (nextEntry !== entry) changed = true;
      return nextEntry;
    });
    return changed ? nextArray : cacheData;
  }

  if (matchesLibraryEntity(cacheData, rawItemId, cleanId)) {
    return applyPosterFields(cacheData, data, rawItemId);
  }

  let changed = false;
  const nextObject = {};
  for (const [key, value] of Object.entries(cacheData)) {
    const nextValue = updatePosterInCacheData(value, rawItemId, cleanId, data);
    if (nextValue !== value) changed = true;
    nextObject[key] = nextValue;
  }

  return changed ? nextObject : cacheData;
};

const syncPosterCaches = (queryClient, rawItemId, data) => {
  const cleanId = String(rawItemId).replace('tv_', '').replace('collection_', '');

  queryClient.setQueriesData({ queryKey: ['library'] }, (oldData) => (
    updatePosterInCacheData(oldData, rawItemId, cleanId, data)
  ));
  queryClient.setQueriesData({ queryKey: ['libraryCollections'] }, (oldData) => (
    updatePosterInCacheData(oldData, rawItemId, cleanId, data)
  ));

  const detailKeys = [
    ['library-item-detail', rawItemId],
    ['library-item-detail', cleanId],
    ['library-tv-detail', rawItemId],
    ['library-tv-detail', cleanId],
  ];

  if (String(rawItemId).startsWith('collection_')) {
    detailKeys.push(['library-collection-detail', rawItemId]);
    detailKeys.push(['library-collection-detail', cleanId]);
  }

  detailKeys.forEach((key) => {
    queryClient.setQueryData(key, (oldData) => updatePosterInCacheData(oldData, rawItemId, cleanId, data));
  });
};

export const useOverrideBackdropMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, backdropPath }) => api.media.overrideBackdrop(itemId, backdropPath),
    onSuccess: (data, variables) => {
      const { itemId } = variables;
      const cleanId = String(itemId).replace('tv_', '').replace('collection_', '');
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['full-metadata', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
};

export const useUploadBackdropMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, file }) => api.media.uploadBackdrop(itemId, file),
    onSuccess: (data, variables) => {
      const { itemId } = variables;
      const cleanId = String(itemId).replace('tv_', '').replace('collection_', '');
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['full-metadata', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
};

export const useOverridePosterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, posterPath }) => api.media.overridePoster(itemId, posterPath),
    onSuccess: (data, variables) => {
      const { itemId } = variables;
      const cleanId = String(itemId).replace('tv_', '').replace('collection_', '');
      syncPosterCaches(queryClient, itemId, data);
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['full-metadata', itemId] });
    },
  });
};

export const useUploadPosterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, file }) => api.media.uploadPoster(itemId, file),
    onSuccess: (data, variables) => {
      const { itemId } = variables;
      const cleanId = String(itemId).replace('tv_', '').replace('collection_', '');
      syncPosterCaches(queryClient, itemId, data);
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['full-metadata', itemId] });
    },
  });
};

export const useOverrideLogoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, logoPath }) => api.media.overrideLogo(itemId, logoPath),
    onSuccess: (data, variables) => {
      const { itemId } = variables;
      const cleanId = String(itemId).replace('tv_', '').replace('collection_', '');
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['full-metadata', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', itemId] });
    },
  });
};

export const useUploadLogoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, file }) => api.media.uploadLogo(itemId, file),
    onSuccess: (data, variables) => {
      const { itemId } = variables;
      const cleanId = String(itemId).replace('tv_', '').replace('collection_', '');
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['full-metadata', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-collection-detail', itemId] });
    },
  });
};
