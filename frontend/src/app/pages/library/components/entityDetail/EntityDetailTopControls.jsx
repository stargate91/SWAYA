import { Image as ImageIcon, Settings } from '@/ui/icons';
import { useNavigate } from 'react-router-dom';
import PeopleTagPopover from './PeopleTagPopover';
import ListsPopover from '../detail/sections/ListsPopover';
import Inline from '@/ui/Inline';

export default function EntityDetailTopControls({
  isPeople,
  item,
  t,
  canChoosePeopleBackdrop,
  canChooseCollectionBackdrop,
  updatePersonStatusMutation,
  handleOpenPeopleBackdropModal,
  handleOpenCollectionBackdropModal,
}) {
  const navigate = useNavigate();

  if (isPeople) {
    return (
      <Inline gap="sm" align="center" className="entity-detail-page__top-controls">
        <ListsPopover
          item={item}
          type="person"
          t={t}
        />
        <PeopleTagPopover
          item={item}
          t={t}
          updatePersonStatusMutation={updatePersonStatusMutation}
        />
        <button
          type="button"
          onClick={() => navigate(`/library/people/${item.id}/edit`)}
          className="media-detail-page__side-nav-toggle"
          title={item.is_adult ? (t('library.details.editPerformer') || 'Edit Star') : (t('library.details.editArtist') || 'Edit Artist')}
        >
          <Settings size={18} />
        </button>
        {canChoosePeopleBackdrop ? (
          <button
            type="button"
            onClick={handleOpenPeopleBackdropModal}
            className="media-detail-page__side-nav-toggle"
            title={t('library.details.backdrops') || 'Choose Backdrop'}
          >
            <ImageIcon size={18} />
          </button>
        ) : null}
      </Inline>
    );
  }

  if (!canChooseCollectionBackdrop) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleOpenCollectionBackdropModal}
      className="media-detail-page__side-nav-toggle"
      title={t('library.details.backdrops') || 'Choose Backdrop'}
    >
      <ImageIcon size={18} />
    </button>
  );
}
