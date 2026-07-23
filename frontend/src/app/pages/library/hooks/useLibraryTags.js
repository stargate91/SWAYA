import { useMemo } from 'react';
import { useTagsQuery } from '@/queries/libraryQueries';

export function useLibraryTags({ activeSessionMode, page = 1, pageSize = 40, searchQuery = '' }) {
  const isNsfw = activeSessionMode === 'nsfw';
  const { data: tagsResponse, isLoading: isTagsLoading } = useTagsQuery(isNsfw, page, pageSize, searchQuery);
  const tagsData = tagsResponse?.items;

  const processedTags = useMemo(() => {
    const usageTags = Array.isArray(tagsData) ? tagsData.flatMap((g) => g.tags || []) : [];

    return usageTags.map((tag) => ({
      ...tag,
      total_count: tag.total_count ?? 0,
      mode_items: [],
      sample_previews: tag.sample_previews || [],
    }));
  }, [tagsData]);

  return {
    tagsData,
    processedTags,
    isTagsLoading,
    tagsResponse,
  };
}
