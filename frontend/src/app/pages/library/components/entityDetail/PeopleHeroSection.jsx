import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, PenLine, Heart, Check, Minus, Plus, Info } from '@/ui/icons';
import Lightbox from '@/ui/Lightbox';
import SegmentedRating from '@/ui/SegmentedRating';
import EntityDetailDrawer from './EntityDetailDrawer';
import EditableMediaCard from './EditableMediaCard';
import IconButton from '@/ui/IconButton';
import {
  getCountryISO,
  getFlagEmoji,
  calculateAliases,
  getOriginalImageUrlHelper
} from '../../utils/heroSectionUtils';
import { navigateToCreditDetail } from '../../utils/mediaNavigation';
import { useTranslation } from '@/providers/LanguageContext';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { API_BASE } from '@/lib/backend';
import './EntityDetailHeroSectionShared.css';
import './PeopleHeroSection.css';
import Inline from '@/ui/Inline';

export default function PeopleHeroSection({
  item,
  mediaUrl,
  overviewText,
  overviewTitle,
  isActivateHovered,
  t,
  setIsActivateHovered,
  handleToggleFavorite,
  handleToggleActive,
  handleOpenReviewModal,
  onMediaCardClick,
  profileLinks = [],
  isDrawerOpen,
  setIsDrawerOpen,
  updatePersonStatusMutation,
}) {
  const navigate = useNavigate();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { locale } = useTranslation();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const getOriginalUrl = () => getOriginalImageUrlHelper(true, item, mediaUrl, API_BASE);

  const { candidateAliases, drawerAliases } = calculateAliases(item?.alternate_names);

  const countryISO = getCountryISO(item?.place_of_birth);
  const flagEmoji = getFlagEmoji(countryISO);

  return (
    <div className="entity-detail-page__hero-section-wrapper">
      <section className="entity-detail-page__hero-grid">
        <div className="entity-detail-page__media-column no-scrollbar">
          {/* 1. Elegant Header (Name & Aliases) */}
          <div className="entity-detail-page__headline-block">
            <h1 className="entity-detail-page__title">
              {item?.name || item?.title || 'Unknown Person'}
            </h1>
            {candidateAliases.length > 0 && (
              <span className="entity-detail-page__sidebar-aliases">
                {candidateAliases.join(', ')}
              </span>
            )}
          </div>

          {/* 2. Visual Centerpiece (Profile Picture) */}
          <EditableMediaCard
            mediaUrl={mediaUrl}
            altText={item?.name || item?.title || 'Detail artwork'}
            onClick={() => {
              const url = getOriginalUrl();
              if (url) setLightboxUrl(url);
            }}
            onEditClick={onMediaCardClick}
            editTitle={t('library.details.changeProfile') || 'Change Profile Picture'}
            viewOriginalTitle={t('library.details.viewOriginalImage') || 'View Original Image'}
            type="profile"
            flagEmoji={flagEmoji}
            flagTooltip={item?.place_of_birth}
          />

          {/* 3. Integrated Sidebar Action Toolbar (Clean 3-button row, no rating pill) */}
          <Inline gap="sm" align="center" className="entity-detail-page__sidebar-actions">
            <IconButton
              variant="none"
              size="none"
              className={`entity-detail-page__sidebar-action entity-detail-page__sidebar-action--favorite ${item?.is_favorite ? 'is-active' : ''}`}
              onClick={handleToggleFavorite}
              title={t('library.details.favorite') || 'Favorite'}
            >
              <Heart size={15} fill={item?.is_favorite ? 'currentColor' : 'none'} />
            </IconButton>
            <IconButton
              variant="none"
              size="none"
              className={`entity-detail-page__sidebar-action entity-detail-page__sidebar-action--activate ${item?.is_active ? 'is-active' : ''}`}
              onClick={handleToggleActive}
              onMouseEnter={() => setIsActivateHovered(true)}
              onMouseLeave={() => setIsActivateHovered(false)}
              title={item?.is_active 
                ? (t('library.people.unfollow') || 'Unfollow') 
                : (t('library.people.follow') || 'Follow')}
            >
              {item?.is_active
                ? (isActivateHovered ? <Minus size={15} /> : <Check size={15} />)
                : <Plus size={15} />}
            </IconButton>
            <IconButton
              variant="none"
              size="none"
              className="entity-detail-page__sidebar-action"
              onClick={handleOpenReviewModal}
              title={t('library.details.writeReview') || 'Write Review'}
            >
              <PenLine size={15} />
            </IconButton>
          </Inline>

          {/* 4. Interactive rating bar */}
          <SegmentedRating
            value={item?.user_rating}
            onChange={(newRating) => {
              if (item?.id) {
                updatePersonStatusMutation.mutate({
                  personId: item.id,
                  routeId: item.id,
                  payload: {
                    user_rating: newRating,
                  },
                });
              }
            }}
            t={t}
            className="entity-detail-page__segmented-rating-container"
            barClassName="entity-detail-page__segmented-rating-bar"
            segmentClassName="entity-detail-page__rating-segment"
            segmentFillClassName="entity-detail-page__rating-segment-fill"
            labelClassName="entity-detail-page__segmented-rating-label"
            formatLabel={(displayVal) => {
              return displayVal !== null && displayVal !== undefined
                ? `${t('library.details.yourRating') || 'Your Rating'}: ${displayVal.toFixed(1)}`
                : (t('library.details.yourRating') || 'Your Rating');
            }}
          />

          {/* 5. Elegant 2x2 Metadata Table */}
          {(() => {
            const calculateAge = (birthdayStr) => {
              if (!birthdayStr) return '';
              const birthDate = new Date(birthdayStr);
              if (isNaN(birthDate.getTime())) return '';
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              return t('library.details.yearsOld', { count: age, defaultValue: `${age} Years Old` });
            };

            const getGenderLabel = (gender) => {
              if (gender === 1 || gender === '1') return t('library.details.female') || 'Female';
              if (gender === 2 || gender === '2') return t('library.details.male') || 'Male';
              if (gender === 3 || gender === '3') return t('library.details.nonBinary') || 'Non-binary';
              return null;
            };

            const formatLastFinish = (isoStr) => {
              if (!isoStr) return '—';
              const date = new Date(isoStr);
              if (isNaN(date.getTime())) return '—';
              return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
            };

            const genderVal = getGenderLabel(item?.gender);
            const deptVal = item?.known_for_department 
              ? (t(`library.people.roles.${item.known_for_department.toLowerCase()}`) || item.known_for_department)
              : (item?.is_adult ? (t('lists.roles.performer') || 'Performer') : (t('lists.roles.artist') || 'Artist'));

            return (
              <div className="entity-detail-page__sidebar-info-table">
                <div className="entity-detail-page__info-row">
                  <div className="entity-detail-page__info-cell">
                    <span className="entity-detail-page__info-label">{t('library.details.gender') || 'Gender'}</span>
                    <span className="entity-detail-page__info-value">{genderVal || '—'}</span>
                  </div>
                  <div className="entity-detail-page__info-cell">
                    <span className="entity-detail-page__info-label">{t('library.details.role') || 'Role'}</span>
                    <span className="entity-detail-page__info-value">{deptVal}</span>
                  </div>
                </div>
                <div className="entity-detail-page__info-row">
                  <div className="entity-detail-page__info-cell">
                    <span className="entity-detail-page__info-label">{t('library.details.born') || 'Born'}</span>
                    <span className="entity-detail-page__info-value">{item?.birthday || '—'}</span>
                  </div>
                  <div className="entity-detail-page__info-cell">
                    <span className="entity-detail-page__info-label">{t('library.details.age') || 'Age'}</span>
                    <span className="entity-detail-page__info-value">
                      {item?.birthday ? calculateAge(item.birthday) : '—'}
                    </span>
                  </div>
                </div>
                {item?.is_adult && sessionMode === 'nsfw' && (
                  <div className="entity-detail-page__info-row">
                    <div className="entity-detail-page__info-cell">
                      <span className="entity-detail-page__info-label">{t('library.details.finishes') || 'Finishes'}</span>
                      <span className="entity-detail-page__info-value">{item?.finish_count ?? 0}</span>
                    </div>
                    <div className="entity-detail-page__info-cell">
                      <span className="entity-detail-page__info-label">{t('library.details.lastFinish') || 'Last Finish'}</span>
                      <span className="entity-detail-page__info-value">{formatLastFinish(item?.last_finish_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {profileLinks.length > 0 && (
            <div className="entity-detail-page__profile-links">
              {profileLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`entity-detail-page__profile-link ${link.fullWidth ? 'entity-detail-page__profile-link--full-width' : ''}`}
                  /* eslint-disable-next-line react/forbid-dom-props */
                  style={{
                    borderColor: `color-mix(in srgb, ${link.brandColor} 30%, transparent)`,
                    color: `color-mix(in srgb, ${link.brandColor} 85%, white)`
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <button
            type="button"
            className="entity-detail-page__sidebar-more-btn"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Info size={13} />
            {t('library.details.needMoreBtn') || 'Biography & Details'}
          </button>
        </div>

        {/* Right column containing Known For aligned to the bottom */}
        <div className="entity-detail-page__summary">
          {item?.known_for?.length > 0 && (
            <div className="entity-detail-page__known-for-section">
              <h3 className="entity-detail-page__known-for-title">
                {t('library.details.knownForTitle') || 'Known For'}
              </h3>
              <div className="entity-detail-page__known-for-grid no-scrollbar">
                {item.known_for.map((credit) => {
                  const creditTitle = credit.title || credit.name || 'Unknown';
                  const handleCardClick = () => {
                    navigateToCreditDetail(navigate, credit, credit.media_type || credit.type);
                  };

                  return (
                    <div
                      key={`${credit.id}-${credit.type || 'movie'}`}
                      className="entity-detail-page__known-for-card is-clickable"
                      onClick={handleCardClick}
                      title={creditTitle}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleCardClick();
                        }
                      }}
                    >
                      <div className="entity-detail-page__known-for-poster-container">
                        {credit.poster_path ? (
                          <img
                            src={credit.poster_path}
                            alt={creditTitle}
                            className="entity-detail-page__known-for-poster"
                            loading="lazy"
                          />
                        ) : (
                          <div className="entity-detail-page__known-for-placeholder">
                            <Layers size={20} />
                          </div>
                        )}
                      </div>
                      <span className="entity-detail-page__known-for-card-title">{creditTitle}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <EntityDetailDrawer
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        item={item}
        overviewTitle={overviewTitle}
        drawerAliases={drawerAliases}
        overviewText={overviewText}
        t={t}
      />

      {lightboxUrl && (
        <Lightbox
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          t={t}
        />
      )}
    </div>
  );
}
