import { useMemo } from 'react';
import { useAllTagsQuery, useTagsQuery } from '@/queries/libraryQueries';
import { getLibraryTagBucketKeys } from '@/lib/libraryTabs';
import { getBackdropImagePath, getPosterImagePath } from '@/lib/imageUrls';
import { isSceneMediaType } from '@/lib/mediaTypes';

export function useLibraryTags({ activeSessionMode }) {
  const isNsfw = activeSessionMode === 'nsfw';
  const { data: tagsData, isLoading: isTagsLoading } = useTagsQuery(isNsfw);
  const { data: allTags = [], isLoading: isAllTagsLoading } = useAllTagsQuery(isNsfw);

  const processedTags = useMemo(() => {
    const usageTags = Array.isArray(tagsData) ? tagsData.flatMap((g) => g.tags || []) : [];
    const allDefinedTags = Array.isArray(allTags) ? allTags : [];
    const bucketKeys = getLibraryTagBucketKeys(activeSessionMode);
    const usageByName = new Map(
      usageTags.map((tag) => [tag.name?.toLowerCase?.() || '', tag])
    );

    const mergedTags = [...allDefinedTags];
    const seen = new Set();

    usageTags.forEach((tag) => {
      const key = tag.name?.toLowerCase?.() || '';
      if (!key || allDefinedTags.some((definedTag) => (definedTag.name?.toLowerCase?.() || '') === key)) {
        return;
      }
      mergedTags.push(tag);
    });

    return mergedTags
      .filter((tag) => {
        const key = tag.name?.toLowerCase?.() || '';
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((definedTag) => {
        const usageTag = usageByName.get(definedTag.name?.toLowerCase?.() || '') || definedTag;
        const tag = {
          ...definedTag,
          ...usageTag,
          custom_images: usageTag.custom_images ?? definedTag.custom_images,
          color: usageTag.color ?? definedTag.color,
        };
        const modeItems = bucketKeys.flatMap((key) => tag[key] || []);
        const localCount = modeItems.length;

        const hasCustomImages = Array.isArray(tag.custom_images) && tag.custom_images.length > 0;
        const localPreviews = hasCustomImages
          ? tag.sample_previews
          : (() => {
              const scenesList = [];
              const postersList = [];
              const seenPaths = new Set();

              for (const item of modeItems) {
                const isScene = isSceneMediaType(item.type);
                const poster = getPosterImagePath(item);
                const backdrop = getBackdropImagePath(item);
                const path = poster || backdrop || item.still_path;

                if (path && !seenPaths.has(path)) {
                  seenPaths.add(path);
                  const previewObj = {
                    poster,
                    backdrop,
                    still: item.still_path || backdrop || poster,
                    kind: item.type,
                  };
                  if (isScene) {
                    scenesList.push(previewObj);
                  } else {
                    postersList.push(previewObj);
                  }
                }
              }

              // Apply priority rules:
              // 1. If we have 3 or more posters, they have priority (3 posters)
              if (postersList.length >= 3) {
                return postersList.slice(0, 3);
              }

              // 2. Only scenes (1 or more scenes -> show 1)
              if (scenesList.length >= 1 && postersList.length === 0) {
                return [scenesList[0]];
              }

              // 3. 1 scene + (1 or 2 posters) -> 1 scene + 1 poster (fills area evenly)
              if (scenesList.length >= 1 && postersList.length >= 1) {
                return [scenesList[0], postersList[0]];
              }

              // Fallback: If only posters (less than 3)
              if (postersList.length > 0) {
                return postersList.slice(0, 3);
              }

              return [];
            })();

        return {
          ...tag,
          total_count: localCount,
          mode_items: modeItems,
          sample_previews: localPreviews,
        };
      });
  }, [tagsData, allTags, activeSessionMode]);

  return {
    tagsData,
    processedTags,
    isTagsLoading: isTagsLoading || isAllTagsLoading,
  };
}
