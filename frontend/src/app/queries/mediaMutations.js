import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { getOrganizerQueryKey } from './organizerQueries';
import { useSettingsQuery } from './settingsQueries';

const prettifyOrganizerLanguage = (value) => String(value || '')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const applyOrganizerItemUpdates = (item, variables) => {
  if (!item || typeof item !== 'object') return item;
  
  const nextItem = { ...item };
  
  if (variables.custom_language !== undefined) {
    nextItem.target_language = variables.custom_language;
    nextItem.language = prettifyOrganizerLanguage(variables.custom_language);
  }
  if (variables.custom_audio_type !== undefined) {
    nextItem.custom_audio_type = variables.custom_audio_type;
  }
  if (variables.custom_source !== undefined) {
    nextItem.custom_source = variables.custom_source;
  }
  if (variables.custom_edition !== undefined) {
    nextItem.custom_edition = variables.custom_edition;
  }
  if (variables.main_type !== undefined) {
    nextItem.type = variables.main_type;
  }
  if (variables.season !== undefined) {
    nextItem.season = variables.season != null ? String(variables.season) : null;
  }
  if (variables.episode !== undefined) {
    nextItem.episode = variables.episode != null ? String(variables.episode) : null;
  }
  if (variables.parent_id !== undefined) {
    nextItem.parent_id = variables.parent_id;
  }
  
  return nextItem;
};

const updateOrganizerItemsOptimistic = (organizerData, itemIds, variables) => {
  if (!organizerData || typeof organizerData !== 'object' || !variables) return organizerData;

  const targetIds = new Set((itemIds || []).map((itemId) => String(itemId)));
  let changed = false;

  const updateList = (items = []) => items.map((item) => {
    if (!targetIds.has(String(item?.id))) return item;
    changed = true;
    return applyOrganizerItemUpdates(item, variables);
  });

  const nextData = {
    ...organizerData,
    manual: updateList(organizerData.manual || []),
    movies: updateList(organizerData.movies || []),
    tv: updateList(organizerData.tv || []),
    collisions: updateList(organizerData.collisions || []),
  };

  return changed ? nextData : organizerData;
};

