import { useMemo } from 'react';
import { EXTRA_CATEGORY_BY_TAB } from './organizerMappers';
import { EXTRAS_TABS, MAIN_TABS, MANUAL_TABS } from './organizerConstants';

const isAdultMovieMode = (scanMode, sessionMode) => scanMode === 'movies_tv' && sessionMode === 'nsfw';

const getMainTabsForMode = (scanMode, sessionMode) => {
  if (scanMode === 'offline') return ['scenes', 'extras'];
  if (scanMode === 'scenes') return ['manual', 'scenes', 'extras'];
  if (isAdultMovieMode(scanMode, sessionMode)) return ['manual', 'movies', 'extras'];
  return ['manual', 'movies', 'episodes', 'extras'];
};

const isExtraForMode = (item, scanMode, sessionMode) => {
  const parentType = String(item.parent_type || '').toLowerCase();
  if (scanMode === 'scenes' || scanMode === 'offline') return parentType === 'scene';
  if (isAdultMovieMode(scanMode, sessionMode)) return parentType === 'movie';
  return parentType !== 'scene';
};

const getManualTabsForMode = (scanMode, sessionMode) => {
  if (scanMode === 'scenes' || scanMode === 'offline') return ['scenes'];
  if (isAdultMovieMode(scanMode, sessionMode)) return ['movies'];
  return ['movies', 'episodes'];
};

export function useOrganizerTabs({ organizerExtras, t, tabCounts, dismissedRowIds, scanMode, sessionMode }) {
  const computedMainTabs = useMemo(() => {
    const allowedTabs = new Set(getMainTabsForMode(scanMode, sessionMode));
    return MAIN_TABS.filter((tab) => allowedTabs.has(tab.value)).map((tab) => {
      let label = t(tab.labelKey);
      if (scanMode === 'offline' && tab.value === 'scenes') {
        label = t('organizer.tabs.videos') || 'Videos';
      }
      return {
        ...tab,
        label,
        count: tab.value === 'manual'
          ? tabCounts.manualCount
          : tab.value === 'movies'
            ? tabCounts.moviesCount
            : tab.value === 'episodes'
              ? tabCounts.episodesCount
              : tab.value === 'scenes'
                ? tabCounts.scenesCount
                : tabCounts.extrasCount,
      };
    });
  }, [t, tabCounts, scanMode, sessionMode]);

  const computedManualTabs = useMemo(() => {
    const allowedTabs = new Set(getManualTabsForMode(scanMode, sessionMode));
    return MANUAL_TABS.filter((tab) => allowedTabs.has(tab.value)).map((tab) => ({
      ...tab,
      label: t(tab.labelKey),
      count: tab.value === 'movies'
        ? tabCounts.manualMoviesCount
        : tab.value === 'episodes'
          ? tabCounts.manualEpisodesCount
          : tabCounts.manualScenesCount,
    }));
  }, [t, tabCounts, scanMode, sessionMode]);

  const computedExtrasTabs = useMemo(() => EXTRAS_TABS
    .map((tab) => {
      let count = 0;
      if (tab.value === 'bonus') count = tabCounts.extraBonusCount || 0;
      else if (tab.value === 'subtitles') count = tabCounts.extraSubtitlesCount || 0;
      else if (tab.value === 'audio') count = tabCounts.extraAudioCount || 0;
      else if (tab.value === 'images') count = tabCounts.extraImagesCount || 0;
      else if (tab.value === 'metadata') count = tabCounts.extraMetadataCount || 0;

      return {
        ...tab,
        label: t(tab.labelKey),
        count,
      };
    }), [tabCounts, t]);

  return {
    computedExtrasTabs,
    computedManualTabs,
    computedMainTabs,
  };
}
