import PropTypes from 'prop-types';
import Skeleton from '../../../../ui/Skeleton';
import styles from '../RecommendationsWidget.module.css';

export const RecommendationSkeleton = ({ showBanner = false }) => (
  <div className={styles['recommend-skeleton']}>
    {showBanner && <Skeleton.Banner />}
    <Skeleton.Title />
    <Skeleton.Row>
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton.Card key={idx} />
      ))}
    </Skeleton.Row>
  </div>
);

RecommendationSkeleton.propTypes = {
  showBanner: PropTypes.bool,
};

export default RecommendationSkeleton;
