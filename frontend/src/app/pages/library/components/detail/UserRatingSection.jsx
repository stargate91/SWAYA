import { PenLine } from '@/ui/icons';
import Pill from '@/ui/Pill';
import SegmentedRating from '@/ui/SegmentedRating';
import { useMediaDetailContext } from './MediaDetailContext';
import Inline from '@/ui/Inline';
import './UserRatingSection.css';

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
      <Pill variant="meta-large" className="rating-pill--large">
        <button
          onClick={handleOpenReviewModal}
          className="review-trigger-btn"
          title={t('library.details.writeReview') || 'Write Review'}
        >
          <PenLine size={15} />
        </button>
        <span className="pill-vertical-separator">{verticalBarText}</span>

        <SegmentedRating
          value={currentRating}
          onChange={handleRatingChange}
          t={t}
        />
      </Pill>
    </Inline>
  );
}
