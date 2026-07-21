import { useState } from 'react';
import { RotateCcw, Calendar, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from '@/ui/icons';
import Button from '@/ui/Button';
import Tooltip from '@/ui/Tooltip';
import Spinner from '@/ui/Spinner';
import { useTranslation } from '@/providers/LanguageContext';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Badge from '@/ui/Badge';
import Card from '@/ui/Card';
import styles from './HistoryCard.module.css';

const getCardIconAndClass = (status) => {
  switch (status) {
    case 'completed':
      return {
        icon: <CheckCircle2 size={18} />,
        accentColor: 'var(--color-state-success)',
      };
    case 'partial':
      return {
        icon: <AlertTriangle size={18} />,
        accentColor: 'var(--color-state-warning)',
      };
    case 'undone':
      return {
        icon: <RotateCcw size={18} />,
        accentColor: 'var(--color-text-muted)',
      };
    default:
      return {
        icon: <Clock size={18} />,
        accentColor: 'var(--color-accent)',
      };
  }
};

export default function HistoryCard({
  batch,
  index,
  isAnyTaskActive,
  isUndoing,
  isReverting,
  onConfirmUndo,
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const isUndone = batch.status === 'undone';
  const isRevertDisabled = isUndone || isAnyTaskActive || isReverting;
  const { icon, accentColor } = getCardIconAndClass(batch.status);
  const hasLogs = batch.logs && batch.logs.length > 0;

  return (
    <Card
      variant="soft"
      padding="none"
      className="animate-fade-in-up u-card-badge-override"
      data-item-index={index}
      data-accent-color={accentColor}
    >
      <Inline align="center" className={styles['card-body']}>
        <div className="u-icon-box">
          {icon}
        </div>
        <Stack gap="sm" flex={1}>
          <Inline gap="md" align="center">
            {batch.success_count > 0 && (
              <Inline gap="md" align="center">
                {batch.movie_count > 0 && (
                  <Badge size="sm">
                    <strong>{batch.movie_count}</strong> {t('historyPage.badgeMovies') || 'Movies'}
                  </Badge>
                )}
                {batch.episode_count > 0 && (
                  <Badge size="sm">
                    <strong>{batch.episode_count}</strong> {t('historyPage.badgeEpisodes') || 'Episodes'}
                  </Badge>
                )}
                {batch.extra_count > 0 && (
                  <Badge size="sm">
                    <strong>{batch.extra_count}</strong> {t('historyPage.badgeExtras') || 'Extras'}
                  </Badge>
                )}
                <Badge family="status" tone="accent" size="sm">
                  <strong>{batch.success_count}</strong> {t('historyPage.statTotal') || 'Total'}
                </Badge>
                {batch.undone_count > 0 && batch.remaining_count > 0 && (
                  <>
                    <Badge size="sm">
                      <strong>{batch.undone_count}</strong> {t('historyPage.statReverted') || 'Reverted'}
                    </Badge>
                    <Badge family="status" tone="warning" size="sm">
                      <strong>{batch.remaining_count}</strong> {t('historyPage.statRemaining') || 'Remaining'}
                    </Badge>
                  </>
                )}
              </Inline>
            )}
            {batch.failed_count > 0 && (
              <Badge family="status" tone="danger" size="sm">
                <strong>{batch.failed_count}</strong> {t('historyPage.statFailed') || 'Failed'}
              </Badge>
            )}
          </Inline>
          <Inline gap="lg" align="center">
            <Inline gap="xs" align="center">
              <Calendar size={14} className={styles['text-muted']} />
              <Text variant="small" color="secondary">
                {new Date(batch.created_at).toLocaleString()}
              </Text>
            </Inline>
            <Inline gap="xs" align="center">
              <Clock size={14} className={styles['text-muted']} />
              <Text variant="small" color="secondary">
                {t('historyPage.batchIdLabel', { defaultValue: 'ID: #{{id}}', id: batch.id })}
              </Text>
            </Inline>
          </Inline>
        </Stack>
        <div className={styles['action-container']}>
          <Inline align="center" gap="sm">
            {hasLogs && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>
                  {isExpanded ? t('common.hideDetails') || 'Hide Details' : t('common.showDetails') || 'Show Details'}
                </span>
              </Button>
            )}
            <Tooltip
              content={
                isUndone
                  ? (t('historyPage.alreadyRevertedTooltip') || 'This batch has already been reverted.')
                  : null
              }
              side="left"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={isRevertDisabled}
                onClick={() => onConfirmUndo(batch)}
                icon={(isUndoing && isAnyTaskActive && !isUndone) || isReverting ? <Spinner size={14} /> : <RotateCcw size={14} />}
              >
                {t('historyPage.revertButton') || 'Revert'}
              </Button>
            </Tooltip>
          </Inline>
        </div>
      </Inline>

      {isExpanded && hasLogs && (
        <div className="u-card-details">
          <Text variant="xsmall" weight="bold" color="muted" uppercase className={styles['log-title-header']}>
            {t('historyPage.renamedFilesTitle') || 'Renamed Files:'}
          </Text>
          <div className="u-scroll-list">
            {batch.logs.map((log) => {
              const oldFile = log.old_value ? log.old_value.split(/[\\/]/).pop() : '';
              const newFile = log.new_value ? log.new_value.split(/[\\/]/).pop() : '';
              const oldDir = log.old_value ? log.old_value.substring(0, log.old_value.length - oldFile.length) : '';
              const newDir = log.new_value ? log.new_value.substring(0, log.new_value.length - newFile.length) : '';
              return (
                <div
                  key={log.id}
                  className={styles['log-row']}
                >
                  <Inline gap="md" align="center" className={styles['inline-nowrap']}>
                    <Stack gap="none" flex={1} className={styles['min-w-0']}>
                      <Text variant="xsmall" color="muted" truncate>
                        {oldDir}
                      </Text>
                      <Text variant="small" weight="medium" color="primary" truncate>
                        {oldFile}
                      </Text>
                    </Stack>
                    <ArrowRight size={14} className={styles['arrow-icon']} />
                    <Stack gap="none" flex={1} className={styles['min-w-0']}>
                      <Text variant="xsmall" color="muted" truncate>
                        {newDir}
                      </Text>
                      <Text variant="small" weight="medium" color="primary" truncate className={styles['text-accent-pale']}>
                        {newFile}
                      </Text>
                    </Stack>
                  </Inline>
                  {log.error_message && (
                    <Text variant="xsmall" className={styles['text-danger-margin']}>
                      {log.error_message}
                    </Text>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