export const useUpdateMediaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.media.update(payload),
    onMutate: async (variables) => {
      const scanMode = variables?.scanMode;
      const sessionMode = variables?.sessionMode;
      if (scanMode === undefined && sessionMode === undefined) {
        return {};
      }

      const organizerKey = getOrganizerQueryKey(scanMode, sessionMode);
      await queryClient.cancelQueries({ queryKey: organizerKey });
      const previousOrganizer = queryClient.getQueryData(organizerKey);
      queryClient.setQueryData(organizerKey, (oldData) => updateOrganizerItemsOptimistic(oldData, [variables?.id], variables));
      return { organizerKey, previousOrganizer };
    },
    onError: (err, variables, context) => {
      if (context?.organizerKey && context.previousOrganizer) {
        queryClient.setQueryData(context.organizerKey, context.previousOrganizer);
      }
    },
    onSuccess: async (data, variables) => {
      const scanMode = variables?.scanMode;
      const sessionMode = variables?.sessionMode;
      if (scanMode !== undefined || sessionMode !== undefined) {
        const organizerData = await api.organizer.get({ scanMode, sessionMode });
        queryClient.setQueryData(getOrganizerQueryKey(scanMode, sessionMode), organizerData);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['organizer'] });
      }
      queryClient.invalidateQueries({ queryKey: ['organizer-count'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useBulkUpdateMediaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.media.bulkUpdate(payload),
    onMutate: async (variables) => {
      const scanMode = variables?.scanMode;
      const sessionMode = variables?.sessionMode;
      const itemIds = variables?.ids || variables?.item_ids || [];
      if ((scanMode === undefined && sessionMode === undefined) || itemIds.length === 0) {
        return {};
      }

      const organizerKey = getOrganizerQueryKey(scanMode, sessionMode);
      await queryClient.cancelQueries({ queryKey: organizerKey });
      const previousOrganizer = queryClient.getQueryData(organizerKey);
      queryClient.setQueryData(organizerKey, (oldData) => updateOrganizerItemsOptimistic(oldData, itemIds, variables));
      return { organizerKey, previousOrganizer };
    },
    onError: (err, variables, context) => {
      if (context?.organizerKey && context.previousOrganizer) {
        queryClient.setQueryData(context.organizerKey, context.previousOrganizer);
      }
    },
    onSuccess: async (data, variables) => {
      const scanMode = variables?.scanMode;
      const sessionMode = variables?.sessionMode;
      if (scanMode !== undefined || sessionMode !== undefined) {
        const organizerData = await api.organizer.get({ scanMode, sessionMode });
        queryClient.setQueryData(getOrganizerQueryKey(scanMode, sessionMode), organizerData);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['organizer'] });
      }
      queryClient.invalidateQueries({ queryKey: ['organizer-count'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useUpdateMediaStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }) => api.media.updateStatus(itemId, payload),
    onMutate: async ({ itemId, payload, tvId }) => {
      const targetId = tvId || itemId;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['library-tv-detail', targetId] });
      await queryClient.cancelQueries({ queryKey: ['library-item-detail', targetId] });
      await queryClient.cancelQueries({ queryKey: ['library'] });

      // Snapshot previous values
      const prevTvQueries = queryClient.getQueriesData({ queryKey: ['library-tv-detail', targetId] });
      const prevItemQueries = queryClient.getQueriesData({ queryKey: ['library-item-detail', targetId] });
      const prevLibraryList = queryClient.getQueriesData({ queryKey: ['library'] });

      const updates = {};
      if (payload) {
        if ('user_rating' in payload) updates.user_rating = payload.user_rating;
        if ('is_watched' in payload) updates.is_watched = payload.is_watched;
        if ('custom_tags' in payload) updates.custom_tags = payload.custom_tags;
      }

      // Optimistically update details
      if (Object.keys(updates).length > 0) {
        prevTvQueries.forEach(([queryKey, queryData]) => {
          if (queryData) {
            let updatedSeasons = queryData.seasons;
            if (queryData.seasons && 'is_watched' in updates) {
              updatedSeasons = queryData.seasons.map(season => {
                if (!season.episodes) return season;
                const updatedEpisodes = season.episodes.map(ep => {
                  if (String(ep.id) === String(itemId)) {
                    return { ...ep, is_watched: updates.is_watched };
                  }
                  return ep;
                });
                const isSeasonWatched = updatedEpisodes.length > 0 && updatedEpisodes.every(ep => ep.is_watched);
                return { ...season, episodes: updatedEpisodes, is_watched: isSeasonWatched };
              });
            }
            queryClient.setQueryData(queryKey, {
              ...queryData,
              ...updates,
              seasons: updatedSeasons
            });
          }
        });
        prevItemQueries.forEach(([queryKey, queryData]) => {
          if (queryData) {
            queryClient.setQueryData(queryKey, {
              ...queryData,
              ...updates
            });
          }
        });

        // Optimistically update lists
        prevLibraryList.forEach(([queryKey, queryData]) => {
          if (!queryData) return;
          let changed = false;

          const updateItem = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) {
              return obj.map(x => {
                if (x && (String(x.id) === String(targetId) || String(x.id) === `tv_${targetId}`)) {
                  changed = true;
                  return { ...x, ...updates };
                }
                return updateItem(x);
              });
            }
            const nextObj = {};
            for (const key in obj) {
              nextObj[key] = updateItem(obj[key]);
            }
            return nextObj;
          };

          const updatedData = updateItem(queryData);
          if (changed) {
            queryClient.setQueryData(queryKey, updatedData);
          }
        });
      }

      return { prevTvQueries, prevItemQueries, prevLibraryList, targetId };
    },
    onError: (err, variables, context) => {
      if (context?.prevTvQueries) {
        context.prevTvQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
      if (context?.prevItemQueries) {
        context.prevItemQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
      if (context?.prevLibraryList) {
        context.prevLibraryList.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
    },
    onSuccess: (data, variables) => {
      const updateDetailCache = (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          user_rating: data.user_rating !== undefined ? data.user_rating : oldData.user_rating,
          user_comment: data.user_comment !== undefined ? data.user_comment : oldData.user_comment,
          is_watched: data.is_watched !== undefined ? data.is_watched : oldData.is_watched,
          custom_tags: data.custom_tags !== undefined ? data.custom_tags : (data.tags !== undefined ? data.tags : oldData.custom_tags),
          tags: data.tags !== undefined ? data.tags : oldData.tags,
        };
      };

      queryClient.setQueryData(['full-metadata', variables.itemId], updateDetailCache);
      queryClient.setQueryData(['library-item-detail', variables.itemId], updateDetailCache);
      queryClient.setQueryData(['library-tv-detail', variables.itemId], updateDetailCache);

      queryClient.invalidateQueries({ queryKey: ['full-metadata', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', variables.itemId] });

      const cleanId = String(variables.itemId).replace('tv_', '');
      queryClient.invalidateQueries({ queryKey: ['full-metadata', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', cleanId] });

      if (variables.tvId) {
        const updateTvCacheWithEpisode = (oldData) => {
          if (!oldData) return oldData;
          let updatedSeasons = oldData.seasons;
          if (oldData.seasons && data.is_watched !== undefined) {
            updatedSeasons = oldData.seasons.map(season => {
              if (!season.episodes) return season;
              const updatedEpisodes = season.episodes.map(ep => {
                if (String(ep.id) === String(variables.itemId)) {
                  return { ...ep, is_watched: data.is_watched };
                }
                return ep;
              });
              const isSeasonWatched = updatedEpisodes.length > 0 && updatedEpisodes.every(ep => ep.is_watched);
              return { ...season, episodes: updatedEpisodes, is_watched: isSeasonWatched };
            });
          }
          return {
            ...oldData,
            seasons: updatedSeasons,
          };
        };

        queryClient.setQueryData(['library-tv-detail', variables.tvId], updateTvCacheWithEpisode);
        queryClient.setQueryData(['library-tv-detail', `tv_${variables.tvId}`], updateTvCacheWithEpisode);
        queryClient.setQueryData(['library-item-detail', variables.tvId], updateDetailCache);
        queryClient.setQueryData(['library-item-detail', `tv_${variables.tvId}`], updateDetailCache);
        queryClient.invalidateQueries({ queryKey: ['library-tv-detail', variables.tvId] });
        queryClient.invalidateQueries({ queryKey: ['library-tv-detail', `tv_${variables.tvId}`] });
        queryClient.invalidateQueries({ queryKey: ['library-item-detail', variables.tvId] });
        queryClient.invalidateQueries({ queryKey: ['library-item-detail', `tv_${variables.tvId}`] });
      }

      // Update matching items in the library query cache instead of invalidating everything
      queryClient.setQueriesData({ queryKey: ['library'] }, (oldData) => {
        if (!oldData) return oldData;
        let changed = false;

        const updateItem = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) {
            return obj.map(x => {
              const isMatch = x && (
                String(x.id) === String(variables.itemId) ||
                String(x.id) === `tv_${variables.itemId}` ||
                (variables.tvId && String(x.id) === String(variables.tvId))
              );
              if (isMatch) {
                changed = true;
                return {
                  ...x,
                  user_rating: data.user_rating !== undefined ? data.user_rating : x.user_rating,
                  user_comment: data.user_comment !== undefined ? data.user_comment : x.user_comment,
                  is_watched: data.is_watched !== undefined ? data.is_watched : x.is_watched,
                  custom_tags: data.custom_tags !== undefined ? data.custom_tags : x.custom_tags,
                  tags: data.tags !== undefined ? data.tags : x.tags,
                };
              }
              return updateItem(x);
            });
          }
          const nextObj = {};
          for (const key in obj) {
            nextObj[key] = updateItem(obj[key]);
          }
          return nextObj;
        };

        const nextData = updateItem(oldData);
        return changed ? nextData : oldData;
      });

      const payload = variables.payload || {};
      if ('user_rating' in payload || 'is_watched' in payload || 'user_comment' in payload) {
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      }
      if ('custom_tags' in payload || 'is_tracked' in payload) {
        queryClient.invalidateQueries({ queryKey: ['libraryTags'] });
        queryClient.invalidateQueries({ queryKey: ['allTags'] });
        queryClient.invalidateQueries({ queryKey: ['libraryFilters'] });
      }
    },
  });
};

export const useBulkUpdateWatchedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemIds, isWatched }) => api.media.bulkWatched(itemIds, isWatched),
    onMutate: async (variables) => {
      const { itemIds, isWatched, tvId } = variables;
      
      if (tvId) {
        await queryClient.cancelQueries({ queryKey: ['library-tv-detail', tvId] });
        await queryClient.cancelQueries({ queryKey: ['library-tv-detail', `tv_${tvId}`] });
      }
      await queryClient.cancelQueries({ queryKey: ['library'] });

      const prevTvDetail = tvId ? queryClient.getQueryData(['library-tv-detail', tvId]) : null;
      const prevTvDetailWithPrefix = tvId ? queryClient.getQueryData(['library-tv-detail', `tv_${tvId}`]) : null;

      const updateTvCache = (oldData) => {
        if (!oldData) return oldData;
        let updatedSeasons = oldData.seasons;
        if (oldData.seasons) {
          const idsSet = new Set(itemIds.map(id => String(id)));
          updatedSeasons = oldData.seasons.map(season => {
            if (!season.episodes) return season;
            const updatedEpisodes = season.episodes.map(ep => {
              if (idsSet.has(String(ep.id))) {
                return { ...ep, is_watched: isWatched };
              }
              return ep;
            });
            const isSeasonWatched = updatedEpisodes.length > 0 && updatedEpisodes.every(ep => ep.is_watched);
            return { ...season, episodes: updatedEpisodes, is_watched: isSeasonWatched };
          });
        }
        return {
          ...oldData,
          seasons: updatedSeasons,
        };
      };

      if (tvId) {
        queryClient.setQueryData(['library-tv-detail', tvId], updateTvCache);
        queryClient.setQueryData(['library-tv-detail', `tv_${tvId}`], updateTvCache);
      }

      return { prevTvDetail, prevTvDetailWithPrefix };
    },
    onError: (err, variables, context) => {
      if (variables.tvId && context) {
        if (context.prevTvDetail) {
          queryClient.setQueryData(['library-tv-detail', variables.tvId], context.prevTvDetail);
        }
        if (context.prevTvDetailWithPrefix) {
          queryClient.setQueryData(['library-tv-detail', `tv_${variables.tvId}`], context.prevTvDetailWithPrefix);
        }
      }
    },
    onSuccess: (data, variables) => {
      if (variables.tvId) {
        queryClient.invalidateQueries({ queryKey: ['library-tv-detail', variables.tvId] });
        queryClient.invalidateQueries({ queryKey: ['library-tv-detail', `tv_${variables.tvId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['watched-history'] });
    },
  });
};

export const usePlayMediaMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: settings = {} } = useSettingsQuery();

  return useMutation({
    mutationFn: async (arg) => {
      const itemId = typeof arg === 'object' ? arg.itemId : arg;
      const start = typeof arg === 'object' ? arg.start : undefined;
      const preferredPlayer = settings.preferred_player || 'swaya';
      if (preferredPlayer === 'swaya') {
        let ipcRenderer = null;
        try {
          if (window.require) {
            ipcRenderer = window.require('electron').ipcRenderer;
          }
        } catch (err) {
          console.error(err);
        }

        if (ipcRenderer) {
          await ipcRenderer.invoke('mpv-open-fullscreen', { itemId, start });
        } else {
          const startQ = start !== undefined ? `?start=${start}` : '';
          navigate(`/player/${itemId}${startQ}`);
        }
        return { success: true };
      } else {
        return api.media.play(itemId);
      }
    },
    onSuccess: (data, itemId) => {
      const stringId = String(itemId);
      const numberId = !isNaN(Number(itemId)) ? Number(itemId) : itemId;
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', stringId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', numberId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', stringId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', numberId] });
      queryClient.invalidateQueries({ queryKey: ['watched-history'] });
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    },
  });
};

export const useResetProgressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => api.media.resetProgress(itemId),
    onSuccess: (data, itemId) => {
      const stringId = String(itemId);
      const numberId = !isNaN(Number(itemId)) ? Number(itemId) : itemId;
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', stringId] });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail', numberId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', stringId] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail', numberId] });
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    },
  });
};

export const usePreviewMediaMutation = () => {
  return useMutation({
    mutationFn: (filePath) => api.media.preview(filePath),
  });
};
