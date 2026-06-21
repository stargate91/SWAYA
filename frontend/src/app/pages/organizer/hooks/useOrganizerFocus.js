import {
  EXTRA_CATEGORY_BY_TAB,
  MANUAL_REVIEW_STATUSES,
  mapDiscoveryItemRow,
  mapExtraRow,
  MATCHED_STATUSES,
  normalizeItemStatus,
} from '../organizerMappers';
import { scrollOrganizerToTop } from '../organizerScroll';
import { isEpisodeMediaType, isMovieMediaType, isTvLikeMediaType } from '@/lib/mediaTypes';

const normalizeType = (value) => String(value || '').toLowerCase();
const isSceneType = (value) => normalizeType(value) === 'scene';
const isJavType = (value) => normalizeType(value) === 'jav';
const isRegularMovieType = (value) => isMovieMediaType(value) && !isJavType(value);
const isExtraForMode = (item, scanMode) => {
  const parentType = String(item.parent_type || '').toLowerCase();
  if (scanMode === 'scenes') return parentType === 'scene' && item.category !== 'video';
  if (scanMode === 'jav') return parentType === 'jav';
  return parentType !== 'scene' && parentType !== 'jav';
};

export function useOrganizerFocus({
  discovery,
  t,
  activeRowId,
  setActiveRowId,
  setActiveMainTab,
  setActiveExtrasTab,
  setActiveManualTab,
  setSearchQuery,
  setSelectedRowIds,
  setCurrentPage,
  setIsDetailsCollapsed,
  scanMode,
}) {
  const focusFirstAvailableResult = (nextDiscovery = discovery) => {
    const modeExtras = (nextDiscovery.extras || []).filter((item) => isExtraForMode(item, scanMode));
    if (activeRowId) {
      const allIds = new Set([
        ...(nextDiscovery.manual || []).map((i) => `item-${i.id}`),
        ...(nextDiscovery.movies || []).map((i) => `item-${i.id}`),
        ...(nextDiscovery.tv || []).map((i) => `item-${i.id}`),
        ...(nextDiscovery.collisions || []).map((i) => `item-${i.id}`),
        ...modeExtras.map((i) => `extra-${i.id}`),
      ]);
      if (allIds.has(activeRowId)) {
        return;
      }
    }
    const reviewMedia = [
      ...(nextDiscovery.manual || []),
      ...(nextDiscovery.movies || []),
      ...(nextDiscovery.tv || []),
    ];
    const matchedMedia = [
      ...(nextDiscovery.movies || []),
      ...(nextDiscovery.tv || []),
      ...(nextDiscovery.collisions || []),
    ];
    const movieRows = matchedMedia
      .filter((item) => isRegularMovieType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const episodeRows = matchedMedia
      .filter((item) => isEpisodeMediaType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const manualMovieRows = reviewMedia
      .filter((item) => isRegularMovieType(item.type) && MANUAL_REVIEW_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const manualEpisodeRows = reviewMedia
      .filter((item) => isTvLikeMediaType(item.type) && MANUAL_REVIEW_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const sceneRows = matchedMedia
      .filter((item) => isSceneType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const javRows = matchedMedia
      .filter((item) => isJavType(item.type) && MATCHED_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const manualSceneRows = reviewMedia
      .filter((item) => isSceneType(item.type) && MANUAL_REVIEW_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const manualJavRows = reviewMedia
      .filter((item) => isJavType(item.type) && MANUAL_REVIEW_STATUSES.has(normalizeItemStatus(item.status)))
      .map((item) => mapDiscoveryItemRow(item, t));
    const extraTabPriority = ['bonus', 'subtitles', 'audio', 'images', 'metadata'];
    const firstExtraTab = extraTabPriority.find((tab) =>
      modeExtras.some((item) => item.category === EXTRA_CATEGORY_BY_TAB[tab]));
    const extraRows = firstExtraTab
      ? modeExtras
          .filter((item) => item.category === EXTRA_CATEGORY_BY_TAB[firstExtraTab])
          .map((item) => mapExtraRow(item, t))
      : [];

    const targetPriority = scanMode === 'scenes'
      ? [
          { mainTab: 'scenes', rows: sceneRows },
          { mainTab: 'manual', rows: manualSceneRows, manualTab: 'scenes' },
          { mainTab: 'extras', rows: extraRows, extrasTab: firstExtraTab },
        ]
      : scanMode === 'jav'
        ? [
            { mainTab: 'jav', rows: javRows },
            { mainTab: 'manual', rows: manualJavRows, manualTab: 'jav' },
            { mainTab: 'extras', rows: extraRows, extrasTab: firstExtraTab },
          ]
        : [
            { mainTab: 'movies', rows: movieRows },
            { mainTab: 'episodes', rows: episodeRows },
            { mainTab: 'manual', rows: manualMovieRows, manualTab: 'movies' },
            { mainTab: 'manual', rows: manualEpisodeRows, manualTab: 'episodes' },
            { mainTab: 'extras', rows: extraRows, extrasTab: firstExtraTab },
          ];
    const firstTarget = targetPriority.find((entry) => entry.rows.length > 0);

    if (!firstTarget) {
      setActiveRowId(null);
      return;
    }

    setActiveMainTab(firstTarget.mainTab);
    if (firstTarget.extrasTab) {
      setActiveExtrasTab(firstTarget.extrasTab);
    }
    if (firstTarget.manualTab) {
      setActiveManualTab(firstTarget.manualTab);
    }
    setSearchQuery('');
    setSelectedRowIds(new Set());
    setCurrentPage(1);
    setActiveRowId(firstTarget.rows[0].id);
    setIsDetailsCollapsed(false);
    try {
      localStorage.setItem('organizer_details_collapsed', JSON.stringify(false));
    } catch {
      // Ignore storage access errors.
    }
    scrollOrganizerToTop();
  };

  return {
    focusFirstAvailableResult,
  };
}
