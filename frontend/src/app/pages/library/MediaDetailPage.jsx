import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  Play, Pause
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
import { useScrollRestoration } from '@/hooks/useScrollRestoration';


import MediaHeaderInfo from './components/detail/MediaHeaderInfo';
import UserRatingSection from './components/detail/UserRatingSection';
import MediaOverview from './components/detail/MediaOverview';
import './components/detail/FallbackGrid.css';
import MediaActions from './components/detail/MediaActions';
import DetailPageShell from './components/detail/DetailPageShell';
import UtilityBarBottomPortal from '../../../components/UtilityBarBottomPortal';


// Panels
import BespokeSeasonsSection from './components/detail/sections/BespokeSeasonsSection';
import TechnicalPanel from './components/detail/panels/TechnicalPanel';
import BespokeSceneTagger from './components/detail/scene/BespokeSceneTagger';
import BespokeScenePeaks from './components/detail/scene/BespokeScenePeaks';
import BespokeListPanel from './components/detail/sections/BespokeListPanel';
import './components/entityDetail/EntityDetailHeroSection.css';

import BespokeCastSection from './components/detail/sections/BespokeCastSection';
import BespokeCompaniesSection from './components/detail/sections/BespokeCompaniesSection';
import BespokeRatingsSection from './components/detail/sections/BespokeRatingsSection';
import CompactWatchStatsSection from './components/detail/sections/CompactWatchStatsSection';

import ImagePickerDrawer from './components/ImagePickerDrawer';
import Lightbox from '@/ui/Lightbox';
import EditableMediaCard from './components/entityDetail/EditableMediaCard';

