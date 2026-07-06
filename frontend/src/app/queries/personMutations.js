import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { invalidatePerson, QK } from '@/lib/queryKeys';

const matchesId = (itemId, targetId) => {
  if (itemId === targetId || String(itemId) === String(targetId)) return true;
  const idStr = String(targetId);
  if (String(itemId) === `local:${idStr}` || String(itemId) === `tmdb:${idStr}`) return true;
  return false;
};

const syncPersonProfileCaches = (queryClient, personId, data) => {
  queryClient.setQueriesData({ queryKey: ['person-detail'] }, (oldData) => {
    if (!oldData) return oldData;
    
    const matchesDbId = oldData.id === personId || String(oldData.id) === String(personId);
    const matchesExternalId = oldData.external_ids && Object.values(oldData.external_ids).some(extId => {
      const extIdStr = String(extId);
      return extIdStr === String(personId) || 
             `tmdb_${extIdStr}` === String(personId) || 
             `tmdb:${extIdStr}` === String(personId);
    });

    if (matchesDbId || matchesExternalId) {
      return {
        ...oldData,
        profile_path: data?.profile_path ?? oldData.profile_path,
        local_profile_path: data?.local_profile_path ?? oldData.local_profile_path,
        has_local_profile: data?.has_local_profile ?? oldData.has_local_profile,
      };
    }
    return oldData;
  });

  queryClient.setQueriesData({ queryKey: ['people'] }, (oldData) => {
    if (!oldData?.items) return oldData;
    return {
      ...oldData,
      items: oldData.items.map((item) => (
        matchesId(item.id, personId)
          ? {
              ...item,
              profile_path: data?.profile_path ?? item.profile_path,
              poster_path: data?.profile_path ?? item.poster_path,
              local_profile_path: data?.local_profile_path ?? item.local_profile_path,
            }
          : item
      )),
    };
  });

  queryClient.setQueriesData({ queryKey: ['people-infinite'] }, (oldData) => {
    if (!oldData?.pages) return oldData;
    return {
      ...oldData,
      pages: oldData.pages.map((page) => ({
        ...page,
        items: (page.items || []).map((item) => (
          matchesId(item.id, personId)
            ? {
                ...item,
                profile_path: data?.profile_path ?? item.profile_path,
                poster_path: data?.profile_path ?? item.poster_path,
                local_profile_path: data?.local_profile_path ?? item.local_profile_path,
              }
            : item
        )),
      })),
    };
  });

  queryClient.setQueriesData({ queryKey: ['library'] }, (oldData) => {
    if (!oldData?.items) return oldData;
    return {
      ...oldData,
      items: oldData.items.map((item) => (
        matchesId(item.id, personId)
          ? {
              ...item,
              profile_path: data?.profile_path ?? item.profile_path,
              poster_path: data?.profile_path ?? item.poster_path,
              local_profile_path: data?.local_profile_path ?? item.local_profile_path,
              displayPoster: data?.profile_path ?? item.displayPoster,
            }
          : item
      )),
    };
  });

  const cachedPerson = queryClient.getQueryData(['person-detail', personId]) || 
                       queryClient.getQueryData(['person-detail', String(personId)]) ||
                       queryClient.getQueryData(['person-detail', Number(personId)]);
  const personName = (data?.name || cachedPerson?.name)?.toLowerCase();

  const updateMediaDetailCache = (oldData) => {
    if (!oldData) return oldData;
    if (!oldData.directors && !oldData.cast) return oldData;
    const updatePersonList = (list) => {
      if (!list) return list;
      return list.map((p) => {
        const matchesId = p.id === personId || String(p.id) === String(personId);
        const matchesPrefixedId = p.id === `local:${personId}` || p.id === `tmdb:${personId}`;
        const matchesName = personName && p.name?.toLowerCase() === personName;

        return matchesId || matchesPrefixedId || matchesName
          ? {
              ...p,
              profile_path: data?.profile_path ?? p.profile_path,
              local_profile_path: data?.local_profile_path ?? p.local_profile_path,
            }
          : p;
      });
    };
    return {
      ...oldData,
      directors: updatePersonList(oldData.directors),
      cast: updatePersonList(oldData.cast),
    };
  };

  queryClient.setQueriesData({ queryKey: ['library-item-detail'] }, updateMediaDetailCache);
  queryClient.setQueriesData({ queryKey: ['library-tv-detail'] }, updateMediaDetailCache);
  queryClient.invalidateQueries({ queryKey: QK.recommendations });
};

