import { Minus, Square, X, AlertTriangle, Flame, ArrowLeft, ArrowRight } from '@/ui/icons';
import UtilityButton from '../ui/UtilityButton';
import ProgressBar from '../ui/ProgressBar';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip';
import api from '../lib/api';
import { useUi } from '@/providers/UiProvider';
import { useTranslation } from '../providers/LanguageContext';
import useWindowProgress from './useWindowProgress';
import useWindowControls from './useWindowControls';
import { useSettingsQuery } from '../queries/settingsQueries';
import { useLibraryModeStore } from '../stores/useLibraryModeStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationStore } from '../stores/useNavigationStore';
import GlobalSearch from './GlobalSearch';
import styles from './WindowTitlebar.module.css';
import modalStyles from '../ui/Modal.module.css';
import Inline from '../ui/Inline';

const BRAND_NAME = 'SWAYA';

export default function WindowTitlebar() {
  const { data: settings } = useSettingsQuery();
  const { sessionMode, toggleSessionMode } = useLibraryModeStore();
  const { hasProgress, scanProgress, imageProgress, hydrateProgress, syncProgress } = useWindowProgress();
  const { openModal, closeModal, toast } = useUi();
  const { t } = useTranslation();
  const { minimize, toggleMaximize, close, resizeToMinimum } = useWindowControls();
  const navigate = useNavigate();
  const location = useLocation();

  const { historyStack, currentIndex, goBack, goForward } = useNavigationStore();
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < historyStack.length - 1;

  const handleAbort = () => {
    openModal({
      title: t('progress.abortConfirm.title'),
      description: t('progress.abortConfirm.description'),
      icon: AlertTriangle,
      variant: 'danger',
      content: (
        <div className={modalStyles['body-text']}>
          {t('progress.abortConfirm.body')}
        </div>
      ),
      footer: (
        <>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('progress.abortConfirm.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              closeModal();
              try {
                await api.task.stop();
              } catch (err) {
                console.error('Failed to stop background task:', err);
                toast(err.message || t('organizer.toasts.abortTaskFailed'), 'danger');
              }
            }}
          >
            {t('progress.abortConfirm.confirm')}
          </Button>
        </>
      ),
    });
  };

  const handleToggleClick = () => {
    const shell = document.querySelector('.shell');
    if (shell) {
      shell.classList.add('is-transitioning');
    }

    setTimeout(() => {
      const nextMode = sessionMode === 'nsfw' ? 'sfw' : 'nsfw';
      toggleSessionMode();

      if (nextMode === 'sfw') {
        const path = location.pathname;
        if (
          path.startsWith('/library/movie/') ||
          path.startsWith('/library/tv/') ||
          path.startsWith('/library/scene/') ||
          path.startsWith('/library/people/')
        ) {
          navigate('/dashboard');
        }
      }

      setTimeout(() => {
        if (shell) {
          shell.classList.remove('is-transitioning');
        }
      }, 150);
    }, 200);
  };

  return (
    <header className={styles.titlebar}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={styles['drag-region']}
        onDoubleClick={resizeToMinimum}
      >
        <span className={styles['brand-text']}>{BRAND_NAME}</span>
      </div>

      <Inline gap="sm" align="center" className={styles['nav-buttons']}>
        <Tooltip content={t('common.back')} side="bottom">
          <button
            type="button"
            className={styles['nav-btn']}
            disabled={!canGoBack}
            onClick={() => goBack(navigate)}
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
        </Tooltip>
        <Tooltip content={t('common.forward')} side="bottom">
          <button
            type="button"
            className={styles['nav-btn']}
            disabled={!canGoForward}
            onClick={() => goForward(navigate)}
            aria-label="Forward"
          >
            <ArrowRight size={16} />
          </button>
        </Tooltip>
      </Inline>

      <div className={`${styles['center-container']} ${hasProgress ? styles['has-progress'] : ''}`}>
        <div className={`${styles['search-wrapper']} ${hasProgress ? styles['has-progress'] : ''}`}>
          <GlobalSearch />
        </div>
        {hasProgress && (
          <div className={styles['progress-wrapper']}>
            {scanProgress ? <ProgressBar {...scanProgress} onAbort={handleAbort} /> : null}
            {imageProgress ? <ProgressBar {...imageProgress} variant="sub" /> : null}
            {hydrateProgress ? <ProgressBar {...hydrateProgress} variant="sub" /> : null}
            {syncProgress ? <ProgressBar {...syncProgress} variant="sub" /> : null}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {settings?.include_adult && (
          <Tooltip
            content={sessionMode === 'nsfw' ? (t('common.sfwMode') || 'SFW Mode') : (t('common.nsfwMode') || 'NSFW Mode')}
            side="bottom"
            triggerClassName={styles['tooltip-trigger']}
          >
            <UtilityButton
              type="button"
              className={`${styles.button} ${styles['adult-toggle']} ${sessionMode === 'nsfw' ? styles['is-nsfw'] : ''}`.trim()}
              tabIndex={-1}
              aria-label="Toggle Adult Mode"
              onClick={handleToggleClick}
            >
              <Flame size={18} fill={sessionMode === 'nsfw' ? 'currentColor' : 'none'} />
            </UtilityButton>
          </Tooltip>
        )}
        <UtilityButton
          type="button"
          className={styles.button}
          size="titlebar"
          tabIndex={-1}
          aria-label={t('titlebar.minimizeWindow')}
          onClick={minimize}
        >
          <Minus size={16} />
        </UtilityButton>
        <UtilityButton
          type="button"
          className={styles.button}
          size="titlebar"
          tabIndex={-1}
          aria-label={t('titlebar.maximizeWindow')}
          onClick={toggleMaximize}
        >
          <Square size={14} />
        </UtilityButton>
        <UtilityButton
          type="button"
          className={`${styles.button} ${styles['close-btn']}`}
          size="titlebar"
          danger
          tabIndex={-1}
          aria-label={t('titlebar.closeWindow')}
          onClick={close}
        >
          <X size={16} />
        </UtilityButton>
      </div>
    </header>
  );
}