import DetailsMetadataDrawer from './components/detail/DetailsMetadataDrawer';
import BespokeBoxOfficeSection from './components/detail/sections/BespokeBoxOfficeSection';
import BottomSocialsBar from './components/detail/sections/BottomSocialsBar';
import IconButton from '@/ui/IconButton';
import { ChevronDown, ChevronUp } from '@/ui/icons';




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

  useScrollRestoration('.media-detail-page__container', [isLoading]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLogoDrawerOpen, setIsLogoDrawerOpen] = useState(false);
  const [isPosterDrawerOpen, setIsPosterDrawerOpen] = useState(false);
  const [isBackdropDrawerOpen, setIsBackdropDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [activeSideTab, setActiveSideTab] = useState('activity');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setIsPreviewPlaying(false);
    setPreviewSrc(null);
  }
  const containerRef = useRef(null);

  const handleTogglePreview = () => {
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
    } else {
      const url = `${API_BASE}/api/v1/media/${id}/preview?resolution=1080`;
      setPreviewSrc(url);
      setIsPreviewPlaying(true);
    }
  };

  const [isScrolled, handleScrollToggle] = useHeaderScrollTransition(
    id,
    isLogoDrawerOpen || isPosterDrawerOpen || isBackdropDrawerOpen || isDrawerOpen,
    isPreviewPlaying
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
        isPreviewPlaying={isPreviewPlaying}
        previewSrc={previewSrc}
        backLabel={t('common.back') || 'Back'}
        pageClassName={`media-detail-page--scroll-transition ${isScrolled ? 'is-scrolled' : ''} ${isPreviewPlaying ? 'is-preview-playing' : ''} ${isLogoDrawerOpen || isPosterDrawerOpen || isBackdropDrawerOpen || isDrawerOpen ? 'logo-drawer-open' : ''}`}
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
            {isScene && !isScrolled && item?.in_library && (
              <button
                type="button"
                className={`media-detail-page__center-play-btn ${isPreviewPlaying ? 'is-playing' : ''}`}
                onClick={handleTogglePreview}
                title={isPreviewPlaying ? 'Pause Preview' : 'Play Preview'}
              >
                {isPreviewPlaying ? <Pause size={32} /> : <Play size={32} className="play-icon-offset" />}
              </button>
            )}
            {(!state.logoUrl && state.posterUrl && !isScene) ? (
              <div className="media-detail-page__fallback-grid">
                <EditableMediaCard
                  mediaUrl={state.posterUrl}
                  altText={state.title}
                  onClick={() => {
                    const url = getOriginalPosterUrl();
                    if (url) setLightboxUrl(url);
                  }}
                  onEditClick={handleOpenPosterModal}
                  editTitle={t('library.details.changePoster') || 'Change Poster'}
                  viewOriginalTitle={t('library.details.viewOriginalImage') || 'View Original Image'}
                  type="poster"
                  className="media-detail-page__fallback-poster-col"
                />
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
                    <div className="media-detail-page__technical-container">
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
              <div className="media-side-tabs">
                <button
                  type="button"
                  className={`media-side-tab-btn ${activeSideTab === 'activity' ? 'is-active' : ''}`}
                  onClick={() => setActiveSideTab('activity')}
                >
                  {t('library.details.tab_activity') || 'Activity'}
                </button>
                <button
                  type="button"
                  className={`media-side-tab-btn ${activeSideTab === 'organize' ? 'is-active' : ''}`}
                  onClick={() => setActiveSideTab('organize')}
                >
                  {t('library.details.tab_organize') || 'Organize'}
                </button>
              </div>

              {activeSideTab === 'activity' && (
                <>
                  {item && (
                    <CompactWatchStatsSection
                      item={item}
                      isMovie={isMovie}
                      isScene={isScene}
                      t={t}
                    />
                  )}
                  {item && <BespokeSceneTagger />}
                </>
              )}

              {activeSideTab === 'organize' && (
                <>
                  {item && <BespokeListPanel />}
                  {item && item.is_adult && (isMovie || isScene) && <BespokeScenePeaks />}
                </>
              )}
            </div>
          </div>
        </div>

        <UtilityBarBottomPortal side="left">
          <MediaActions />
        </UtilityBarBottomPortal>

        <UtilityBarBottomPortal side="center">
          <IconButton
            variant="ghost"
            className="entity-detail-page__scroll-toggle-btn"
            onClick={handleScrollToggle}
            title={
              isScrolled
                ? (t('library.details.backToProfile') || 'Back to Profile')
                : (t('library.details.scrollToCredits') || 'Scroll to Details')
            }
          >
            {isScrolled ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
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

      <ImagePickerDrawer
        isOpen={isLogoDrawerOpen}
        onClose={() => setIsLogoDrawerOpen(false)}
        title={t('library.details.chooseLogo') || 'Choose Logo'}
        className="entity-detail-page__drawer--logo"
        entityId={id}
        tmdbId={item?.tmdb_id || item?.tv_tmdb_id}
        imageType="logo"
        entityType={normalizedType}
        currentPath={item?.logo_path}
        t={t}
        toast={toast}
        item={item}
        closeOnSelect={false}
        variant="contrast"
      />

      <ImagePickerDrawer
        isOpen={isPosterDrawerOpen}
        onClose={() => setIsPosterDrawerOpen(false)}
        title={t('library.details.choosePoster') || 'Choose Poster'}
        className="entity-detail-page__drawer--poster"
        entityId={id}
        tmdbId={item?.tmdb_id || item?.tv_tmdb_id}
        imageType="poster"
        entityType={normalizedType}
        currentPath={item?.poster_path}
        t={t}
        toast={toast}
        item={item}
        closeOnSelect={false}
      />

      <ImagePickerDrawer
        isOpen={isBackdropDrawerOpen}
        onClose={() => setIsBackdropDrawerOpen(false)}
        title={t('library.details.backdrops') || 'Choose Backdrop'}
        className="entity-detail-page__drawer--backdrop"
        entityId={id}
        tmdbId={item?.tmdb_id || item?.tv_tmdb_id}
        imageType="backdrop"
        entityType={normalizedType}
        currentPath={item?.backdrop_path}
        t={t}
        toast={toast}
        item={item}
        closeOnSelect={false}
      />

      <Lightbox
        imageUrl={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        t={t}
      />
    </MediaDetailProvider>
  );
}


