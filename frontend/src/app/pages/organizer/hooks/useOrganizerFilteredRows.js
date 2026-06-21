import { useMemo } from 'react';
import {
  EXTRA_CATEGORY_BY_TAB,
  MANUAL_REVIEW_STATUSES,
  mapDiscoveryItemRow,
  mapExtraRow,
  MATCHED_STATUSES,
  normalizeItemStatus,
} from '../organizerMappers';
import { isEpisodeMediaType, isMovieMediaType, isTvLikeMediaType } from '@/lib/mediaTypes';

const normalizeType = (value) => String(value || '').toLowerCase();
const isSceneType = (value) => normalizeType(value) === 'scene';
const isJavType = (value) => normalizeType(value) === 'jav';
const isRegularMovieType = (value) => isMovieMediaType(value) && !isJavType(value);
const isModeType = (item, scanMode) => {
  if (scanMode === 'scenes') return isSceneType(item.type);
  if (scanMode === 'jav') return isJavType(item.type);
  return !isSceneType(item.type) && !isJavType(item.type);
};
const isExtraForMode = (item, scanMode) => {
  if (scanMode === 'scenes' && item.category === 'video') return false;
  return isModeType({ type: item.parent_type }, scanMode);
};

export function useOrganizerFilteredRows({
  discovery,
  t,
  activeMainTab,
  activeExtrasTab,
  activeManualTab,
  dismissedRowIds,
  scanMode,
}) {
  const reviewDiscoveryMedia = useMemo(
    () => [
      ...(discovery.manual || []),
      ...(discovery.movies || []),
      ...(discovery.tv || []),
    ],
    [discovery],
  );

  const matchedDiscoveryMedia = useMemo(
    () => [
      ...(discovery.movies || []),
      ...(discovery.tv || []),
      ...(discovery.collisions || []),
    ],
    [discovery],
  );

  const tabCounts = useMemo(() => {
    const visibleReview = reviewDiscoveryMedia.filter((item) => {
      const id = `item-${item.id}`;
      return !dismissedRowIds.has(id)
        && isModeType(item, scanMode)
        && MANUAL_REVIEW_STATUSES.has(normalizeItemStatus(item.status));
    });
    const visibleMatched = matchedDiscoveryMedia.filter((item) => {
      const id = `item-${item.id}`;
      return !dismissedRowIds.has(id)
        && isModeType(item, scanMode)
        && MATCHED_STATUSES.has(normalizeItemStatus(item.status));
    });

    const manualCount = visibleReview.length;
    const manualMoviesCount = visibleReview.filter((item) => isRegularMovieType(item.type)).length;
    const manualEpisodesCount = visibleReview.filter((item) => isTvLikeMediaType(item.type)).length;
    const manualScenesCount = visibleReview.filter((item) => isSceneType(item.type)).length;
    const manualJavCount = visibleReview.filter((item) => isJavType(item.type)).length;

    const moviesCount = visibleMatched.filter((item) => isRegularMovieType(item.type)).length;
    const episodesCount = visibleMatched.filter((item) => isEpisodeMediaType(item.type)).length;
    const scenesCount = visibleMatched.filter((item) => isSceneType(item.type)).length;
    const javCount = visibleMatched.filter((item) => isJavType(item.type)).length;

    const extrasCount = (discovery.extras || []).filter((item) => {
      const id = `extra-${item.id}`;
      const parentId = `item-${item.parent_id || item.parent_item_id}`;
      return isExtraForMode(item, scanMode) && !dismissedRowIds.has(id) && !dismissedRowIds.has(parentId);
    }).length;

    return {
      manualCount,
      manualMoviesCount,
      manualEpisodesCount,
      manualScenesCount,
      manualJavCount,
      moviesCount,
      episodesCount,
      scenesCount,
      javCount,
      extrasCount,
    };
  }, [discovery, matchedDiscoveryMedia, reviewDiscoveryMedia, dismissedRowIds, scanMode]);

  const tabFilteredRows = useMemo(() => {
    let rows = [];
    if (activeMainTab === 'manual') {
      rows = reviewDiscoveryMedia
        .filter((item) => {
          const statusMatches = MANUAL_REVIEW_STATUSES.has(normalizeItemStatus(item.status));
          if (!statusMatches) return false;
          if (activeManualTab === 'movies') return isRegularMovieType(item.type);
          if (activeManualTab === 'episodes') return isTvLikeMediaType(item.type);
          if (activeManualTab === 'scenes') return isSceneType(item.type);
          if (activeManualTab === 'jav') return isJavType(item.type);
          return false;
        })
        .map((item) => mapDiscoveryItemRow(item, t));
    } else if (activeMainTab === 'movies') {
      rows = matchedDiscoveryMedia
        .filter((item) => isRegularMovieType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
        .map((item) => mapDiscoveryItemRow(item, t));
    } else if (activeMainTab === 'episodes') {
      rows = matchedDiscoveryMedia
        .filter((item) => isEpisodeMediaType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
        .map((item) => mapDiscoveryItemRow(item, t));
    } else if (activeMainTab === 'scenes') {
      rows = matchedDiscoveryMedia
        .filter((item) => isSceneType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
        .map((item) => mapDiscoveryItemRow(item, t));
    } else if (activeMainTab === 'jav') {
      rows = matchedDiscoveryMedia
        .filter((item) => isJavType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
        .map((item) => mapDiscoveryItemRow(item, t));
    } else if (activeMainTab === 'extras') {
      rows = (discovery.extras || [])
        .filter((item) => isExtraForMode(item, scanMode) && item.category === EXTRA_CATEGORY_BY_TAB[activeExtrasTab])
        .map((item) => mapExtraRow(item, t));
    }

    return rows.filter(
      (row) =>
        !dismissedRowIds.has(row.id) &&
        (row.rawType !== 'extra' || !dismissedRowIds.has(`item-${row.parent_id}`))
    );
  }, [activeExtrasTab, activeManualTab, activeMainTab, discovery, matchedDiscoveryMedia, reviewDiscoveryMedia, t, dismissedRowIds, scanMode]);

  return {
    reviewDiscoveryMedia,
    matchedDiscoveryMedia,
    tabCounts,
    tabFilteredRows,
  };
}