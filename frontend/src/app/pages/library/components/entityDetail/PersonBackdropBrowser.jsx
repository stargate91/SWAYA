 
import { ChevronLeft } from '@/ui/icons';
import NavButton from '@/ui/NavButton';
import TMDBImageGrid from './TMDBImageGrid';

export default function PersonBackdropBrowser({
  selectedCredit,
  selectedBackdropMetadataQuery,
  selectedBackdrops,
  selectedBackdropPath,
  item,
  handleSelectDetailedBackdrop,
  overridePersonBackdropMutation,
  isUploadPending,
  t,
  handleBackToCredits
}) {
  return (
    <>
      <div className="person-backdrop-picker__detail-toolbar">
        <NavButton className="person-backdrop-picker__back-btn" onClick={handleBackToCredits} icon={ChevronLeft}>
          {t('common.back') || 'Back'}
        </NavButton>
        <h4 className="details-panel__section-title person-backdrop-picker__detail-title">
          {selectedBackdropMetadataQuery.data?.title || selectedCredit?.title}
        </h4>
      </div>

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
