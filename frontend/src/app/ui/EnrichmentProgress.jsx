import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from '@/ui/icons';
import api from '@/lib/api';
import './EnrichmentProgress.css';

export default function EnrichmentProgress() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const lastTotalRef = useRef(0);
  const pollRef = useRef(null);
  const doneTimerRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const data = await api.people.getEnrichmentStatus();
      setStatus(data);

      if (data.active) {
        lastTotalRef.current = data.total;
        setDismissed(false);
        setShowDone(false);
      } else if (lastTotalRef.current > 0) {
        // Batch just finished — show success briefly
        setShowDone(true);
        if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
        doneTimerRef.current = setTimeout(() => {
          setShowDone(false);
          lastTotalRef.current = 0;
        }, 4000);
      }
    } catch (err) {
      console.warn('[EnrichmentProgress] poll error:', err);
    }
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => {
      clearInterval(pollRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, [poll]);

  const isActive = status?.active && !dismissed;
  const pct = status?.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;

  if (showDone && !dismissed) {
    return (
      <div className="enrichment-progress enrichment-progress--done">
        <div className="enrichment-progress__header">
          <span className="enrichment-progress__title">
            ✓ {lastTotalRef.current} performers enriched
          </span>
          <button
            type="button"
            className="enrichment-progress__close"
            onClick={() => { setShowDone(false); setDismissed(true); }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  return (
    <div className="enrichment-progress">
      <div className="enrichment-progress__header">
        <span className="enrichment-progress__title">
          Enriching {status.current_name || '…'}
        </span>
        <span className="enrichment-progress__count">
          {status.completed}/{status.total}
        </span>
        <button
          type="button"
          className="enrichment-progress__close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className="enrichment-progress__track">
        <div
          className="enrichment-progress__bar"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
