import PropTypes from 'prop-types';
import Card from '@/ui/Card';
import BespokeTagManager from '../detail/sections/BespokeTagManager';

export default function PeopleBespokeTagger({ item, t, updatePersonStatusMutation }) {
  const handleUpdateTags = (nextTags) => {
    if (!item?.id) return;
    updatePersonStatusMutation.mutate({
      personId: item.id,
      payload: {
        custom_tags: nextTags,
      },
    });
  };

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={t('library.details.tagger') || 'Tags & Keywords'}
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

PeopleBespokeTagger.propTypes = {
  item: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  updatePersonStatusMutation: PropTypes.object.isRequired,
};
