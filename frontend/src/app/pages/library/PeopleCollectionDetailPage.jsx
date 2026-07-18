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
import './PeopleCollectionDetailPage.css';
import './components/detail/UserRatingSection.css';
import BottomSocialsBar from './components/detail/sections/BottomSocialsBar';

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
      if (Math.abs(e.deltaY) > 5) {
        if (e.deltaY > 0 && !isScrolled) {
          setIsScrolled(true);
        } else if (e.deltaY < 0 && isScrolled) {
          const isInsideSection = e.target.closest('.person-credits-section-container');
          if (isInsideSection) {
            const scrollable = isInsideSection.querySelector('.person-credits-discover-grid-wrapper, .person-credits-discover-grid');
            if (scrollable && scrollable.scrollTop > 0) {
              return;
            }
          }
          setIsScrolled(false);
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

      {!hasError && !item && !isLoading && (
        <EntityDetailStatusSection
          title={isPeople ? 'Person not found' : 'Collection not found'}
          message={isPeople ? 'No person detail was returned for this route.' : 'No collection detail was returned for this route.'}
        />
      )}

      {!hasError && (
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

          {isPeople && (
            <PersonCreditsSections
              id={id}
              item={item}
              isScrolled={isScrolled}
              navigate={navigate}
              t={t}
            />
          )}

          {!isPeople && (
            <CollectionDetailSections
              item={item}
              navigate={navigate}
              t={t}
            />
          )}
        </div>
      )}
      {!hasError && isPeople && socialLinks.length > 0 && (
        <BottomSocialsBar socialLinks={socialLinks} t={t} />
      )}


      {!hasError && isPeople && (
        <div className={`entity-detail-page__scroll-toggle-container ${isScrolled ? 'is-scrolled' : ''}`}>
          <button
            type="button"
            className="entity-detail-page__scroll-toggle-btn"
            onClick={() => setIsScrolled(!isScrolled)}
            title={isScrolled ? (t('library.details.backToProfile') || 'Back to Profile') : (t('library.details.scrollToCredits') || 'Scroll to Credits')}
          >
            {isScrolled ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
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
