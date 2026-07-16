import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X } from '@/ui/icons';
import api from '@/lib/api';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './ToastViewport.module.css';

function EnrichmentProgress() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const lastTotalRef = useRef(0);
  const pollRef = useRef(null);
  const doneTimerRef = useRef(null);
  
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const poll = useCallback(async () => {
    try {
      const data = await api.people.getEnrichmentStatus();
      setStatus(data);

      if (data.active) {
        lastTotalRef.current = data.total;
        setLastTotal(data.total);
        setDismissed(false);
        setShowDone(false);
      } else if (lastTotalRef.current > 0) {
        // Batch just finished — show success briefly
        setShowDone(true);
        if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
        doneTimerRef.current = setTimeout(() => {
          setShowDone(false);
          lastTotalRef.current = 0;
          setLastTotal(0);
        }, 4000);
      }
    } catch (err) {
      console.warn('[EnrichmentProgress] poll error:', err);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => {
      clearInterval(pollRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, [poll]);

  const isActive = status?.active && !dismissed;
  const pct = status?.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;
  const progressText = status ? `${status.completed}/${status.total}` : '';

  if (showDone && !dismissed) {
    const isNsfw = sessionMode === 'nsfw';
    const count = lastTotal;
    const successMsg = isNsfw
      ? (count === 1
        ? t('toast.enrichment.success_nsfw_one', { count, defaultValue: '✓ 1 adult star enriched' })
        : t('toast.enrichment.success_nsfw_other', { count, defaultValue: `✓ ${count} adult stars enriched` }))
      : (count === 1
        ? t('toast.enrichment.success_sfw_one', { count, defaultValue: '✓ 1 artist enriched' })
        : t('toast.enrichment.success_sfw_other', { count, defaultValue: `✓ ${count} artists enriched` }));

    return (
      <div className={`${styles.toast} ${styles['toast--success']}`}>
        <div className={styles.header}>
          <h4 className={styles.title}>
            {successMsg}
          </h4>
          <button
            type="button"
            className={styles.close}
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
    <div className={styles.toast}>
      <div className={styles.header}>
        <h4 className={`${styles.title} ${styles['enrichment-title']}`}>
          {t('toast.enrichment.active', { name: status.current_name || '…', defaultValue: `Enriching ${status.current_name || '…'}` })}
        </h4>
        <span className={styles['enrichment-count']}>
          {progressText}
        </span>
        <button
          type="button"
          className={styles.close}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className={styles.description}>
        <div className={styles['enrichment-track']}>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div className={styles['enrichment-bar']} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const { id, title, tone, duration } = toast;
  const timerRef = useRef(null);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      onRemove(id);
    }, remainingTimeRef.current);
  }, [id, onRemove]);

  const pauseTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingTimeRef.current -= Date.now() - startTimeRef.current;
    }
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [startTimer]);

  const toastClass = `${styles.toast} ${styles[`toast--${tone}`] || ''}`.trim();

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      className={toastClass}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
        <button
          type="button"
          className={styles.close}
          onClick={() => onRemove(id)}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    tone: PropTypes.string,
    duration: PropTypes.number.isRequired,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default function ToastViewport({ toasts, onRemoveToast }) {
  const isControlsWindow = new URLSearchParams(window.location.search).get('controls_only') === 'true';

  return (
    <div className={styles['toast-viewport']} aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemoveToast} />
      ))}
      {!isControlsWindow && <EnrichmentProgress />}
    </div>
  );
}

ToastViewport.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      tone: PropTypes.string,
      duration: PropTypes.number.isRequired,
    })
  ).isRequired,
  onRemoveToast: PropTypes.func.isRequired,
};
