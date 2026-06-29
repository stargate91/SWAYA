import { useState, useRef, useEffect } from 'react';
import { Flame, X, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMediaDetailContext } from './MediaDetailContext';
import Pill from '@/ui/Pill';
import { formatTime } from '../../utils/detailUtils';
import './BespokeScenePeaks.css';

const LPAR = '(';
const RPAR = ')';

function HorizontalPillList({ children }) {
  const containerRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 1);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();

    window.addEventListener('resize', checkScroll);
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, []);

  const handleScroll = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = 150;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="bespoke-scene-peaks-scroller-wrapper">
      {showLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="bespoke-scene-peaks-scroller-btn bespoke-scene-peaks-scroller-btn--left"
        >
          <ChevronLeft size={12} />
        </button>
      )}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="bespoke-scene-peaks-row bespoke-scene-peaks-row--nowrap"
      >
        {children}
      </div>
      {showRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="bespoke-scene-peaks-scroller-btn bespoke-scene-peaks-scroller-btn--right"
        >
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

export default function BespokeScenePeaks() {
  const { state, mutations, t } = useMediaDetailContext();
  const { item } = state;
  const { deletePeakMutation, playMutation } = mutations;

  const peaks = item?.peaks_history || [];

  const handleDeletePeak = (e, logId) => {
    e.stopPropagation();
    if (deletePeakMutation.isPending) return;
    deletePeakMutation.mutate({ itemId: item.id, logId });
  };

  const handlePlayMedia = () => {
    if (playMutation.isPending) return;
    playMutation.mutate(item.id);
  };

  return (
    <div className="bespoke-scene-peaks-card">
      <div className="bespoke-scene-peaks-header">
        <div className="bespoke-scene-peaks-header-left">
          <Flame size={12} className="bespoke-scene-peaks-title-icon" />
          <span className="bespoke-scene-peaks-title">
            {t('library.details.peaksTitle') || 'Peak Moments'} {LPAR}{peaks.length}{RPAR}
          </span>
        </div>
      </div>

      <div className="bespoke-scene-peaks-body">
        {peaks.length > 0 ? (
          <HorizontalPillList>
            {peaks.map((log, index) => (
              <div
                key={log.id || index}
                className="bespoke-scene-peaks-pill"
                onClick={handlePlayMedia}
                title="Play Video"
              >
                <Flame size={10} className="bespoke-scene-peaks-pill-icon" />
                <span className="bespoke-scene-peaks-pill-time">
                  {log.video_position != null ? formatTime(log.video_position) : '—'}
                </span>
                <button
                  type="button"
                  className="bespoke-scene-peaks-pill-delete"
                  onClick={(e) => handleDeletePeak(e, log.id)}
                  disabled={deletePeakMutation.isPending}
                  title={t('library.details.deletePeakBtn') || 'Delete Peak'}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </HorizontalPillList>
        ) : (
          <span className="bespoke-scene-peaks-empty-text">
            {t('library.details.noPeaks') || 'No peak moments recorded yet.'}
          </span>
        )}
      </div>
    </div>
  );
}
