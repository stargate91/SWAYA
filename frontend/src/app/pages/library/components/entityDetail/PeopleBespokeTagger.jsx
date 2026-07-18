import PropTypes from 'prop-types';
import BespokeTagManager from '../detail/sections/BespokeTagManager';
import '../detail/sections/BespokeTagger.css';

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
    <div className="bespoke-tagger-card bespoke-tagger-card--spaced">
      <div className="bespoke-tagger-header">
        <span className="bespoke-tagger-title">
          {t('library.details.tagger') || 'Tags & Keywords'}
        </span>
      </div>
      <BespokeTagManager
        customTags={item?.custom_tags}
        suggestedTags={item?.suggested_tags}
        isAdult={item?.is_adult}
        onUpdateTags={handleUpdateTags}
        t={t}
      />
    </div>
  );
}

PeopleBespokeTagger.propTypes = {
  item: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  updatePersonStatusMutation: PropTypes.object.isRequired,
};
