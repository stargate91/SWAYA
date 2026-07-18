import { PenLine } from '@/ui/icons';
import Pill from '@/ui/Pill';
import SegmentedRating from '@/ui/SegmentedRating';
import { useMediaDetailContext } from './MediaDetailContext';
import Inline from '@/ui/Inline';
import IconButton from '@/ui/IconButton';
import Tooltip from '@/ui/Tooltip';
import styles from './UserRatingSection.module.css';

export default function UserRatingSection() {
  const { state, actions, t } = useMediaDetailContext();
  const {
    currentRating,
    verticalBarText
  } = state;

  const {
    handleOpenReviewModal,
    handleRatingChange
  } = actions;

  return (
    <Inline gap="lg" align="center" className="media-detail-page__meta-row">
      <Pill variant="meta-large" className={styles.pill}>
        <Tooltip content={t('library.details.writeReview') || 'Write Review'}>
          <IconButton
            variant="ghost"
            size="xs"
            onClick={handleOpenReviewModal}
            title={null}
          >
            <PenLine size={15} />
          </IconButton>
        </Tooltip>
        <span className={styles.separator}>{verticalBarText}</span>

        <SegmentedRating
          value={currentRating}
          onChange={handleRatingChange}
          t={t}
        />
      </Pill>
    </Inline>
  );
}
