import { useState, useMemo } from 'react';
import { useTranslation } from '@/providers/LanguageContext';
import { Clapperboard, Tv, Video, Users } from '@/ui/icons';
import { useRatingsPageState } from '../ratings/useRatingsPageState';
import { useStatsQuery } from '../../queries';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';

const RADAR_GENRE_LIMIT = 6;
const MIN_DNA_TITLES = 4;
const MIN_TIMELINE_TITLES = 5;

const translateGenreLabel = (label, T) => {
  if (!label) return '';
  const genreKey = `library.genres.${label}`;
  const translated = T(genreKey);
  return (translated && translated !== genreKey) ? translated : label;
};

const isSingleGenreLabel = (label) => {
  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('&')) return false;
  if (normalized.includes('/')) return false;
  if (normalized.includes(',')) return false;
  if (/\b(and|és)\b/.test(normalized)) return false;
  return true;
};

export function useStatisticsPage() {
  const { t } = useTranslation();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {}, isLoading } = useStatsQuery(sessionMode === 'nsfw');
  const ratingsState = useRatingsPageState();
  const [distTab, setDistTab] = useState('movies');

  const isAdultMode = ratingsState.activeSessionMode === 'nsfw';
  const effectiveDistTab = !isAdultMode && distTab === 'scenes' ? 'movies' : distTab;

  const distTabs = useMemo(() => [
    { value: 'movies', label: t('tabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'tv', label: t('tabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(ratingsState.hasAdultSupport ? [{ value: 'scenes', label: t('tabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'videos', label: t('tabs.videos', { defaultValue: 'Videos' }) || 'Videos', icon: Video },
    { value: 'people', label: t('tabs.people', { defaultValue: 'People' }), icon: Users },
  ], [t, ratingsState.hasAdultSupport]);

  const insightTitleCount = useMemo(
    () => Object.values(stats?.decade_distribution || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [stats.decade_distribution]
  );

  const scenesStats = useMemo(() => {
    const totalScenes = stats.total_scenes || 0;
    const totalVideos = stats.total_videos || 0;
    const isNsfw = sessionMode === 'nsfw';

    return {
      title: isNsfw
        ? (t('statistics.stats.total_scenes_videos') || 'Scenes & Videos')
        : (t('statistics.stats.total_videos') || 'Total Videos'),
      value: isNsfw
        ? (totalScenes + totalVideos).toLocaleString()
        : totalScenes.toLocaleString(),
      subText: isNsfw && totalVideos > 0
        ? `${totalScenes} scenes, ${totalVideos} videos`
        : isNsfw
          ? (t('statistics.stats.scenes_sub') || 'Scenes in library')
          : (t('statistics.stats.videos_sub') || 'Videos in library'),
    };
  }, [stats.total_scenes, stats.total_videos, sessionMode, t]);

  const dnaData = useMemo(() => {
    const constellation = stats?.genre_constellation;
    const sourceNodes = constellation?.nodes || [];
    
    const isMocked = constellation?.is_mocked ?? false;
    const sortedNodes = [...sourceNodes].sort((a, b) => (b.count || 0) - (a.count || 0));
    const nodes = sortedNodes.slice(0, RADAR_GENRE_LIMIT).map((node) => ({
      ...node,
      translatedLabel: translateGenreLabel(node.label, t),
    }));
    const otherGenres = sortedNodes.slice(RADAR_GENRE_LIMIT).map((node) => ({
      ...node,
      translatedLabel: translateGenreLabel(node.label, t),
    }));

    const hasEnoughData = constellation?.has_enough_data ?? false;

    return {
      nodes,
      otherGenres: isMocked ? [] : otherGenres,
      isMocked,
      hasEnoughData,
    };
  }, [stats.genre_constellation, t]);

  const timelineData = useMemo(() => {
    const decades = stats?.decade_distribution || {};
    const isMocked = stats?.timeline_is_mocked ?? false;
    const sorted = Object.entries(decades).sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...sorted.map(([, count]) => count), 1);
    const topDecade = sorted.length > 0 ? [...sorted].sort((a, b) => b[1] - a[1])[0][0] : '2000s';
    
    const formatDecade = (decade) => {
      const match = String(decade || '').match(/^(\d{4})s$/);
      return match ? t('statistics.stats.decade_label', { decade: match[1] }) || `${match[1]}s` : decade;
    };
    const topDecadeLabel = formatDecade(topDecade);

    const hasEnoughData = stats?.timeline_has_enough_data ?? false;

    return {
      sorted,
      maxCount,
      topDecadeLabel,
      isMocked,
      hasEnoughData,
      formatDecade,
    };
  }, [stats.decade_distribution, stats.timeline_is_mocked, stats.timeline_has_enough_data, t]);

  const activeDistStats = useMemo(() => {
    if (ratingsState.isStatsLoading) return null;
    const statsObj = 
      effectiveDistTab === 'people' ? ratingsState.peopleStats :
      effectiveDistTab === 'tv' ? ratingsState.tvStats :
      effectiveDistTab === 'scenes' ? ratingsState.scenesStats :
      effectiveDistTab === 'videos' ? ratingsState.videosStats :
      ratingsState.moviesStats;

    if (!statsObj || !statsObj.distributionRows) return null;

    return {
      distributionRows: statsObj.distributionRows,
    };
  }, [ratingsState, effectiveDistTab]);

  return {
    t,
    stats,
    isLoading,
    sessionMode,
    ratingsState,
    distTab,
    setDistTab,
    isAdultMode,
    effectiveDistTab,
    distTabs,
    insightTitleCount,
    scenesStats,
    dnaData,
    timelineData,
    activeDistStats,
    MIN_DNA_TITLES,
    MIN_TIMELINE_TITLES,
  };
}
