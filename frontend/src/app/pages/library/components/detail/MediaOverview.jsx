import { useMediaDetailContext } from './MediaDetailContext';
import Text from '@/ui/Text';
import styles from './MediaOverview.module.css';

export default function MediaOverview() {
  const { state, actions, t } = useMediaDetailContext();
  const {
    overview,
    overviewRef,
    isTruncated
  } = state;

  const {
    handleReadMore
  } = actions;

  if (!overview) return null;

  return (
    <div className={styles.overview}>
      <Text
        as="div"
        ref={overviewRef}
        clamp={3}
      >
        {overview}
      </Text>
      {isTruncated && (
        <button
          type="button"
          className={styles['read-more-btn']}
          onClick={handleReadMore}
        >
          {t('library.details.readMore') || 'Read More'}
        </button>
      )}
    </div>
  );
}