const syncPersonBackdropCaches = (queryClient, personId, data) => {
  queryClient.setQueriesData({ queryKey: ['person-detail'] }, (oldData) => {
    if (!oldData) return oldData;

    const matchesDbId = oldData.id === personId || String(oldData.id) === String(personId);
    const matchesExternalId = oldData.external_ids && Object.values(oldData.external_ids).some(extId => {
      const extIdStr = String(extId);
      return extIdStr === String(personId) || 
             `tmdb_${extIdStr}` === String(personId) || 
             `tmdb:${extIdStr}` === String(personId);
    });

    if (matchesDbId || matchesExternalId) {
      return {
        ...oldData,
        backdrop_path: data?.backdrop_path ?? oldData.backdrop_path,
        local_backdrop_path: data?.local_backdrop_path ?? oldData.local_backdrop_path,
        has_local_backdrop: data?.has_local_backdrop ?? oldData.has_local_backdrop,
      };
    }
    return oldData;
  });
};

export const useAddPersonTmdbMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tmdbId) => api.people.addFromTmdb(tmdbId),
    onSuccess: () => {
      invalidatePerson(queryClient, '', { lists: true, stats: true, recommendations: true });
    },
  });
};

export const useUpdatePersonStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, payload }) => api.people.updateStatus(personId, payload),
    onMutate: async ({ personId, payload }) => {
      const idStr = String(personId);
      const idNum = Number(personId);
      const isNumValid = !isNaN(idNum);

      const personKeys = [
        ['person-detail', personId],
        ['person-detail', idStr],
      ];
      if (isNumValid) {
        personKeys.push(['person-detail', idNum]);
      }

      // Cancel outgoing refetches
      for (const key of personKeys) {
        await queryClient.cancelQueries({ queryKey: key });
      }
      await queryClient.cancelQueries({ queryKey: ['people'] });
      await queryClient.cancelQueries({ queryKey: ['people-infinite'] });
      await queryClient.cancelQueries({ queryKey: ['library'] });

      // Snapshot previous values
      const previousPersonDetails = personKeys.map((key) => [key, queryClient.getQueryData(key)]);
      const previousPeople = queryClient.getQueriesData({ queryKey: ['people'] });
      const previousPeopleInfinite = queryClient.getQueriesData({ queryKey: ['people-infinite'] });
      const previousLibrary = queryClient.getQueriesData({ queryKey: ['library'] });

      const updates = {};
      if (payload) {
        if ('is_favorite' in payload) updates.is_favorite = payload.is_favorite;
        if ('is_active' in payload) updates.is_active = payload.is_active;
        if ('user_rating' in payload) updates.user_rating = payload.user_rating;
        if ('user_comment' in payload) updates.user_comment = payload.user_comment;
      }

      if (Object.keys(updates).length > 0) {
        // Update person details
        personKeys.forEach((key) => {
          queryClient.setQueryData(key, (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              ...updates,
            };
          });
        });

        // Update people lists
        queryClient.setQueriesData({ queryKey: ['people'] }, (oldData) => {
          if (!oldData?.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item) => (
              item.id === personId || String(item.id) === idStr
                ? { ...item, ...updates }
                : item
            )),
          };
        });

        // Update infinite people lists
        queryClient.setQueriesData({ queryKey: ['people-infinite'] }, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: (page.items || []).map((item) => (
                item.id === personId || String(item.id) === idStr
                  ? { ...item, ...updates }
                  : item
              )),
            })),
          };
        });

        // Update library list
        queryClient.setQueriesData({ queryKey: ['library'] }, (oldData) => {
          if (!oldData?.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item) => (
              item.id === personId || String(item.id) === idStr
                ? { ...item, ...updates }
                : item
            )),
          };
        });
      }

      return { previousPersonDetails, previousPeople, previousPeopleInfinite, previousLibrary };
    },
    onError: (err, variables, context) => {
      if (context) {
        if (context.previousPersonDetails) {
          context.previousPersonDetails.forEach(([key, val]) => {
            queryClient.setQueryData(key, val);
          });
        }
        if (context.previousPeople) {
          context.previousPeople.forEach(([key, val]) => {
            queryClient.setQueryData(key, val);
          });
        }
        if (context.previousPeopleInfinite) {
          context.previousPeopleInfinite.forEach(([key, val]) => {
            queryClient.setQueryData(key, val);
          });
        }
        if (context.previousLibrary) {
          context.previousLibrary.forEach(([key, val]) => {
            queryClient.setQueryData(key, val);
          });
        }
      }
    },
    onSuccess: (data, variables) => {
      invalidatePerson(queryClient, variables.personId, { lists: true, recommendations: true });
    },
  });
};

export const useOverridePersonBackdropMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, backdropPath }) => api.people.overrideBackdrop(personId, backdropPath),
    onSuccess: (data, variables) => {
      const { personId } = variables;
      syncPersonBackdropCaches(queryClient, personId, data);
      invalidatePerson(queryClient, personId);
    },
  });
};

export const useUploadPersonBackdropMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, file }) => api.people.uploadBackdrop(personId, file),
    onSuccess: (data, variables) => {
      const { personId } = variables;
      syncPersonBackdropCaches(queryClient, personId, data);
      invalidatePerson(queryClient, personId);
    },
  });
};

