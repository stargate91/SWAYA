/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check, Clapperboard, Calendar, Tv
} from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { formatEpisodeNumber } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import { useTranslation as useLangTranslation } from '@/providers/LanguageContext';
import api from '@/lib/api';
import BespokeEpisodeDetail from './BespokeEpisodeDetail';
import Lightbox from '@/ui/Lightbox';
import PosterCard from '@/ui/PosterCard';
import ScrollRow from '@/ui/ScrollRow';
import Inline from '@/ui/Inline';
import './BespokeSeasonsSection.css';

export default function BespokeSeasonsSection() {
  const { state, mutations, t } = useMediaDetailContext();
  const { locale } = useLangTranslation();
  const metadataLanguage = locale === 'en' ? 'en-US' : locale;
  const { item, cleanId, nextEpisodeInfo } = state;
  const { bulkUpdateWatchedMutation } = mutations;
  const queryClient = useQueryClient();

  const [lightboxUrl, setLightboxUrl] = useState(null);

  const handleOpenLightbox = (url) => {
    if (url) {
      setLightboxUrl(url);
    }
  };

  const seasonsList = useMemo(() => item?.seasons || [], [item?.seasons]);
  const seasonsCount = seasonsList.length;

  // Determine initial season and episode selection
  const initialSeasonNumber = nextEpisodeInfo?.seasonNumber ?? seasonsList[0]?.season_number ?? 1;
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(initialSeasonNumber);

  const activeSeason = useMemo(() => {
    return seasonsList.find((s) => s.season_number === selectedSeasonNumber) || seasonsList[0];
  }, [seasonsList, selectedSeasonNumber]);

  const episodesText = useMemo(() => {
    if (!activeSeason) return '';
    return `${activeSeason.episode_count} ${t('library.details.episodes') || 'Episodes'}`;
  }, [activeSeason, t]);

  // Load season detail (episodes) progressive loading
  useEffect(() => {
    if (!item?.progressive_seasons || !activeSeason) return;
    if (activeSeason.episodes_complete !== false) return;

    let cancelled = false;
    const run = async () => {
      try {
        const seasonPayload = await api.library.getTvSeasonDetail(cleanId, activeSeason.season_number);
        if (cancelled) return;
        queryClient.setQueryData(['library-tv-detail', cleanId, metadataLanguage], (current) => {
          if (!current || !seasonPayload) return current;
          const existingSeasons = Array.isArray(current.seasons) ? current.seasons : [];
          const nextMap = new Map(existingSeasons.map((season) => [Number(season?.season_number), season]));
          nextMap.set(Number(seasonPayload.season_number), {
            ...(nextMap.get(Number(seasonPayload.season_number)) || {}),
            ...seasonPayload,
          });
          return {
            ...current,
            seasons: Array.from(nextMap.values()).sort((a, b) => Number(a?.season_number || 0) - Number(b?.season_number || 0)),
          };
        });
      } catch {
        // Ignore prefetch failures
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeSeason, cleanId, item?.progressive_seasons, queryClient, metadataLanguage]);

  const episodes = useMemo(() => activeSeason?.episodes || [], [activeSeason?.episodes]);
  const initialEpisodeId = useMemo(() => {
    if (nextEpisodeInfo?.seasonNumber === selectedSeasonNumber && nextEpisodeInfo?.episode?.id) {
      return nextEpisodeInfo.episode.id;
    }
    return episodes[0]?.id;
  }, [selectedSeasonNumber, nextEpisodeInfo, episodes]);

  const [selectedEpisodeId, setSelectedEpisodeId] = useState(initialEpisodeId);

  // Sync selected episode when season or episodes change
  useEffect(() => {
    if (episodes.length > 0) {
      const match = episodes.find(ep => ep.id === selectedEpisodeId);
      if (!match) {
        const nextUpEp = episodes.find(ep => ep.id === nextEpisodeInfo?.episode?.id);
        setSelectedEpisodeId(nextUpEp ? nextUpEp.id : episodes[0]?.id);
      }
    } else {
      setSelectedEpisodeId(null);
    }
  }, [selectedSeasonNumber, episodes, nextEpisodeInfo, selectedEpisodeId]);

  const activeEpisodeIndex = useMemo(() => {
    return episodes.findIndex(ep => ep.id === selectedEpisodeId);
  }, [episodes, selectedEpisodeId]);

  const activeEpisode = episodes[activeEpisodeIndex];

  // Carousel scroll refs (forwarded)
  const seasonsScrollRef = useRef(null);
  const episodesScrollRef = useRef(null);

  // Episode stepping
  const stepEpisode = (direction) => {
    if (episodes.length === 0) return;
    let nextIndex = activeEpisodeIndex + (direction === 'left' ? -1 : 1);
    if (nextIndex >= 0 && nextIndex < episodes.length) {
      setSelectedEpisodeId(episodes[nextIndex].id);
      // Auto-scroll pill into view
      setTimeout(() => {
        const activePill = episodesScrollRef.current?.querySelector('.bespoke-episode-pill.is-active');
        if (activePill && episodesScrollRef.current) {
          activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 50);
    }
  };

  const getPosterUrl = (path) => path ? resolveMediaImageUrl(path, 'poster') : '';
  const getOriginalPosterUrl = (path) => path ? resolveMediaImageUrl(path, 'originalPoster') : '';

  const isSeasonWatched = useMemo(() => {
    return episodes.length > 0 && episodes.every((ep) => ep.is_watched);
  }, [episodes]);

  const isSeasonPartiallyWatched = useMemo(() => {
    return episodes.length > 0 && episodes.some((ep) => ep.is_watched) && !isSeasonWatched;
  }, [episodes, isSeasonWatched]);

  const handleSeasonWatchedToggle = (e) => {
    e.stopPropagation();
    if (episodes.length === 0) return;
    const episodeIds = episodes.map((ep) => ep.id);
    bulkUpdateWatchedMutation.mutate({
      itemIds: episodeIds,
      isWatched: !isSeasonWatched,
      tvId: cleanId,
    });
  };

  if (seasonsCount === 0) return null;

  return (
    <div className="bespoke-seasons-section">
      {/* Unified Season & Episode Browser Card */}
      <div className="bespoke-unified-browser-card">
        
        {/* Row 1 Header: Seasons Horizontal Pills */}
        <Inline gap="sm" align="center" className="bespoke-browser-card__pills-header">
          <ScrollRow ref={seasonsScrollRef} containerClassName="bespoke-browser-card__pills-header-scroll-container" className="bespoke-seasons-pills no-scrollbar" showArrows={true} enableWheelScroll={true} arrowsLayout="column" size="sm">
            {seasonsList.map((season) => {
              const isActive = season.season_number === selectedSeasonNumber;
              const title = season.title || `Season ${season.season_number}`;

              return (
                <button
                  key={season.season_number}
                  type="button"
                  className={`bespoke-season-pill ${isActive ? 'is-active' : ''} ${
                    season.is_watched ? 'is-watched' : ''
                  }`}
                  onClick={() => setSelectedSeasonNumber(season.season_number)}
                >
                  <span>{title}</span>
                </button>
              );
            })}
          </ScrollRow>
        </Inline>

        {/* Row 1 Body: Season Details */}
        <Inline gap="md" className="bespoke-browser-card__body bespoke-browser-card__body--season">
          {/* Left Column: Large Season Poster */}
          <div className="bespoke-season-detail-card__poster-col">
            <PosterCard
              className="bespoke-season-detail-card__poster"
              imageUrl={getPosterUrl(activeSeason.poster_path)}
              onClick={getPosterUrl(activeSeason.poster_path) ? () => handleOpenLightbox(getOriginalPosterUrl(activeSeason.poster_path)) : undefined}
              icon={Clapperboard}
              disableHoverAnimation={true}
            />
          </div>

          {/* Right Column: Metadata & Overview */}
          <div className="bespoke-season-meta__content-col">
            <Inline justify="between" align="center" className="bespoke-season-meta__header">
              <div>
                <h3 className="bespoke-season-meta__title">
                  {activeSeason.title || `Season ${activeSeason.season_number}`}
                </h3>
                <Inline gap="sm" align="center" className="bespoke-season-meta__sub">
                  {activeSeason.air_date && (
                    <span className="bespoke-season-meta__item">
                      <Calendar size={12} />
                      {String(activeSeason.air_date).slice(0, 10)}
                    </span>
                  )}
                  {activeSeason.episode_count > 0 && (
                    <span className="bespoke-season-meta__item">
                      <Tv size={12} />
                      {episodesText}
                    </span>
                  )}
                </Inline>
              </div>

              <button
                type="button"
                className={`bespoke-season-watch-btn ${isSeasonWatched ? 'is-watched' : ''}`}
                onClick={handleSeasonWatchedToggle}
              >
                <Check size={14} />
                <span>
                  {isSeasonWatched
                    ? (t('library.details.watched') || 'Watched')
                    : isSeasonPartiallyWatched
                    ? `${t('library.details.markWatched') || 'Mark Watched'} (-)`
                    : (t('library.details.markWatched') || 'Mark Watched')}
                </span>
              </button>
            </Inline>

            {activeSeason.overview && (
              <p className="bespoke-season-meta__overview">{activeSeason.overview}</p>
            )}
          </div>
        </Inline>

        {/* Subtle Divider Line */}
        <div className="bespoke-browser-card__divider" />

        {/* Row 2 Header: Episode Pills */}
        {episodes.length > 0 && (
          <Inline gap="sm" align="center" className="bespoke-browser-card__pills-header">
            <ScrollRow ref={episodesScrollRef} containerClassName="bespoke-browser-card__pills-header-scroll-container" className="bespoke-episodes-pills no-scrollbar" showArrows={true} enableWheelScroll={true} arrowsLayout="column" size="sm">
              {episodes.map((episode) => {
                const isActive = episode.id === selectedEpisodeId;
                const formattedEpNum = formatEpisodeNumber(episode.episode_number);
                const isNextUp = nextEpisodeInfo?.episode?.id === episode.id;

                return (
                  <button
                    key={episode.id}
                    type="button"
                    className={`bespoke-episode-pill ${isActive ? 'is-active' : ''} ${
                      episode.is_watched ? 'is-watched' : ''
                    } ${!episode.path || episode.is_missing ? 'is-unowned' : ''} ${isNextUp ? 'is-next-up' : ''}`}
                    onClick={() => setSelectedEpisodeId(episode.id)}
                  >
                    {isNextUp && <span className="bespoke-episode-pill__next-dot" />}
                    <span>{formattedEpNum}</span>
                  </button>
                );
              })}
            </ScrollRow>
          </Inline>
        )}

        {/* Row 2 Body: Episode Details */}
        <BespokeEpisodeDetail
          activeEpisode={activeEpisode}
          activeEpisodeIndex={activeEpisodeIndex}
          episodes={episodes}
          stepEpisode={stepEpisode}
          handleOpenLightbox={handleOpenLightbox}
        />
      </div>

      <Lightbox
        imageUrl={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        t={t}
      />
    </div>
  );
}
