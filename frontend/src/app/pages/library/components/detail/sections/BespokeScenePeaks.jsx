import { Droplets, X } from '@/ui/icons';
import { useMediaDetailContext } from '../MediaDetailContext';
import { formatTime } from '../../../utils/detailUtils';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import './BespokeScenePeaks.css';

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

  return (
    <Card variant="glass-shaded" padding="none" className="bespoke-scene-peaks-card">
      <Inline justify="between" align="center" className="bespoke-scene-peaks-header">
        <Inline gap="sm" align="center" className="bespoke-scene-peaks-header-left">
          <Droplets size={12} className="bespoke-scene-peaks-title-icon" />
          <span className="bespoke-scene-peaks-title">
            {t('library.details.peaksTitle') || 'Peak Moments'} {LPAR}{peaks.length}{RPAR}
          </span>
        </Inline>
      </Inline>

      <div className="bespoke-scene-peaks-body">
        {peaks.length > 0 ? (
          <div className="bespoke-scene-peaks-list custom-scrollbar">
            {peaks.map((log, index) => {
              const hasPosition = log.video_position != null && log.video_position > 0;
              return (
                <Inline
                  justify="between"
                  align="center"
                  key={log.id || index}
                  className={`bespoke-scene-peaks-item ${hasPosition ? 'bespoke-scene-peaks-item--playable' : ''}`}
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
                    <Droplets size={11} className="bespoke-scene-peaks-item-icon" />
                    <span className="bespoke-scene-peaks-item-time">
                      {hasPosition ? formatTime(log.video_position) : (t('library.details.playSession') || 'Play Session')}
                    </span>
                  </Inline>

                  <Inline gap="sm" align="center" className="bespoke-scene-peaks-item-right">
                    <span className="bespoke-scene-peaks-item-date">
                      {new Date(log.watched_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      className="bespoke-scene-peaks-item-delete"
                      onClick={(e) => handleDeletePeak(e, log.id)}
                      disabled={deletePeakMutation.isPending}
                      title={t('library.details.deletePeakBtn') || 'Delete Peak'}
                    >
                      <X size={12} />
                    </button>
                  </Inline>
                </Inline>
              );
            })}
          </div>
        ) : (
          <span className="bespoke-scene-peaks-empty-text">
            {t('library.details.noPeaks') || 'No peak moments recorded yet.'}
          </span>
        )}
      </div>
    </Card>
  );
}
