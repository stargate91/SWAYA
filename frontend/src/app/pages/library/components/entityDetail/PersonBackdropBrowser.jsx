import { ChevronLeft } from '@/ui/icons';
import Button from '@/ui/Button';
import TMDBImageGrid from './TMDBImageGrid';
import { useOverridePersonBackdropMutation } from '@/queries';
import Inline from '@/ui/Inline';

export default function PersonBackdropBrowser({
  selectedCredit,
  selectedBackdropMetadataQuery,
  selectedBackdrops,
  selectedBackdropPath,
  item,
  handleSelectDetailedBackdrop,
  isUploadPending,
  t,
  handleBackToCredits
}) {
  const overridePersonBackdropMutation = useOverridePersonBackdropMutation();
  return (
    <>
      <Inline gap="md" align="center" className="person-backdrop-picker__detail-toolbar">
        <Button variant="secondary-neutral" leftIcon={<ChevronLeft size={14} />} animateIcon className="person-backdrop-picker__back-btn" onClick={handleBackToCredits}>
          {t('common.back') || 'Back'}
        </Button>
        <h4 className="details-panel__section-title person-backdrop-picker__detail-title">
          {selectedBackdropMetadataQuery.data?.title || selectedCredit?.title}
        </h4>
      </Inline>

      <div className="person-backdrop-picker__detail-view">
        <TMDBImageGrid
          customImages={selectedBackdrops}
          imageType="backdrop"
          currentPath={selectedBackdropPath || item?.backdrop_path}
          onSelect={handleSelectDetailedBackdrop}
          isPending={overridePersonBackdropMutation.isPending || isUploadPending}
          pendingPath={overridePersonBackdropMutation.variables?.backdropPath}
          t={t}
        />
      </div>
    </>
  );
}
