import { useState, useMemo } from 'react';
import { useTranslation } from '@/providers/LanguageContext';
import { useTvSeasonsQuery, useTvEpisodesQuery } from '@/queries';

const createBrowserState = () => ({
  view: 'results',
  tvCandidate: null,
  selectedSeason: null,
  bucketEpisodes: [],
});

const getDisplayTitle = (candidate, mediaType, t) => (
  candidate?.title
  || candidate?.name
  || candidate?.original_title
  || candidate?.original_name
  || (mediaType === 'tv' ? t('organizer.details.matchModal.unknownTv') : t('organizer.details.matchModal.unknownMovie'))
);

export function useMatchBrowser({ t }) {
  const [browserState, setBrowserState] = useState(createBrowserState);

  const { locale } = useTranslation();
  const tmdbLanguage = locale === 'en' ? 'en-US' : `${locale}-${locale.toUpperCase()}`;

  const tvId = browserState.tvCandidate?.tmdb_id || browserState.tvCandidate?.id;
  const { data: seasonsData, isFetching: isSeasonsFetching } = useTvSeasonsQuery(tvId, {
    enabled: !!tvId,
    language: tmdbLanguage,
  });

  const selectedSeasonNum = browserState.selectedSeason?.season_number;
  const { data: episodesData, isFetching: isEpisodesFetching } = useTvEpisodesQuery(tvId, selectedSeasonNum, {
    enabled: !!tvId && selectedSeasonNum != null,
    language: tmdbLanguage,
  });

  const isBrowserLoading = isSeasonsFetching || isEpisodesFetching;

  const resetBrowser = () => setBrowserState(createBrowserState());

  const handleBrowseTv = async (candidate) => {
    setBrowserState({
      view: 'seasons',
      tvCandidate: candidate,
      selectedSeason: null,
      bucketEpisodes: [],
    });
  };

  const handleBrowseSeason = async (seasonEntry) => {
    setBrowserState((current) => ({
      ...current,
      view: 'episodes',
      selectedSeason: seasonEntry,
      bucketEpisodes: [],
    }));
  };

  const handleDirectBrowse = (candidate, seasonNumber) => {
    const seasons = candidate.seasons || [];
    const matchedSeason = seasons.find(s => s.season_number === seasonNumber);
    if (matchedSeason) {
      setBrowserState({
        view: 'episodes',
        tvCandidate: candidate,
        selectedSeason: matchedSeason,
        bucketEpisodes: [],
      });
    } else {
      handleBrowseTv(candidate);
    }
  };

  const handleBrowserBack = () => {
    setBrowserState((current) => {
      if (current.view === 'episodes') {
        return {
          ...current,
          view: 'seasons',
          selectedSeason: null,
          bucketEpisodes: [],
        };
      }
      return createBrowserState();
    });
  };

  const browserTitle = browserState.view === 'episodes'
    ? browserState.selectedSeason?.name || t('organizer.details.matchModal.seasonNum').replace('{number}', browserState.selectedSeason?.season_number ?? '')
    : browserState.tvCandidate
      ? getDisplayTitle(browserState.tvCandidate, 'tv', t)
      : '';

  const seasonsList = seasonsData?.seasons;
  const episodesList = episodesData?.episodes;

  const browserMetaItems = browserState.view === 'episodes'
    ? [
        browserState.selectedSeason?.episode_count ? `${browserState.selectedSeason.episode_count} eps` : null,
      ]
    : [
        seasonsList?.length ? `${seasonsList.length} seasons` : null,
      ];

  const bucketEpisodeNumbers = browserState.bucketEpisodes || [];

  const toggleBucketEpisode = (episodeNumber) => {
    setBrowserState((current) => {
      const nextBucket = current.bucketEpisodes.includes(episodeNumber)
        ? current.bucketEpisodes.filter((value) => value !== episodeNumber)
        : [...current.bucketEpisodes, episodeNumber].sort((a, b) => a - b);

      return {
        ...current,
        bucketEpisodes: nextBucket,
      };
    });
  };

  const returnedBrowserState = useMemo(() => ({
    ...browserState,
    seasons: seasonsList || [],
    episodes: episodesList || [],
  }), [browserState, seasonsList, episodesList]);

  return {
    browserState: returnedBrowserState,
    isBrowserLoading,
    resetBrowser,
    handleBrowseTv,
    handleBrowseSeason,
    handleDirectBrowse,
    handleBrowserBack,
    browserTitle,
    browserMetaItems,
    bucketEpisodeNumbers,
    toggleBucketEpisode,
  };
}
