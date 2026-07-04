/* eslint-disable react/forbid-dom-props */
import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  ChevronUp, ChevronDown,
  Maximize2, PenLine
} from '@/ui/icons';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import { normalizeMediaType } from '@/lib/mediaTypes';
import { API_BASE } from '@/lib/backend';
import { resolveMediaImageUrl } from '@/lib/imageUrls';

// Context
import { MediaDetailProvider } from './components/detail/MediaDetailContext';

// Hooks
import useMediaDetail from './hooks/useMediaDetail';
import useHeaderScrollTransition from './hooks/useHeaderScrollTransition';
import useMediaSocialLinks from './hooks/useMediaSocialLinks';


import MediaHeaderInfo from './components/detail/MediaHeaderInfo';
import UserRatingSection from './components/detail/UserRatingSection';
import MediaOverview from './components/detail/MediaOverview';
import MediaActions from './components/detail/MediaActions';
import DetailPageShell from './components/detail/DetailPageShell';
import UtilityBarBottomPortal from '../../../components/UtilityBarBottomPortal';

// Panels
import BespokeSeasonsSection from './components/detail/sections/BespokeSeasonsSection';
import TechnicalPanel from './components/detail/panels/TechnicalPanel';
import BespokeSceneTagger from './components/detail/scene/BespokeSceneTagger';
import BespokeScenePeaks from './components/detail/scene/BespokeScenePeaks';
import './components/entityDetail/EntityDetailHeroSection.css';

import BespokeCastSection from './components/detail/sections/BespokeCastSection';
import BespokeCompaniesSection from './components/detail/sections/BespokeCompaniesSection';
import BespokeRatingsSection from './components/detail/sections/BespokeRatingsSection';
import CompactWatchStatsSection from './components/detail/sections/CompactWatchStatsSection';

import LogoSelectorDrawer from './components/detail/modals/LogoSelectorDrawer';
import PosterSelectorDrawer from './components/detail/modals/PosterSelectorDrawer';
import BackdropSelectorDrawer from './components/detail/modals/BackdropSelectorDrawer';
import ImageLightbox from './components/detail/modals/ImageLightbox';

import DetailsMetadataDrawer from './components/detail/DetailsMetadataDrawer';
import BespokeBoxOfficeSection from './components/detail/sections/BespokeBoxOfficeSection';
import BottomSocialsBar from './components/detail/sections/BottomSocialsBar';




