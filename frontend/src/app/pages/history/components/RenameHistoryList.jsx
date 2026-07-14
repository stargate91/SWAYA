import Skeleton from '@/ui/Skeleton';
import EmptyState from '@/ui/EmptyState';
import Spinner from '@/ui/Spinner';
import { RotateCcw } from '@/ui/icons';
import HistoryCard from './HistoryCard';
import styles from './RenameHistoryList.module.css';
import historyPageStyles from '../HistoryPage.module.css';

export default function RenameHistoryList({
  isLoading,
  history,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
  isAnyTaskActive,
  isUndoing,
  revertingBatchIds,
  onConfirmUndo,
  t
}) {
  if (isLoading) {
    return (
      <div className={styles['history-list']} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} style={{ padding: 'var(--space-lg)', background: 'var(--color-panel-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <div style={{ width: '200px' }}><Skeleton style={{ height: '24px' }} variant="rect" /></div>
              <div style={{ width: '80px' }}><Skeleton style={{ height: '24px' }} variant="rect" /></div>
            </div>
            <Skeleton style={{ height: '16px', width: '60%', marginBottom: 'var(--space-sm)' }} variant="text" />
            <Skeleton style={{ height: '16px', width: '40%' }} variant="text" />
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className={historyPageStyles['history-page__empty-container']}>
        <EmptyState
          title={t('historyPage.emptyTitle') || 'No action history'}
          description={t('historyPage.emptyDesc') || 'Reversible file organization batches will be listed here.'}
          icon={RotateCcw}
        />
      </div>
    );
  }

  return (
    <div className={styles['history-list']}>
      {history.map((batch, index) => (
        <HistoryCard
          key={batch.id}
          batch={batch}
          index={index}
          isAnyTaskActive={isAnyTaskActive}
          isUndoing={isUndoing}
          isReverting={revertingBatchIds.has(batch.id)}
          onConfirmUndo={onConfirmUndo}
        />
      ))}
      {hasNextPage && (
        <div ref={sentinelRef} id="history-sentinel" className={historyPageStyles['history-sentinel']}>
          {isFetchingNextPage && <Spinner size={20} />}
        </div>
      )}
    </div>
  );
}
