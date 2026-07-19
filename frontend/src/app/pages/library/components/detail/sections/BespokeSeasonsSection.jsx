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
import Card from '@/ui/Card';
import Divider from '@/ui/Divider';
import Stack from '@/ui/Stack';
import Button from '@/ui/Button';

const BULLET_CHAR = '\u2022';
import Text from '@/ui/Text';
import styles from './BespokeSeasonsSection.module.css';

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
        const activePill = episodesScrollRef.current?.querySelector(`.${styles.pill}.${styles['is-active']}`);
        if (activePill && episodesScrollRef.current) {
          activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 50);
    }
  };

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
    <Stack gap="md">
      {/* Unified Season & Episode Browser Card */}
      <Card variant="glass-shaded" padding="none">
        
        {/* Row 1 Header: Seasons Horizontal Pills */}
        <Inline gap="sm" align="center" className={styles['pills-header']}>
          <ScrollRow ref={seasonsScrollRef} className="no-scrollbar u-flex-1" showArrows={true} enableWheelScroll={true} size="sm">
            {seasonsList.map((season) => {
              const isActive = season.season_number === selectedSeasonNumber;
              const title = season.title || `Season ${season.season_number}`;

              return (
                <button
                  key={season.season_number}
                  type="button"
                  className={`${styles.pill} ${isActive ? styles['is-active'] : ''} ${
                    season.is_watched ? styles['is-watched'] : ''
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
        <div className={styles.body}>
          {/* Left Column: Large Season Poster */}
          <PosterCard
            size="6.5rem"
            fillHeight={true}
            imageUrl={activeSeason.poster_path ? resolveMediaImageUrl(activeSeason.poster_path, 'poster') : undefined}
            altText={activeSeason.title || `Season ${activeSeason.season_number}`}
            onClick={activeSeason.poster_path ? () => handleOpenLightbox(resolveMediaImageUrl(activeSeason.poster_path, 'originalPoster')) : undefined}
            icon={Clapperboard}
            disableHoverAnimation={true}
          />

          {/* Right Column: Metadata & Overview */}
          <Stack gap="xs" scrollable className="u-min-w-0 u-pr-sm">
            <Inline justify="between" align="center">
              <div>
                <h3 className={styles.title}>
                  {activeSeason.title || `Season ${activeSeason.season_number}`}
                </h3>
                <Inline gap="xs" align="center">
                  {activeSeason.air_date && (
                    <Inline gap="3xs" align="center" className={styles['item-text']}>
                      <Calendar size={12} />
                      <span>{String(activeSeason.air_date).slice(0, 10)}</span>
                    </Inline>
                  )}
                  {activeSeason.air_date && activeSeason.episode_count > 0 && (
                    <span className={styles['bullet-separator']}>{BULLET_CHAR}</span>
                  )}
                  {activeSeason.episode_count > 0 && (
                    <Inline gap="3xs" align="center" className={styles['item-text']}>
                      <Tv size={12} />
                      <span>{episodesText}</span>
                    </Inline>
                  )}
                </Inline>
              </div>

              <Button
                variant={isSeasonWatched ? 'success' : 'secondary-neutral'}
                size="sm"
                leftIcon={<Check size={14} />}
                onClick={handleSeasonWatchedToggle}
              >
                {isSeasonWatched
                  ? (t('library.details.watched') || 'Watched')
                  : isSeasonPartiallyWatched
                  ? `${t('library.details.markWatched') || 'Mark Watched'} (-)`
                  : (t('library.details.markWatched') || 'Mark Watched')}
              </Button>
            </Inline>

            {activeSeason.overview && (
              <Text as="p" variant="small" color="secondary" clamp={3}>
                {activeSeason.overview}
              </Text>
            )}
          </Stack>
        </div>

        {/* Subtle Divider Line */}
        <Divider />

        {/* Row 2 Header: Episode Pills */}
        {episodes.length > 0 && (
          <Inline gap="sm" align="center" className={styles['pills-header']}>
            <ScrollRow ref={episodesScrollRef} className="no-scrollbar u-flex-1" showArrows={true} enableWheelScroll={true} size="sm">
              {episodes.map((episode) => {
                const isActive = episode.id === selectedEpisodeId;
                const formattedEpNum = formatEpisodeNumber(episode.episode_number);
                const isNextUp = nextEpisodeInfo?.episode?.id === episode.id;

                return (
                  <button
                    key={episode.id}
                    type="button"
                    className={`${styles.pill} ${isActive ? styles['is-active'] : ''} ${
                      episode.is_watched ? styles['is-watched'] : ''
                    } ${!episode.path || episode.is_missing ? styles['is-unowned'] : ''} ${isNextUp ? styles['is-next-up'] : ''}`}
                    onClick={() => setSelectedEpisodeId(episode.id)}
                  >
                    {isNextUp && <span className={styles['next-dot']} />}
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
      </Card>

      <Lightbox
        imageUrl={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        t={t}
      />
    </Stack>
  );
}

