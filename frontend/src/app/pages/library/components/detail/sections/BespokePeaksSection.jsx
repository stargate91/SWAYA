import { useMemo } from 'react';
import { Droplets, X } from '@/ui/icons';
import { useMediaDetailContext } from '../MediaDetailContext';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import IconButton from '@/ui/IconButton';
import Tooltip from '@/ui/Tooltip';
import { formatTime } from '../../../utils/detailUtils';
import styles from './BespokePeaksSection.module.css';

const LPAR = '(';
const RPAR = ')';

export default function BespokePeaksSection() {
  const { state, mutations, t } = useMediaDetailContext();
  const { item, cleanId, effectiveId, isOwned, isMovie, isScene } = state;
  const { deletePeakMutation, playMutation } = mutations;

  const peaks = useMemo(() => {
    if (!item) return [];
    if (isMovie || isScene) {
      return item.peaks_history || [];
    }

    const tvPeaks = [];
    if (item.seasons) {
      item.seasons.forEach((season) => {
        if (season.episodes) {
          season.episodes.forEach((episode) => {
            if (episode.peaks_history) {
              episode.peaks_history.forEach((peak) => {
                tvPeaks.push({
                  ...peak,
                  season_number: season.season_number,
                  episode_number: episode.episode_number,
                  episodeId: episode.id,
                });
              });
            }
          });
        }
      });
    }
    return tvPeaks.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
  }, [item, isMovie, isScene]);

  if (!isOwned && peaks.length === 0) {
    return null;
  }

  const handleDeletePeak = (e, log) => {
    e.stopPropagation();
    if (deletePeakMutation.isPending) return;
    const targetItemId = log.episodeId || effectiveId;
    deletePeakMutation.mutate({ itemId: targetItemId, logId: log.id, tvId: cleanId });
  };

  const handlePlayMedia = (log) => {
    if (playMutation.isPending) return;
    const targetId = log?.episodeId || item.id;
    playMutation.mutate(targetId);
  };

  const titleContent = (
    <Inline gap="sm" align="center">
      <Droplets size={12} color="var(--color-state-danger)" />
      <span>
        {t('library.details.peaksTitle') || 'Peak Moments'} {LPAR}{peaks.length}{RPAR}
      </span>
    </Inline>
  );

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={titleContent}
    >
      <Stack gap="sm" className="bespoke-peaks-section-body">
        {peaks.length > 0 ? (
          <Stack
            gap="2xs"
            scrollable
            className={`${styles.list} custom-scrollbar`}
          >
            {peaks.map((log, index) => {
              const hasPosition = log.video_position != null && log.video_position > 0;
              const isPlayable = hasPosition;

              return (
                <Inline
                  justify="between"
                  align="center"
                  key={log.id || index}
                  className={`${styles.item} ${isPlayable ? styles['item--playable'] : ''}`}
                  onClick={isPlayable ? () => handlePlayMedia(log) : undefined}
                  role={isPlayable ? 'button' : undefined}
                  tabIndex={isPlayable ? 0 : undefined}
                  onKeyDown={isPlayable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePlayMedia(log);
                    }
                  } : undefined}
                  title={isPlayable ? (t('library.details.playVideo') || 'Play Video') : undefined}
                >
                  <Inline gap="xs" align="center">
                    <Droplets size={11} color="var(--color-state-danger)" />
                    <Text variant="small" weight="semibold">
                      {log.season_number != null && log.episode_number != null && (() => {
                        const epLabel = `S${log.season_number}E${String(log.episode_number).padStart(2, '0')} `;
                        return (
                          <span className="u-text-muted">
                            {epLabel}
                          </span>
                        );
                      })()}
                      {hasPosition ? formatTime(log.video_position) : (t('library.details.playSession') || 'Play Session')}
                    </Text>
                  </Inline>

                  <Inline gap="sm" align="center">
                    <Text color="muted" className="u-font-2xs">
                      {new Date(log.watched_at).toLocaleDateString()}
                    </Text>
                    <Tooltip content={t('library.details.deletePeakBtn') || 'Delete Peak'} side="top">
                      <IconButton
                        variant="ghost"
                        size="xs"
                        onClick={(e) => handleDeletePeak(e, log)}
                        disabled={deletePeakMutation.isPending}
                        title={null}
                        className={styles['delete-btn']}
                      >
                        <X size={14} />
                      </IconButton>
                    </Tooltip>
                  </Inline>
                </Inline>
              );
            })}
          </Stack>
        ) : (
          <Text variant="small" color="muted" className="u-font-italic">
            {t('library.details.noPeaks') || 'No peak moments recorded yet.'}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
