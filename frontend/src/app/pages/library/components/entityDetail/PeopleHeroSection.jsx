import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Layers, User, PenLine, Heart, Check, Minus, Plus, Info, Bookmark, X, Maximize2 } from '@/ui/icons';
import IconButton from '@/ui/IconButton';
import { API_BASE } from '@/lib/backend';
import { getProfileImagePath } from '@/lib/imageUrls';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import { navigateToCreditDetail } from '../../utils/mediaNavigation';
import { useTranslation } from '@/providers/LanguageContext';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import './EntityDetailHeroSection.css';

const TIMES_CHAR = '\u00d7';
const DASH_CHAR = ' - ';
const CM_CHAR = ' cm';
const KG_CHAR = ' kg';

export default function PeopleHeroSection({
  item,
  mediaUrl,
  overviewText,
  overviewTitle,
  displayRating,
  isActivateHovered,
  t,
  setIsActivateHovered,
  handleToggleFavorite,
  handleToggleActive,
  handleOpenReviewModal,
  handlePeopleRatingMouseMove,
  handlePeopleRatingMouseLeave,
  handlePeopleRatingClick,
  onMediaCardClick,
  profileLinks = [],
  isDrawerOpen,
  setIsDrawerOpen,
}) {
  const navigate = useNavigate();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { locale } = useTranslation();
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const getOriginalUrl = () => {
    const rawPath = getProfileImagePath(item);
    if (!rawPath) return mediaUrl || '';
    return resolveDetailsImageUrl(rawPath, API_BASE, 'originalPerson');
  };

  const candidateAliases = (item?.alternate_names) ? item.alternate_names.slice(0, 4) : [];
  let accumulatedLength = 0;
  const sidebarAliases = candidateAliases.map((alias, idx) => {
    accumulatedLength += alias.length + (idx > 0 ? 2 : 0);
    const isTruncated = accumulatedLength > 20 || idx >= 2;
    return {
      original: alias,
      isTruncated
    };
  });

  const drawerAliases = [
    ...sidebarAliases.filter(a => a.isTruncated).map(a => a.original),
    ...((item?.alternate_names) ? item.alternate_names.slice(4) : [])
  ];

  const countryISO = (() => {
    if (!item?.place_of_birth) return null;
    const place = item.place_of_birth.trim().toUpperCase();
    const parts = place.split(',').map(p => p.trim());
    const lastPart = parts[parts.length - 1];

    const map = {
      'USA': 'US', 'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US',
      'HUNGARY': 'HU', 'MAGYARORSZÁG': 'HU',
      'GERMANY': 'DE', 'DEUTSCHLAND': 'DE',
      'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB', 'ENGLAND': 'GB',
      'CANADA': 'CA', 'FRANCE': 'FR', 'SPAIN': 'ES', 'ITALY': 'IT',
      'RUSSIA': 'RU', 'RUSSIAN FEDERATION': 'RU',
      'AUSTRALIA': 'AU', 'JAPAN': 'JP', 'BRAZIL': 'BR',
      'NETHERLANDS': 'NL', 'POLAND': 'PL', 'UKRAINE': 'UA', 'SWEDEN': 'SE',
      'CZECH REPUBLIC': 'CZ', 'CZECHIA': 'CZ', 'SLOVAKIA': 'SK', 'AUSTRIA': 'AT',
      'CUBA': 'CU', 'COLOMBIA': 'CO', 'MEXICO': 'MX', 'ROMANIA': 'RO',
      'ARGENTINA': 'AR', 'BELGIUM': 'BE', 'SWITZERLAND': 'CH', 'CHINA': 'CN',
      'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'PHILIPPINES': 'PH', 'THAILAND': 'TH',
      'VIETNAM': 'VN', 'NORWAY': 'NO', 'DENMARK': 'DK', 'FINLAND': 'FI',
      'BULGARIA': 'BG', 'GREECE': 'GR', 'TURKEY': 'TR', 'PORTUGAL': 'PT',
      'SOUTH AFRICA': 'ZA', 'NEW ZEALAND': 'NZ', 'VENEZUELA': 'VE',
    };
    return map[lastPart] || (lastPart.length === 2 ? lastPart : null);
  })();

  const flagEmoji = (() => {
    if (!countryISO) return '';
    const codePoints = countryISO
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch {
      return '';
    }
  })();

  return (
    <div className="entity-detail-page__hero-section-wrapper">
      <section className="entity-detail-page__hero-grid">
        <div className="entity-detail-page__media-column">
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
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="entity-detail-page__media-card entity-detail-page__media-card--profile entity-detail-page__media-card--editable"
            onClick={() => {
              const url = getOriginalUrl();
              if (url) setLightboxUrl(url);
            }}
            title={t('library.details.viewOriginalImage') || 'View Original Image'}
          >
            {mediaUrl ? (
              <>
                <img
                  src={mediaUrl}
                  alt={item?.name || item?.title || 'Detail artwork'}
                  className="entity-detail-page__media-image"
                />
                <div className="entity-detail-page__media-card-hover-overlay">
                  <div className="entity-detail-page__media-card-hover-icon">
                    <Maximize2 size={16} />
                  </div>
                </div>
              </>
            ) : (
              <div className="entity-detail-page__media-placeholder">
                <User size={44} />
              </div>
            )}

            {/* Subtle Country Flag Badge overlay */}
            {flagEmoji && (
              <div
                className="entity-detail-page__media-flag-badge"
                title={item.place_of_birth}
              >
                {flagEmoji}
              </div>
            )}

            <button
              type="button"
              className="entity-detail-page__media-edit-badge"
              onClick={(event) => {
                event.stopPropagation();
                onMediaCardClick?.();
              }}
              title={t('library.details.changeProfile') || 'Change Profile Picture'}
              aria-label={t('library.details.changeProfile') || 'Change Profile Picture'}
            >
              <PenLine size={14} />
            </button>
          </div>

          {/* 3. Integrated Sidebar Action Toolbar (Clean 3-button row, no rating pill) */}
          <div className="entity-detail-page__sidebar-actions">
            <button
              type="button"
              className={`entity-detail-page__sidebar-action entity-detail-page__sidebar-action--favorite ${item?.is_favorite ? 'is-active' : ''}`}
              onClick={handleToggleFavorite}
              title={t('library.details.favorite') || 'Favorite'}
            >
              <Heart size={15} fill={item?.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
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
            </button>
            <button
              type="button"
              className="entity-detail-page__sidebar-action"
              onClick={handleOpenReviewModal}
              title={t('library.details.writeReview') || 'Write Review'}
            >
              <PenLine size={15} />
            </button>
          </div>

          {/* 4. Interactive rating bar */}
          <div className="entity-detail-page__segmented-rating-container">
            <div
              className="entity-detail-page__segmented-rating-bar"
              onMouseMove={(e) => {
                setIsHoveringBar(true);
                handlePeopleRatingMouseMove(e);
              }}
              onMouseLeave={() => {
                setIsHoveringBar(false);
                handlePeopleRatingMouseLeave();
              }}
              onMouseUp={handlePeopleRatingClick}
              role="slider"
              tabIndex={0}
              aria-label={t('library.details.yourRating') || 'Your Rating'}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={displayRating ?? 0}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                let fill = 0;
                if (displayRating >= val) {
                  fill = 100;
                } else if (displayRating > val - 1) {
                  fill = (displayRating - (val - 1)) * 100;
                }
                return (
                  <div key={val} className="entity-detail-page__rating-segment">
                    <div
                      className="entity-detail-page__rating-segment-fill"
                      ref={(el) => {
                        if (el) el.style.width = `${fill}%`;
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <span className="entity-detail-page__segmented-rating-label">
              {isHoveringBar && displayRating !== null && displayRating !== undefined
                ? `${t('library.details.yourRating') || 'Your Rating'}: ${displayRating.toFixed(1)}`
                : (item?.user_rating !== null && item?.user_rating !== undefined
                  ? `${t('library.details.yourRating') || 'Your Rating'}: ${item.user_rating.toFixed(1)}`
                  : (t('library.details.yourRating') || 'Your Rating'))}
            </span>
          </div>

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
              <div className="entity-detail-page__known-for-grid">
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
                        {/* Bookmark badge to represent "In Library" / "Owned" */}
                        {credit.in_library && (
                          <div className="entity-detail-page__known-for-library-badge" title={t('library.details.inLibrary') || 'In Library'}>
                            <Bookmark size={10} />
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

      {isDrawerOpen && (() => {
        const toTitleCase = (str) => {
          if (!str) return '';
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        const formatListAttr = (val) => {
          if (!val) return null;
          if (Array.isArray(val)) {
            if (val.length === 0) return null;
            const locations = val.map(i => i.location || i.description).filter(Boolean);
            if (locations.length === 0) return 'Yes';
            return toTitleCase(locations.join(', '));
          }
          if (typeof val === 'string') {
            const formatted = toTitleCase(val);
            if (formatted === 'No Piercings' || formatted === 'No Tattoos') return 'No';
            return formatted;
          }
          return null;
        };

        const tattooVal = formatListAttr(item.tattoos);
        const piercingVal = formatListAttr(item.piercings);
        const hasAnySpecs = item?.height || item?.weight || item?.measurements || item?.breast_type || item?.hair_color || item?.eye_color || item?.ethnicity || item?.tattoos || item?.piercings || item?.career_start_year || item?.place_of_birth || item?.butt_shape || item?.butt_size;

        return createPortal(
          <>
            <div
              className="entity-detail-page__drawer-backdrop ui-drawer-backdrop"
              role="button"
              tabIndex={-1}
              onClick={() => setIsDrawerOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsDrawerOpen(false);
                }
              }}
            />
            <div className="entity-detail-page__drawer ui-drawer ui-drawer--md">
              <div className="entity-detail-page__drawer-header">
                <h3 className="entity-detail-page__drawer-title">{item?.name || overviewTitle}</h3>
                <IconButton
                  type="button"
                  variant="close"
                  onClick={() => setIsDrawerOpen(false)}
                  label={t('common.close') || 'Close'}
                  size="sm"
                >
                  <X size={16} />
                </IconButton>
              </div>
              <div className="entity-detail-page__drawer-content">
                {/* Section 1: Alternate Names */}
                {drawerAliases.length > 0 && (
                  <div className="entity-detail-page__drawer-section">
                    <h4 className="entity-detail-page__drawer-section-title">
                      {t('library.details.alsoKnownAs') || 'Also known as'}
                    </h4>
                    <div className="entity-detail-page__drawer-aliases-text">
                      {drawerAliases.join(', ')}
                    </div>
                  </div>
                )}

                {/* Section 2: Physical Specs */}
                {hasAnySpecs && (
                  <div className="entity-detail-page__drawer-section">
                    <h4 className="entity-detail-page__drawer-section-title">
                      {t('library.details.specsTitle') || 'Physical Specs'}
                    </h4>
                    <div className="entity-detail-page__drawer-specs-grid">
                      {item.place_of_birth && (
                        <div className="entity-detail-page__specs-item entity-detail-page__specs-item--full">
                          <span className="entity-detail-page__specs-label">{t('library.details.placeOfBirth')}</span>
                          <span className="entity-detail-page__specs-value">{item.place_of_birth}</span>
                        </div>
                      )}
                      {item.career_start_year && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.activeYears')}</span>
                          <span className="entity-detail-page__specs-value">
                            {item.career_start_year}{DASH_CHAR}{item.career_end_year || t('library.details.present')}
                          </span>
                        </div>
                      )}
                      {item.height && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.height')}</span>
                          <span className="entity-detail-page__specs-value">{item.height}{CM_CHAR}</span>
                        </div>
                      )}
                      {item.weight && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.weight')}</span>
                          <span className="entity-detail-page__specs-value">{item.weight}{KG_CHAR}</span>
                        </div>
                      )}
                      {item.measurements && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.measurements')}</span>
                          <span className="entity-detail-page__specs-value">{item.measurements}</span>
                        </div>
                      )}
                      {item.breast_type && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.breastType')}</span>
                          <span className="entity-detail-page__specs-value">{t(`library.performerEdit.breastTypes.${item.breast_type.toLowerCase()}`) || toTitleCase(item.breast_type)}</span>
                        </div>
                      )}
                      {item.butt_shape && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.buttShape') || 'Butt Shape'}</span>
                          <span className="entity-detail-page__specs-value">{t(`library.performerEdit.buttShapes.${item.butt_shape.toLowerCase()}`) || toTitleCase(item.butt_shape)}</span>
                        </div>
                      )}
                      {item.butt_size && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.buttSize') || 'Butt Size'}</span>
                          <span className="entity-detail-page__specs-value">{t(`library.performerEdit.buttSizes.${item.butt_size.toLowerCase()}`) || toTitleCase(item.butt_size)}</span>
                        </div>
                      )}
                      {item.hair_color && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.hairColor')}</span>
                          <span className="entity-detail-page__specs-value">{t(`library.performerEdit.hairColors.${item.hair_color.toLowerCase()}`) || toTitleCase(item.hair_color)}</span>
                        </div>
                      )}
                      {item.eye_color && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.eyeColor')}</span>
                          <span className="entity-detail-page__specs-value">{t(`library.performerEdit.eyeColors.${item.eye_color.toLowerCase()}`) || toTitleCase(item.eye_color)}</span>
                        </div>
                      )}
                      {item.ethnicity && (
                        <div className="entity-detail-page__specs-item">
                          <span className="entity-detail-page__specs-label">{t('library.details.ethnicity')}</span>
                          <span className="entity-detail-page__specs-value">{t(`library.performerEdit.ethnicities.${item.ethnicity.toLowerCase()}`) || toTitleCase(item.ethnicity)}</span>
                        </div>
                      )}
                      {tattooVal && (
                        <div className="entity-detail-page__specs-item entity-detail-page__specs-item--full">
                          <span className="entity-detail-page__specs-label">{t('library.details.tattoos')}</span>
                          <span className="entity-detail-page__specs-value">{tattooVal}</span>
                        </div>
                      )}
                      {piercingVal && (
                        <div className="entity-detail-page__specs-item entity-detail-page__specs-item--full">
                          <span className="entity-detail-page__specs-label">{t('library.details.piercings')}</span>
                          <span className="entity-detail-page__specs-value">{piercingVal}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 3: Biography */}
                {overviewText && (
                  <div className="entity-detail-page__drawer-section">
                    <h4 className="entity-detail-page__drawer-section-title">
                      {t('library.details.biographyTitle') || 'Biography'}
                    </h4>
                    <div className="entity-detail-page__drawer-bio">
                      {overviewText.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={index} className="entity-detail-page__drawer-paragraph">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        );
      })()}

      {lightboxUrl && typeof document !== 'undefined' ? createPortal(
        <div
          className="organizer-details__lightbox"
          role="button"
          tabIndex={0}
          aria-label={t('common.close') || 'Close image preview'}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setLightboxUrl(null);
            }
          }}
        >
          <button
            type="button"
            className="organizer-details__lightbox-close"
            aria-label={t('common.close') || 'Close image preview'}
            onClick={(event) => {
              event.stopPropagation();
              setLightboxUrl(null);
            }}
          >
            <X size={18} />
          </button>
          <img
            src={lightboxUrl}
            alt="Enlarged preview"
            className="organizer-details__lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body
      ) : null}
    </div>
  );
}
