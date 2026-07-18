import PropTypes from 'prop-types';
import TechnicalPanel from './sections/TechnicalPanel';
import ExtrasPanel from './sections/ExtrasPanel';
import Drawer from '@/ui/Drawer';
import Stack from '@/ui/Stack';

export default function DetailsMetadataDrawer({
  isOpen,
  onClose,
  item,
  isScene,
  t
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('library.details.details') || 'Details'}
      size="md"
      padded
    >
      <Stack gap="xl">
        {/* Extras section */}
        {item?.extras && item.extras.length > 0 && <ExtrasPanel variant="drawer" />}

        {/* Technical / Specs section */}
        {!isScene && item?.technical && <TechnicalPanel variant="drawer" />}
      </Stack>
    </Drawer>
  );
}


DetailsMetadataDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  item: PropTypes.object,
  isScene: PropTypes.bool,
  t: PropTypes.func.isRequired,
};