export default function MediaDetailPage({ type = 'movie' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openModal, closeModal, toast } = useUi();

  const normalizedType = normalizeMediaType(type, type);

  const detailState = useMediaDetail({
    id,
    type: normalizedType,
    t,
    openModal,
    closeModal
  });

  const { state } = detailState;
  const {
    backdropUrl,
    posterUrl,
    item,
    isLoading,
    isMovie,
    isScene
  } = state;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLogoDrawerOpen, setIsLogoDrawerOpen] = useState(false);
  const [isPosterDrawerOpen, setIsPosterDrawerOpen] = useState(false);
  const [isBackdropDrawerOpen, setIsBackdropDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const containerRef = useRef(null);

  const [isScrolled, handleScrollToggle] = useHeaderScrollTransition(
    id,
    isLogoDrawerOpen || isPosterDrawerOpen || isBackdropDrawerOpen || isDrawerOpen
  );

  const socialLinks = useMediaSocialLinks(item, t, normalizedType);

  const getOriginalPosterUrl = () => {
    if (!item) return null;
    const path = item.poster_path || item.local_poster_path;
    if (!path) return null;
    return resolveMediaImageUrl(path, 'originalPoster', API_BASE);
  };

  const handleOpenBackdropModal = () => {
    setIsBackdropDrawerOpen(true);
  };

  const handleOpenPosterModal = () => {
    setIsPosterDrawerOpen(true);
  };

  const handleOpenLogoModal = () => {
    setIsLogoDrawerOpen(true);
  };

  if (isLoading) {
    return <DetailPageShell isLoading />;
  }

  return (
    <MediaDetailProvider value={{
      ...detailState,
      t,
      navigate,
      toast,
      type: normalizedType,
      id,
      handleOpenLogoModal,
      handleOpenPosterModal,
      isDrawerOpen,
      setIsDrawerOpen
    }}>
      <DetailPageShell
        backdropUrl={backdropUrl}
        fallbackUrl={posterUrl}
        isScene={item?.type === 'scene'}
        backLabel={t('common.back') || 'Back'}
        pageClassName={`media-detail-page--scroll-transition ${isScrolled ? 'is-scrolled' : ''} ${isLogoDrawerOpen || isPosterDrawerOpen || isBackdropDrawerOpen || isDrawerOpen ? 'logo-drawer-open' : ''}`}
        containerRef={containerRef}
        topRightControls={(
          <>
            <button
              type="button"
              onClick={handleOpenBackdropModal}
              className="media-detail-page__side-nav-toggle"
              title={t('library.details.backdrops') || 'Choose Backdrop'}
            >
              <ImageIcon size={18} />
            </button>
          </>
        )}
      >
        <div className="media-detail-page__transition-wrapper">
          <div className="media-detail-page__hero-content-section">
            {(!state.logoUrl && state.posterUrl && !isScene) ? (
              <div className="media-detail-page__fallback-grid">
                <div
                  className="media-detail-page__fallback-poster-col entity-detail-page__media-card--editable"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const url = getOriginalPosterUrl();
                    if (url) setLightboxUrl(url);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const url = getOriginalPosterUrl();
                      if (url) setLightboxUrl(url);
                    }
                  }}
                  title={t('library.details.viewOriginalImage') || 'View Original Image'}
                >
                  <img src={state.posterUrl} alt={state.title} className="media-detail-page__fallback-poster" />
                  <div className="entity-detail-page__media-card-hover-overlay">
                    <div className="entity-detail-page__media-card-hover-icon">
                      <Maximize2 size={16} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="entity-detail-page__media-edit-badge"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenPosterModal();
                    }}
                    title={t('library.details.changePoster') || 'Change Poster'}
                    aria-label={t('library.details.changePoster') || 'Change Poster'}
                  >
                    <PenLine size={14} />
                  </button>
                </div>
                <div className="media-detail-page__fallback-content-col">
                  <MediaHeaderInfo isFallbackGrid={true} />
                  <UserRatingSection />
                  <MediaOverview />
                </div>
              </div>
            ) : (
              <>
                <MediaHeaderInfo />
                <UserRatingSection />
                <MediaOverview />
              </>
            )}
          </div>

          <div className="media-detail-page__inline-sections">
            <div className="media-detail-page__inline-main-col">
              {item && <BespokeCastSection item={item} t={t} navigate={navigate} />}
              {isScene && item?.technical && (
                <div className="bespoke-boxoffice-section">
                  <div className="bespoke-boxoffice-card">
                    <div className="bespoke-browser-card__pills-header">
                      <span className="bespoke-cast-title">
                        {t('library.details.technicalInfo') || 'Technical Info'}
                      </span>
                    </div>
                    <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      <TechnicalPanel showTitle={false} />
                    </div>
                  </div>
                </div>
              )}
              {!isMovie && !isScene && item && <BespokeSeasonsSection />}

              {/* Box Office Section for Movies */}
              {isMovie && <BespokeBoxOfficeSection item={item} t={t} />}

              {/* Production Companies / Studio Section */}
              {(isMovie || isScene) && <BespokeCompaniesSection item={item} t={t} />}

              {/* Ratings Section */}
              {(isMovie || isScene) && <BespokeRatingsSection item={item} t={t} />}
            </div>
            <div className="media-detail-page__inline-side-col">
              {item && (
                <CompactWatchStatsSection
                  item={item}
                  isMovie={isMovie}
                  isScene={isScene}
                  t={t}
                />
              )}
              {item && <BespokeSceneTagger />}
              {item && item.is_adult && (isMovie || isScene) && <BespokeScenePeaks />}
            </div>
          </div>
        </div>

        <UtilityBarBottomPortal side="left">
          <MediaActions />
        </UtilityBarBottomPortal>

        <UtilityBarBottomPortal side="center">
          <button
            type="button"
            className="entity-detail-page__scroll-toggle-btn"
            onClick={handleScrollToggle}
            title={isScrolled ? (t('library.details.backToProfile') || 'Back to Profile') : (t('library.details.scrollToCredits') || 'Scroll to Details')}
          >
            {isScrolled ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </UtilityBarBottomPortal>

        <BottomSocialsBar socialLinks={socialLinks} t={t} />
      </DetailPageShell>

      <DetailsMetadataDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={item}
        isMovie={isMovie}
        isScene={isScene}
        t={t}
      />

      <LogoSelectorDrawer
        isOpen={isLogoDrawerOpen}
        onClose={() => setIsLogoDrawerOpen(false)}
        id={id}
        item={item}
        normalizedType={normalizedType}
        t={t}
        toast={toast}
      />

      <PosterSelectorDrawer
        isOpen={isPosterDrawerOpen}
        onClose={() => setIsPosterDrawerOpen(false)}
        id={id}
        item={item}
        normalizedType={normalizedType}
        t={t}
        toast={toast}
      />

      <BackdropSelectorDrawer
        isOpen={isBackdropDrawerOpen}
        onClose={() => setIsBackdropDrawerOpen(false)}
        id={id}
        normalizedType={normalizedType}
        detailState={detailState}
        t={t}
        navigate={navigate}
        toast={toast}
      />

      <ImageLightbox
        lightboxUrl={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        t={t}
      />
    </MediaDetailProvider>
  );
}


