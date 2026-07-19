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

export function useStatisticsPageState() {
  const { t } = useTranslation();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {}, isLoading } = useStatsQuery(sessionMode === 'nsfw');
  const ratingsState = useRatingsPageState();
  const [distTab, setDistTab] = useState('movies');

  const isAdultMode = ratingsState.activeSessionMode === 'nsfw';
  const effectiveDistTab = !isAdultMode && distTab === 'scenes' ? 'movies' : distTab;

  const distTabs = useMemo(() => [
    { value: 'movies', label: t('ratings.subtabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'tv', label: t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(ratingsState.hasAdultSupport ? [{ value: 'scenes', label: t('ratings.subtabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'videos', label: t('library.tabs.videos') || 'Videos', icon: Video },
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ], [t, ratingsState.hasAdultSupport]);

  const insightTitleCount = useMemo(
    () => Object.values(stats?.decade_distribution || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [stats?.decade_distribution]
  );

  const scenesStats = useMemo(() => {
    const totalScenes = stats.total_scenes || 0;
    const totalVideos = stats.total_videos || 0;
    const isNsfw = sessionMode === 'nsfw';

    return {
      title: isNsfw
        ? (t('statistics.stats.total_scenes_videos') || 'Scenes & Videos')
        : (t('statistics.stats.total_scenes') || 'Total Scenes'),
      value: isNsfw
        ? (totalScenes + totalVideos).toLocaleString()
        : totalScenes.toLocaleString(),
      subText: isNsfw && totalVideos > 0
        ? `${totalScenes} scenes, ${totalVideos} videos`
        : (t('statistics.stats.scenes_sub') || 'Scenes in library'),
    };
  }, [stats.total_scenes, stats.total_videos, sessionMode, t]);

  const dnaData = useMemo(() => {
    const constellation = stats?.genre_constellation;
    const genres = stats?.genre_distribution;
    const isNsfw = sessionMode === 'nsfw';

    const sanitizeNodes = (nodes = []) => (
      nodes.filter((node) => isSingleGenreLabel(node?.label))
    );

    let fallbackNodes = !genres || Object.keys(genres).length === 0
      ? []
      : Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, RADAR_GENRE_LIMIT + 6)
        .map(([label, count], index) => ({ id: `fallback-${index}`, label, count }));

    let sourceNodes = sanitizeNodes(constellation?.nodes?.length ? constellation.nodes : fallbackNodes);
    
    const isMocked = sourceNodes.length < 3;
    if (isMocked) {
      const mockLabels = isNsfw
        ? ['Anal', 'Blowjob', 'All Sex', 'POV', 'Hardcore', 'Solo']
        : ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Adventure'];
      
      sourceNodes = mockLabels.map((label, index) => ({
        id: `mock-${index}`,
        label,
        count: 10 - index,
      }));
    }

    const sortedNodes = [...sourceNodes].sort((a, b) => (b.count || 0) - (a.count || 0));
    const nodes = sortedNodes.slice(0, RADAR_GENRE_LIMIT).map((node) => ({
      ...node,
      translatedLabel: translateGenreLabel(node.label, t),
    }));
    const otherGenres = sortedNodes.slice(RADAR_GENRE_LIMIT).map((node) => ({
      ...node,
      translatedLabel: translateGenreLabel(node.label, t),
    }));

    const hasEnoughData = !isMocked && insightTitleCount >= MIN_DNA_TITLES && nodes.length >= 3;

    return {
      nodes,
      otherGenres: isMocked ? [] : otherGenres,
      isMocked,
      hasEnoughData,
    };
  }, [stats?.genre_constellation, stats?.genre_distribution, sessionMode, t, insightTitleCount]);

  const timelineData = useMemo(() => {
    const decades = stats?.decade_distribution;
    const isNsfw = sessionMode === 'nsfw';

    let mockDecades = decades;
    const isMocked = !decades || Object.keys(decades).length < 2;
    if (isMocked) {
      mockDecades = {
        '1980s': 3,
        '1990s': 6,
        '2000s': 12,
        '2010s': 8,
        '2020s': 5
      };
    }
    const sorted = Object.entries(mockDecades).sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...sorted.map(([, count]) => count), 1);
    const topDecade = [...sorted].sort((a, b) => b[1] - a[1])[0][0];
    
    const formatDecade = (decade) => {
      const match = String(decade || '').match(/^(\d{4})s$/);
      return match ? t('statistics.stats.decade_label', { decade: match[1] }) || `${match[1]}s` : decade;
    };
    const topDecadeLabel = formatDecade(topDecade);

    const hasEnoughData = !isMocked && insightTitleCount >= MIN_TIMELINE_TITLES && sorted.length >= 2;

    return {
      sorted,
      maxCount,
      topDecadeLabel,
      isMocked,
      hasEnoughData,
      formatDecade,
    };
  }, [stats?.decade_distribution, sessionMode, t, insightTitleCount]);

  const activeDistStats = useMemo(() => {
    if (ratingsState.isStatsLoading) return null;
    const statsObj = 
      effectiveDistTab === 'people' ? ratingsState.peopleStats :
      effectiveDistTab === 'tv' ? ratingsState.tvStats :
      effectiveDistTab === 'scenes' ? ratingsState.scenesStats :
      effectiveDistTab === 'videos' ? ratingsState.videosStats :
      ratingsState.moviesStats;

    if (!statsObj || !statsObj.distribution) return null;

    const maxCount = Math.max(...statsObj.distribution, 1);
    const distributionRows = statsObj.distribution.map((count, index) => {
      const percentage = (count / maxCount) * 100;
      const ratingLabel = ((index + 1) / 2).toString();
      return {
        count,
        percentage,
        ratingLabel,
      };
    });

    return {
      distributionRows,
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
