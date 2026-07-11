import TechnicalPanel from './panels/TechnicalPanel';
import ExtrasPanel from './panels/ExtrasPanel';
import Drawer from '@/ui/Drawer';

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
    >
      <div className="entity-detail-page__drawer-content">


        {/* Extras section */}
        {item?.extras && item.extras.length > 0 && <ExtrasPanel />}

        {/* Technical / Specs section */}
        {!isScene && item?.technical && <TechnicalPanel />}
      </div>
    </Drawer>
  );
}