export const useOverridePersonProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, profilePath }) => api.people.overrideProfile(personId, profilePath),
    onSuccess: (data, variables) => {
      const { personId } = variables;
      syncPersonProfileCaches(queryClient, personId, data);
      invalidatePerson(queryClient, personId, { listsList: true });
    },
  });
};

export const useUploadPersonProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, file }) => api.people.uploadProfile(personId, file),
    onSuccess: (data, variables) => {
      const { personId } = variables;
      syncPersonProfileCaches(queryClient, personId, data);
      invalidatePerson(queryClient, personId, { listsList: true });
    },
  });
};

export const useLinkPersonSourceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, source, externalId, overrides, profileUrl }) => api.people.linkSource(personId, source, externalId, overrides, profileUrl),
    onSuccess: (data, variables) => {
      invalidatePerson(queryClient, variables.personId, { lists: true, recommendations: true, listsList: true });
    },
  });
};

export const useDeletePersonMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId) => api.people.delete(personId),
    onSuccess: (data, personId) => {
      invalidatePerson(queryClient, personId, { lists: true, stats: true, recommendations: true });
      queryClient.removeQueries({ queryKey: ['person-detail', personId] });
      queryClient.removeQueries({ queryKey: ['person-detail', String(personId)] });
      queryClient.removeQueries({ queryKey: ['person-credits', personId] });
      queryClient.removeQueries({ queryKey: ['person-credits', String(personId)] });
    },
  });
};

export const useUnlinkPersonSourceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, source, action }) => api.people.unlinkSource(personId, source, action),
    onMutate: async ({ personId, source }) => {
      const idStr = String(personId);
      const idNum = Number(personId);
      const isNumValid = !isNaN(idNum);

      const personKeys = [
        ['person-detail', personId],
        ['person-detail', idStr],
      ];
      if (isNumValid) {
        personKeys.push(['person-detail', idNum]);
      }

      for (const key of personKeys) {
        await queryClient.cancelQueries({ queryKey: key });
      }

      const previousPersonDetail = queryClient.getQueryData(['person-detail', idStr]) || queryClient.getQueryData(['person-detail', personId]);

      const dbNames = [source];
      if (source === 'theporndb') dbNames.push('porndb');
      if (source === 'porndb') dbNames.push('theporndb');

      const updateData = (oldData) => {
        if (!oldData) return oldData;
        const newExternalLinks = (oldData.external_links || []).filter(
          (l) => !dbNames.includes(l.provider)
        );
        const newExternalIds = { ...(oldData.external_ids || {}) };
        dbNames.forEach((dbName) => {
          delete newExternalIds[dbName];
          delete newExternalIds[`${dbName}_id`];
        });
        
        let newPrimaryProvider = oldData.primary_provider;
        if (dbNames.includes(oldData.primary_provider)) {
          newPrimaryProvider = null;
        }

        return {
          ...oldData,
          external_links: newExternalLinks,
          external_ids: newExternalIds,
          primary_provider: newPrimaryProvider,
        };
      };

      personKeys.forEach((key) => {
        queryClient.setQueryData(key, updateData);
      });

      return { previousPersonDetail, personId };
    },
    onError: (err, variables, context) => {
      if (context && 'previousPersonDetail' in context) {
        const idStr = String(context.personId);
        const idNum = Number(context.personId);
        const isNumValid = !isNaN(idNum);

        queryClient.setQueryData(['person-detail', context.personId], context.previousPersonDetail);
        queryClient.setQueryData(['person-detail', idStr], context.previousPersonDetail);
        if (isNumValid) {
          queryClient.setQueryData(['person-detail', idNum], context.previousPersonDetail);
        }
      }
    },
    onSettled: (data, error, variables) => {
      invalidatePerson(queryClient, variables.personId, { lists: true, recommendations: true });
    },
  });
};

export const useSetPrimaryPersonSourceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, source }) => api.people.setPrimarySource(personId, source),
    onSuccess: (data, variables) => {
      const idStr = String(variables.personId);
      const idNum = Number(variables.personId);
      const isNumValid = !isNaN(idNum);

      const personKeys = [
        ['person-detail', variables.personId],
        ['person-detail', idStr],
      ];
      if (isNumValid) {
        personKeys.push(['person-detail', idNum]);
      }

      personKeys.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            primary_provider: variables.source,
          };
        });
      });

      invalidatePerson(queryClient, variables.personId, { lists: true });
    },
  });
};

export const useSetPersonFieldRoutingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, routing }) => api.people.setFieldRouting(personId, routing),
    onSuccess: (data, variables) => {
      invalidatePerson(queryClient, variables.personId, { lists: true });
    },
  });
};

export const useSavePersonCustomFieldsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, fields }) => api.people.saveCustomFields(personId, fields),
    onSuccess: (data, variables) => {
      invalidatePerson(queryClient, variables.personId, { lists: true });
    },
  });
};
