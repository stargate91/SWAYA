import { Droplets, X } from '@/ui/icons';
import { useMediaDetailContext } from '../MediaDetailContext';
import { formatTime } from '../../../utils/detailUtils';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import IconButton from '@/ui/IconButton';
import Text from '@/ui/Text';
import styles from './BespokeScenePeaks.module.css';

const LPAR = '(';
const RPAR = ')';
const PLAY_VIDEO_FALLBACK = 'Play Video';

export default function BespokeScenePeaks() {
  const { state, mutations, t } = useMediaDetailContext();
  const { item, cleanId, effectiveId, isOwned } = state;
  const { deletePeakMutation, playMutation } = mutations;

  const peaks = item?.peaks_history || [];

  if (!isOwned && peaks.length === 0) {
    return null;
  }

  const handleDeletePeak = (e, logId) => {
    e.stopPropagation();
    if (deletePeakMutation.isPending) return;
    deletePeakMutation.mutate({ itemId: effectiveId, logId, tvId: cleanId });
  };

  const handlePlayMedia = () => {
    if (playMutation.isPending) return;
    playMutation.mutate(item.id);
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
      <Stack gap="sm" className="bespoke-scene-peaks-body">
        {peaks.length > 0 ? (
          <Stack gap="2xs" scrollable className={`${styles.list} custom-scrollbar`}>
            {peaks.map((log, index) => {
              const hasPosition = log.video_position != null && log.video_position > 0;
              return (
                <Inline
                  justify="between"
                  align="center"
                  key={log.id || index}
                  className={`${styles.item} ${hasPosition ? styles['item--playable'] : ''}`}
                  onClick={hasPosition ? handlePlayMedia : undefined}
                  role="button"
                  tabIndex={hasPosition ? 0 : -1}
                  onKeyDown={hasPosition ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePlayMedia();
                    }
                  } : undefined}
                  title={hasPosition ? (t('library.details.playVideo') || PLAY_VIDEO_FALLBACK) : undefined}
                >
                  <Inline gap="xs" align="center" className="bespoke-scene-peaks-item-left">
                    <Droplets size={11} color="var(--color-state-danger)" />
                    <Text variant="small" weight="semibold">
                      {hasPosition ? formatTime(log.video_position) : (t('library.details.playSession') || 'Play Session')}
                    </Text>
                  </Inline>

                  <Inline gap="sm" align="center" className="bespoke-scene-peaks-item-right">
                    <Text color="muted" className="u-font-2xs">
                      {new Date(log.watched_at).toLocaleDateString()}
                    </Text>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeletePeak(e, log.id)}
                      disabled={deletePeakMutation.isPending}
                      title={t('library.details.deletePeakBtn') || 'Delete Peak'}
                      className={styles['delete-btn']}
                    >
                      <X size={14} />
                    </IconButton>
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

