import { useMemo } from 'react';
import { EXTRA_CATEGORY_BY_TAB } from './organizerMappers';
import { EXTRAS_TABS, MAIN_TABS, MANUAL_TABS } from './organizerConstants';

const getMainTabsForMode = (scanMode) => {
  if (scanMode === 'scenes') return ['manual', 'scenes', 'extras'];
  if (scanMode === 'jav') return ['manual', 'jav', 'extras'];
  return ['manual', 'movies', 'episodes', 'extras'];
};

const isExtraForMode = (item, scanMode) => {
  const parentType = String(item.parent_type || '').toLowerCase();
  if (scanMode === 'scenes') return parentType === 'scene' && item.category !== 'video';
  if (scanMode === 'jav') return parentType === 'jav';
  return parentType !== 'scene' && parentType !== 'jav';
};
const getManualTabsForMode = (scanMode) => {
  if (scanMode === 'scenes') return ['scenes'];
  if (scanMode === 'jav') return ['jav'];
  return ['movies', 'episodes'];
};

export function useOrganizerTabs({ discoveryExtras, t, tabCounts, dismissedRowIds, scanMode }) {
  const computedMainTabs = useMemo(() => {
    const allowedTabs = new Set(getMainTabsForMode(scanMode));
    return MAIN_TABS.filter((tab) => allowedTabs.has(tab.value)).map((tab) => ({
      ...tab,
      label: t(tab.labelKey),
      count: tab.value === 'manual'
        ? tabCounts.manualCount
        : tab.value === 'movies'
          ? tabCounts.moviesCount
          : tab.value === 'episodes'
            ? tabCounts.episodesCount
            : tab.value === 'scenes'
              ? tabCounts.scenesCount
              : tab.value === 'jav'
                ? tabCounts.javCount
                : tabCounts.extrasCount,
    }));
  }, [t, tabCounts, scanMode]);

  const computedManualTabs = useMemo(() => {
    const allowedTabs = new Set(getManualTabsForMode(scanMode));
    return MANUAL_TABS.filter((tab) => allowedTabs.has(tab.value)).map((tab) => ({
      ...tab,
      label: t(tab.labelKey),
      count: tab.value === 'movies'
        ? tabCounts.manualMoviesCount
        : tab.value === 'episodes'
          ? tabCounts.manualEpisodesCount
          : tab.value === 'scenes'
            ? tabCounts.manualScenesCount
            : tabCounts.manualJavCount,
    }));
  }, [t, tabCounts, scanMode]);

  const computedExtrasTabs = useMemo(() => EXTRAS_TABS
    .filter((tab) => scanMode !== 'scenes' || tab.value !== 'bonus')
    .map((tab) => ({
    ...tab,
    label: t(tab.labelKey),
    count: (discoveryExtras || []).filter((item) => {
      if (!isExtraForMode(item, scanMode) || item.category !== EXTRA_CATEGORY_BY_TAB[tab.value]) {
        return false;
      }
      if (dismissedRowIds) {
        const id = `extra-${item.id}`;
        const parentId = `item-${item.parent_id || item.parent_item_id}`;
        if (dismissedRowIds.has(id) || dismissedRowIds.has(parentId)) {
          return false;
        }
      }
      return true;
    }).length,
  })), [discoveryExtras, t, dismissedRowIds, scanMode]);

  return {
    computedExtrasTabs,
    computedManualTabs,
    computedMainTabs,
  };
}