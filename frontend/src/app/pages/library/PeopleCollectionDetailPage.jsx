import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import { ChevronDown, ChevronUp } from '@/ui/icons';
import ImagePickerDrawer from './components/ImagePickerDrawer';
import DetailPageShell from './components/detail/DetailPageShell';
import EntityDetailTopControls from './components/entityDetail/EntityDetailTopControls';
import EntityDetailStatusSection from './components/entityDetail/EntityDetailStatusSection';
import EntityDetailHeroSection from './components/entityDetail/EntityDetailHeroSection';
import PersonCreditsSections from './components/entityDetail/PersonCreditsSections';
import CollectionDetailSections from './components/entityDetail/CollectionDetailSections';
import usePeopleCollectionDetailController from './usePeopleCollectionDetailController.jsx';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import PeopleLeftSidebar from './components/entityDetail/PeopleLeftSidebar';
import PeopleRightHeroSection from './components/entityDetail/PeopleRightHeroSection';
import BottomSocialsBar from './components/detail/sections/BottomSocialsBar';
import IconButton from '@/ui/IconButton';
import UtilityBarBottomPortal from '../../../components/UtilityBarBottomPortal';
import shellStyles from './components/detail/DetailPageShell.module.css';

export default function PeopleCollectionDetailPage({ type = 'people' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openModal, toast } = useUi();
  const isPeople = type === 'people';
  const {
    item,
    isLoading,
    queryError,
    hasError,
    overviewTitle,
    overviewText,
    overviewEmptyText,
    profileLinks,
    extraLinks,
    socialLinks,
    backdropUrl,
    mediaUrl,
    isActivateHovered,
    canChoosePeopleBackdrop,
    canChooseCollectionBackdrop,
    updatePersonStatusMutation,
    setIsActivateHovered,
    handleToggleFavorite,
    handleToggleActive,
    handleOpenReviewModal,
    renderReviewDrawer,
  } = usePeopleCollectionDetailController({
    id,
    isPeople,
    t,
  });

  useScrollRestoration('.media-detail-page__container', [isLoading]);

  const handleOpenPeopleBackdropModal = () => setIsBackdropDrawerOpen(true);

  const [isScrolled, setIsScrolled] = useState(false);

  const [isImagePickerDrawerOpen, setIsImagePickerDrawerOpen] = useState(false);
  const [isBackdropDrawerOpen, setIsBackdropDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsScrolled(false);
  }, [id]);

  useEffect(() => {
    if (isImagePickerDrawerOpen || isBackdropDrawerOpen || isDetailsDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isImagePickerDrawerOpen, isBackdropDrawerOpen, isDetailsDrawerOpen]);

  useEffect(() => {
    if (isImagePickerDrawerOpen || isBackdropDrawerOpen || isDetailsDrawerOpen) return;

    const handleWheel = (e) => {
      if (e.target.closest('.global-search') || e.target.closest('.global-search__overlay')) {
        return;
      }
      if (!isPeople) return;

      const scrollableGrid = e.target.closest('[class*="discover-grid-wrapper"], .u-overflow-y-auto');

      if (Math.abs(e.deltaY) > 5) {
        if (e.deltaY > 0) {
          if (scrollableGrid) {
            return;
          }
          if (!isScrolled) {
            setIsScrolled(true);
          }
        } else if (e.deltaY < 0) {
          if (isScrolled) {
            if (scrollableGrid) {
              return;
            }
            setIsScrolled(false);
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isScrolled, isImagePickerDrawerOpen, isBackdropDrawerOpen, isDetailsDrawerOpen, isPeople]);

  const handleScrollArrowClick = useCallback(() => {
    setIsScrolled(true);
  }, [setIsScrolled]);

  const handleOpenImagePickerModal = () => {
    setIsImagePickerDrawerOpen(true);
  };



  return (
    <DetailPageShell
      containerRef={containerRef}
      backdropUrl={backdropUrl}
      fallbackUrl={mediaUrl}
      backLabel={t('common.back') || 'Back'}
      isLoading={isLoading}
      isPeople={isPeople}
      isScrolled={isScrolled}
      pageClassName={`entity-detail-page ${isPeople ? 'entity-detail-page--people' : 'entity-detail-page--collection'} ${isScrolled ? 'is-scrolled' : ''} ${(isImagePickerDrawerOpen || isBackdropDrawerOpen || isDetailsDrawerOpen) ? 'logo-drawer-open' : ''}`}
      topRightControls={
        <EntityDetailTopControls
          isPeople={isPeople}
          item={item}
          t={t}
          canChoosePeopleBackdrop={canChoosePeopleBackdrop}
          canChooseCollectionBackdrop={canChooseCollectionBackdrop}
          updatePersonStatusMutation={updatePersonStatusMutation}
          handleOpenPeopleBackdropModal={handleOpenPeopleBackdropModal}
          handleOpenCollectionBackdropModal={() => setIsBackdropDrawerOpen(true)}
          extraLinks={extraLinks}
          socialLinks={socialLinks}
        />
      }
    >
      {hasError && (
        <EntityDetailStatusSection
          title={isPeople ? 'Unable to load person' : 'Unable to load collection'}
          message={queryError?.message || 'The detail request failed.'}
        />
      )}

      {!hasError && item && !isLoading && (
        <>
          {isPeople ? (
            <div className="people-detail-layout">
              <PeopleLeftSidebar
                item={item}
                mediaUrl={mediaUrl}
                overviewText={overviewText}
                overviewTitle={overviewTitle}
                overviewEmptyText={overviewEmptyText}
                isActivateHovered={isActivateHovered}
                setIsActivateHovered={setIsActivateHovered}
                handleToggleFavorite={handleToggleFavorite}
                handleToggleActive={handleToggleActive}
                handleOpenReviewModal={handleOpenReviewModal}
                onMediaCardClick={handleOpenImagePickerModal}
                updatePersonStatusMutation={updatePersonStatusMutation}
                isDrawerOpen={isDetailsDrawerOpen}
                setIsDrawerOpen={setIsDetailsDrawerOpen}
              />
              <div className="people-detail-right-column">
                <div className="entity-detail-page__transition-wrapper">
                  <PeopleRightHeroSection item={item} />
                  <PersonCreditsSections
                    id={id}
                    item={item}
                    navigate={navigate}
                    t={t}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="entity-detail-page__transition-wrapper">
              <EntityDetailHeroSection
                isPeople={isPeople}
                item={item}
                isScrolled={isScrolled}
                onScrollArrowClick={handleScrollArrowClick}
                mediaUrl={mediaUrl}
                profileLinks={profileLinks}
                extraLinks={extraLinks}
                socialLinks={socialLinks}
                overviewText={overviewText}
                overviewTitle={overviewTitle}
                overviewEmptyText={overviewEmptyText}
                isActivateHovered={isActivateHovered}
                t={t}
                openModal={openModal}
                setIsActivateHovered={setIsActivateHovered}
                handleToggleFavorite={handleToggleFavorite}
                handleToggleActive={handleToggleActive}
                handleOpenReviewModal={handleOpenReviewModal}
                onMediaCardClick={handleOpenImagePickerModal}
                updatePersonStatusMutation={updatePersonStatusMutation}
                isDrawerOpen={isDetailsDrawerOpen}
                setIsDrawerOpen={setIsDetailsDrawerOpen}
              />
              <CollectionDetailSections
                item={item}
                navigate={navigate}
                t={t}
              />
            </div>
          )}
        </>
      )}
      {!hasError && isPeople && socialLinks.length > 0 && (
        <BottomSocialsBar socialLinks={socialLinks} t={t} />
      )}


      {!hasError && isPeople && (
        <UtilityBarBottomPortal side="center">
          <IconButton
            variant="ghost"
            size="sm"
            className={shellStyles['scroll-toggle-btn']}
            onClick={() => setIsScrolled(!isScrolled)}
            title={
              isScrolled
                ? (t('library.details.backToProfile') || 'Back to Profile')
                : (t('library.details.scrollToCredits') || 'Scroll to Credits')
            }
          >
            {isScrolled ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
        </UtilityBarBottomPortal>
      )}

      {/* Image Picker Drawer */}
      <ImagePickerDrawer
        isOpen={isImagePickerDrawerOpen}
        onClose={() => setIsImagePickerDrawerOpen(false)}
        title={isPeople ? (t('library.details.changeProfile') || 'Change Profile Picture') : (t('library.details.changePoster') || 'Change Poster')}
        className="entity-detail-page__drawer--poster"
        entityId={isPeople ? item?.id : `collection_${item?.tmdb_id}`}
        entityType={isPeople ? 'person' : 'collection'}
        imageType={isPeople ? 'profile' : 'poster'}
        externalIds={item?.external_ids}
        item={item}
        t={t}
        toast={toast}
        closeOnSelect={false}
      />

      {/* Backdrop Picker Drawer */}
      <ImagePickerDrawer
        isOpen={isBackdropDrawerOpen}
        onClose={() => setIsBackdropDrawerOpen(false)}
        title={t('library.details.chooseBackdrop') || 'Choose Backdrop'}
        className="entity-detail-page__drawer--backdrop"
        entityId={isPeople ? item?.id : `collection_${item?.tmdb_id || item?.id}`}
        tmdbId={isPeople ? undefined : (item?.tmdb_id || item?.id)}
        item={item}
        entityType={isPeople ? 'person' : 'collection'}
        imageType="backdrop"
        currentPath={item?.backdrop_path}
        t={t}
        toast={toast}
        closeOnSelect={false}
      />
      {renderReviewDrawer()}
    </DetailPageShell>
  );
}
