import { useMediaDetailContext } from '../MediaDetailContext';
import Card from '@/ui/Card';
import BespokeTagManager from './BespokeTagManager';
import styles from './BespokeTagger.module.css';
import { memo } from 'react';

function BespokeTagger() {
  const { state, mutations, type, t } = useMediaDetailContext();
  const { item, cleanId, effectiveId } = state;
  const { updateStatusMutation } = mutations;

  const handleUpdateTags = (nextTags) => {
    updateStatusMutation.mutate({
      itemId: effectiveId,
      tvId: cleanId,
      payload: {
        custom_tags: nextTags,
        media_type: type,
      },
    });
  };

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={t('library.details.tagger') || 'Tags & Keywords'}
      className={styles.tagger}
    >
      <BespokeTagManager
        customTags={item?.custom_tags}
        suggestedTags={item?.suggested_tags}
        isAdult={item?.is_adult}
        onUpdateTags={handleUpdateTags}
        t={t}
      />
    </Card>
  );
}

export default memo(BespokeTagger);
