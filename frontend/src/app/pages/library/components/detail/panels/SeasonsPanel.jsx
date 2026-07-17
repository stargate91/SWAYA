import { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Check, Eye, Play, Clapperboard, Calendar, Tv, Star, Droplets, Trash2 } from '@/ui/icons';
import IconButton from '@/ui/IconButton';
import Pill from '@/ui/Pill';
import PosterCard from '@/ui/PosterCard';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import ScrollRow from '@/ui/ScrollRow';
import Text from '@/ui/Text';
import Button from '@/ui/Button';
import Alert from '@/ui/Alert';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { formatEpisodeNumber, formatTime } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import { useTranslation as useLangTranslation } from '@/providers/LanguageContext';
import api from '@/lib/api';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';

const LPAR = '(';
const RPAR = ')';
const EPISODES_BATCH_SIZE = 20;

export default function SeasonsPanel() {
  const { state, mutations, t } = useMediaDetailContext();
  const { locale } = useLangTranslation();
  const metadataLanguage = locale === 'en' ? 'en-US' : locale;
  const { item, cleanId, nextEpisodeInfo } = state;
  const { updateStatusMutation, playMutation, bulkUpdateWatchedMutation, addPeakMutation, deletePeakMutation } = mutations;
  const queryClient = useQueryClient();

  const seasonsList = useMemo(() => item.seasons || [], [item.seasons]);
  const seasonsCount = seasonsList.length;
  const initialSeasonNumber = nextEpisodeInfo?.seasonNumber ?? seasonsList[0]?.season_number ?? 1;
  const initialExpandedEpisodes = nextEpisodeInfo?.episode?.id
    ? { [nextEpisodeInfo.episode.id]: true }
    : {};
  const initialTargetSeason = seasonsList.find((season) => season.season_number === initialSeasonNumber);
  const initialTargetEpisodeIndex = nextEpisodeInfo?.episode?.id
    ? initialTargetSeason?.episodes?.findIndex((episode) => episode.id === nextEpisodeInfo.episode.id) ?? -1
    : -1;
  const initialVisibleEpisodesCount = initialTargetEpisodeIndex >= 0
    ? Math.max(EPISODES_BATCH_SIZE, initialTargetEpisodeIndex + 1)
    : EPISODES_BATCH_SIZE;

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(initialSeasonNumber);
  const [expandedEpisodes, setExpandedEpisodes] = useState(initialExpandedEpisodes);
  const [visibleEpisodesCount, setVisibleEpisodesCount] = useState(initialVisibleEpisodesCount);
  const [prevSelectedSeasonNumber, setPrevSelectedSeasonNumber] = useState(selectedSeasonNumber);

  const scrollContainerRef = useRef(null);

  if (selectedSeasonNumber !== prevSelectedSeasonNumber) {
    setPrevSelectedSeasonNumber(selectedSeasonNumber);

    const targetSeason = seasonsList.find((season) => season.season_number === selectedSeasonNumber);
    const targetEpisodeIndex = selectedSeasonNumber === nextEpisodeInfo?.seasonNumber
      ? targetSeason?.episodes?.findIndex((episode) => episode.id === nextEpisodeInfo?.episode?.id) ?? -1
      : -1;
    setVisibleEpisodesCount(
      targetEpisodeIndex >= 0
        ? Math.max(EPISODES_BATCH_SIZE, targetEpisodeIndex + 1)
        : EPISODES_BATCH_SIZE
    );
  }

  // Automatically scroll the selected season card into view without affecting outer scroll containers
  useEffect(() => {
    const activeBtn = scrollContainerRef.current?.querySelector('.season-poster-card.is-active');
    const container = scrollContainerRef.current;
    if (activeBtn && container) {
      // Center the active card inside the carousel container
      const scrollLeftOffset = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
      container.scrollTo({
        left: scrollLeftOffset,
        behavior: 'smooth',
      });
    }
  }, [selectedSeasonNumber]);

  const getPosterUrl = (path) => {
    if (!path) return '';
    return resolveMediaImageUrl(path, 'poster');
  };

  const getStillUrl = (path) => {
    if (!path) return '';
    return resolveMediaImageUrl(path, 'still');
  };

  const selectedSeasonIndex = seasonsList.findIndex((s) => s.season_number === selectedSeasonNumber);

  const toggleEpisodeOverview = (episodeId) => {
    setExpandedEpisodes((prev) => ({
      ...prev,
      [episodeId]: !prev[episodeId],
    }));
  };

  // Find active season
  const activeSeason = seasonsList.find((s) => s.season_number === selectedSeasonNumber) || seasonsList[0];

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
        // Ignore season prefetch failures here; the shell stays usable.
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeSeason, cleanId, item?.in_library, item?.progressive_seasons, queryClient, metadataLanguage]);

  const totalEpisodesCount = activeSeason?.episode_count ?? 0;

  const localEpisodesCount = activeSeason?.local_episode_count ?? 0;

  const isSeasonWatched = activeSeason?.episodes
    ? activeSeason.episodes.length > 0 && activeSeason.episodes.every((ep) => ep.is_watched)
    : false;

  const isSeasonPartiallyWatched = activeSeason?.episodes
    ? activeSeason.episodes.length > 0 && activeSeason.episodes.some((ep) => ep.is_watched) && !isSeasonWatched
    : false;

  const isSeasonWatchedWithDate = activeSeason?.episodes
    ? activeSeason.episodes.length > 0 && activeSeason.episodes.every((ep) => ep.last_watched_at)
    : false;

  const visibleEpisodes = activeSeason?.episodes?.slice(0, visibleEpisodesCount) || [];
  const hasMoreEpisodes = visibleEpisodes.length < (activeSeason?.episodes?.length || 0);

  const loadMoreTriggerRef = useInfiniteScroll({
    onIntersect: () => {
      setVisibleEpisodesCount((prev) => (
        Math.min(prev + EPISODES_BATCH_SIZE, activeSeason?.episodes?.length || prev)
      ));
    },
    enabled: hasMoreEpisodes,
    root: '.media-detail-page__side-panel-content',
    rootMargin: '0px 0px 960px 0px',
    threshold: 0.01,
  });

  if (!activeSeason) {
    return (
      <Card variant="transparent" padding="md">
        <Text variant="body" color="muted" italic align="center">
          {t('library.details.noSeasonsFound') || 'No seasons found.'}
        </Text>
      </Card>
    );
  }

  const handleSeasonWatchedToggle = (e) => {
    e.stopPropagation();
    if (!activeSeason || !activeSeason.episodes || activeSeason.episodes.length === 0) return;
    const episodeIds = activeSeason.episodes.map((ep) => ep.id);
    bulkUpdateWatchedMutation.mutate({
      itemIds: episodeIds,
      isWatched: !isSeasonWatched,
      tvId: cleanId,
    });
  };

  return (
    <Stack gap="lg">
      {/* Title */}
      <Inline justify="between" align="center">
        <Text as="h4" variant="title">
          {t('library.details.seasons') || 'Seasons'}
        </Text>
      </Inline>

      {/* Seasons Posters Scroll Row */}
      <ScrollRow showArrows={true} enableWheelScroll={true} ref={scrollContainerRef}>
        {seasonsList.map((season) => {
          const isActive = season.season_number === selectedSeasonNumber;
          const posterUrl = getPosterUrl(season.poster_path);
          const title = season.title || `Season ${season.season_number}`;

          return (
            <PosterCard
              key={season.season_number}
              active={isActive}
              imageUrl={posterUrl}
              title={title}
              onClick={() => setSelectedSeasonNumber(season.season_number)}
              onMouseDown={(e) => e.preventDefault()}
              icon={Clapperboard}
              disableHoverAnimation={true}
              style={{ width: '5.375rem', flexShrink: 0 }}
            />
          );
        })}
      </ScrollRow>

      {/* Selected Season Header / Details */}
      <Card variant="soft" padding="md">
        <Stack gap="sm">
          <Inline justify="between" gap="md" align="center">
            <div>
              <Text as="h3" variant="title">
                {activeSeason.title || `Season ${activeSeason.season_number}`}
              </Text>
              <Inline gap="lg" align="center">
                {activeSeason.air_date && (
                  <Text variant="small" color="muted">
                    <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {String(activeSeason.air_date).slice(0, 10)}
                  </Text>
                )}
                {totalEpisodesCount > 0 && (
                  <Text variant="small" color="muted">
                    <Tv size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {localEpisodesCount < totalEpisodesCount
                      ? `Available ${localEpisodesCount}/${totalEpisodesCount}`
                      : `${totalEpisodesCount} ${t('library.details.episodes') || 'Episodes'}`}
                  </Text>
                )}
              </Inline>
            </div>

            {!isSeasonWatchedWithDate && (
              <Button
                variant={isSeasonWatched ? 'secondary-neutral' : 'primary'}
                onClick={handleSeasonWatchedToggle}
                icon={<Check size={16} />}
              >
                {isSeasonWatched
                  ? (t('library.details.watched') || 'Watched')
                  : isSeasonPartiallyWatched
                  ? `${t('library.details.markWatched') || 'Mark Watched'} (-)`
                  : (t('library.details.markWatched') || 'Mark Watched')}
              </Button>
            )}
          </Inline>

          {activeSeason.overview && (
            <Text variant="body" color="secondary">
              {activeSeason.overview}
            </Text>
          )}
        </Stack>
      </Card>

      {/* Episode Cards List */}
      <Stack gap="md">
        {visibleEpisodes.map((episode) => {
          const isExpanded = !!expandedEpisodes[episode.id];
          const stillUrl = getStillUrl(episode.still_path);
          const formattedEpNum = formatEpisodeNumber(episode.episode_number);
          const episodeText = `${formattedEpNum.padStart(2, '0')}. ${episode.title || `Episode ${episode.episode_number}`}`;
          const episodeTmdbRating = episode.vote_average ?? episode.rating_tmdb ?? episode.rating;

          const durationMins = episode.runtime
            ? `${episode.runtime}m`
            : episode.technical?.duration
            ? `${Math.round(episode.technical.duration / 60)}m`
            : '';

          const metaItems = [
            episode.air_date ? String(episode.air_date).slice(0, 10) : null,
            durationMins || null,
            episode.technical?.resolution || null,
            episode.technical?.video_codec || null,
            episode.technical?.hdr_type || null,
          ].filter(Boolean);

          return (
            <Card
              key={episode.id}
              variant={episode.is_watched ? 'soft' : 'default'}
              padding="md"
              style={{
                cursor: 'pointer',
                opacity: (!episode.path || episode.is_missing) ? 0.6 : 1,
              }}
              onClick={() => toggleEpisodeOverview(episode.id)}
            >
              <Inline gap="md" align="start" fullWidth>
                {/* Still Image */}
                <div style={{ width: '120px', flexShrink: 0, position: 'relative', aspectRatio: '16/9', borderRadius: '4px', overflow: 'hidden', background: 'var(--color-surface-glass)' }}>
                  {stillUrl ? (
                    <img src={stillUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-glass-strong)' }}>
                      <Clapperboard size={24} />
                    </div>
                  )}
                  {episode.is_watched && (
                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--color-state-success)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} />
                    </div>
                  )}
                  {episode.path && !episode.is_missing && (
                    <IconButton
                      variant="play-overlay"
                      onClick={(e) => {
                        e.stopPropagation();
                        playMutation.mutate(episode.id);
                      }}
                      title={t('library.details.playEpisode') || 'Play Episode'}
                      style={{ position: 'absolute', inset: 0, margin: 'auto' }}
                    >
                      <Play size={12} fill="currentColor" />
                    </IconButton>
                  )}
                </div>

                {/* Details */}
                <Stack gap="xs" flex={1}>
                  <Text as="h4" variant="body" weight="bold">
                    {episodeText}
                  </Text>
                  
                  {(metaItems.length > 0 || episode.is_multi_episode || (episodeTmdbRating !== undefined && episodeTmdbRating !== null && episodeTmdbRating !== '' && Number(episodeTmdbRating) > 0)) && (
                    <Inline gap="sm" align="center">
                      {episode.is_multi_episode && (
                        <Pill variant="neutral">
                          {t('library.details.sharedFile') || 'Shared File'}
                        </Pill>
                      )}
                      {metaItems.map((meta, idx) => (
                        <Text key={idx} variant="small" color="muted">
                          {meta}
                        </Text>
                      ))}
                      {(episodeTmdbRating !== undefined && episodeTmdbRating !== null && episodeTmdbRating !== '' && Number(episodeTmdbRating) > 0) && (
                        <Pill variant="tmdb">
                          <Star size={10} fill="currentColor" strokeWidth={1.8} />
                          {isNaN(parseFloat(episodeTmdbRating))
                            ? episodeTmdbRating
                            : parseFloat(episodeTmdbRating).toFixed(1)}
                        </Pill>
                      )}
                    </Inline>
                  )}

                  {episode.overview && (
                    <Text
                      variant="small"
                      color="secondary"
                      truncate={!isExpanded}
                      style={!isExpanded ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' } : undefined}
                    >
                      {episode.overview}
                    </Text>
                  )}

                  {item.is_adult && episode.peaks_history && episode.peaks_history.length > 0 && isExpanded && (
                    <Card variant="transparent" padding="none">
                      <Stack gap="xs" onClick={(e) => e.stopPropagation()}>
                        <Inline gap="sm" align="center">
                          <Droplets size={12} color="var(--color-state-danger)" />
                          <Text variant="small" weight="bold">
                            {t('library.details.peaksTitle') || 'Peak Moments'} {LPAR}{episode.peaks_history.length}{RPAR}
                          </Text>
                        </Inline>
                        <Stack gap="xs">
                          {episode.peaks_history.map((log) => (
                            <Card key={log.id} variant="soft" padding="md">
                              <Inline justify="between" align="center">
                                <Text variant="small" color="secondary">
                                  {new Date(log.watched_at).toLocaleString()}
                                </Text>
                                <Inline gap="sm" align="center">
                                  {log.video_position != null && (
                                    <Pill variant="default">
                                      {formatTime(log.video_position)}
                                    </Pill>
                                  )}
                                  <IconButton
                                    variant="flat-danger"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePeakMutation.mutate({ itemId: episode.id, logId: log.id });
                                    }}
                                    disabled={deletePeakMutation.isPending}
                                    title={t('library.details.deletePeakBtn') || 'Delete Peak'}
                                  >
                                    <Trash2 size={12} />
                                  </IconButton>
                                </Inline>
                              </Inline>
                            </Card>
                          ))}
                        </Stack>
                      </Stack>
                    </Card>
                  )}
                </Stack>

                {/* Actions */}
                <Inline gap="sm" align="center" onClick={(e) => e.stopPropagation()}>
                  {isExpanded && (
                    <>
                      {item.is_adult && episode.path && !episode.is_missing && (
                        <IconButton
                          variant="secondary-neutral"
                          onClick={(e) => {
                            e.stopPropagation();
                            addPeakMutation.mutate(episode.id);
                          }}
                          disabled={addPeakMutation.isPending}
                          title={t('library.details.addPeak') || 'Add Peak'}
                        >
                          <Droplets size={16} />
                        </IconButton>
                      )}

                      <IconButton
                        variant={episode.is_watched ? 'success' : 'secondary-neutral'}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            itemId: episode.id,
                            tvId: cleanId,
                            payload: {
                              is_watched: !episode.is_watched,
                              media_type: 'episode',
                            },
                          })
                        }
                        title={episode.is_watched ? 'Mark unwatched' : 'Mark watched'}
                      >
                        {episode.is_watched ? <Check size={16} /> : <Eye size={16} />}
                      </IconButton>
                    </>
                  )}

                  <IconButton
                    variant="secondary-neutral"
                    onClick={() => toggleEpisodeOverview(episode.id)}
                    title="Toggle details"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform var(--motion-slow)' }}
                  >
                    <ChevronDown size={16} />
                  </IconButton>
                </Inline>
              </Inline>
            </Card>
          );
        })}

        {(!activeSeason.episodes || activeSeason.episodes.length === 0) && (
          <Card variant="transparent" padding="md">
            <Text variant="body" color="muted" italic align="center">
              {item?.progressive_seasons && activeSeason.episodes_complete === false
                ? (t('library.details.loadingSeason') || 'Loading season...')
                : (t('library.details.noEpisodesFound') || 'No episodes found.')}
            </Text>
          </Card>
        )}

        {hasMoreEpisodes && (
          <div ref={loadMoreTriggerRef} aria-hidden="true" />
        )}
      </Stack>
    </Stack>
  );
}
