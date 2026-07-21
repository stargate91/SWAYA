import { useState } from 'react';
import { PenLine, Heart, Check, Minus, Plus, Info } from '@/ui/icons';
import Lightbox from '@/ui/Lightbox';
import SegmentedRating from '@/ui/SegmentedRating';
import EntityDetailDrawer from './EntityDetailDrawer';
import EditableMediaCard from './EditableMediaCard';
import IconButton from '@/ui/IconButton';
import Button from '@/ui/Button';
import {
  getCountryISO,
  getFlagEmoji,
  calculateAliases,
  getOriginalImageUrlHelper
} from '../../utils/heroSectionUtils';
import { useTranslation } from '@/providers/LanguageContext';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { API_BASE } from '@/lib/backend';
import Inline from '@/ui/Inline';
import Text from '@/ui/Text';
import './EntityDetailHeroSectionShared.module.css';
import styles from './PeopleLeftSidebar.module.css';

export default function PeopleLeftSidebar({
  item,
  mediaUrl,
  overviewText,
  overviewTitle,
  isActivateHovered,
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
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { locale, t } = useTranslation();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const getOriginalUrl = () => getOriginalImageUrlHelper(true, item, mediaUrl, API_BASE);

  const { candidateAliases, drawerAliases } = calculateAliases(item?.alternate_names);

  const countryISO = getCountryISO(item?.place_of_birth);
  const flagEmoji = getFlagEmoji(countryISO);

  return (
    <div className={styles['media-column']}>
      {/* 1. Top Section containing Cím, Aliases and the Profile picture */}
      <div className={styles['top-section']}>
        <div className="entity-detail-page__headline-block">
          <h1 className="entity-detail-page__title">
            {item?.name || item?.title || 'Unknown Person'}
          </h1>
          {candidateAliases.length > 0 && (
            <Text variant="body" color="muted" italic truncate weight="medium" className="u-mt-xs">
              {candidateAliases.join(', ')}
            </Text>
          )}
        </div>

        <div className={styles['image-wrapper']}>
          <EditableMediaCard
            mediaUrl={mediaUrl}
            altText={item?.name || item?.title || 'Detail artwork'}
            onClick={() => {
              const url = getOriginalUrl();
              if (url) setLightboxUrl(url);
            }}
            onEditClick={onMediaCardClick}
            editTitle={t('library.details.changeProfile') || 'Change Profile Picture'}
            type="profile"
            flagEmoji={flagEmoji}
            flagTooltip={item?.place_of_birth}
          />
        </div>
      </div>

      {/* 2. Bottom Section containing 3 clean rows: Row 1 (Actions + Rater), Row 2 (Info Grid), Row 3 (Button) */}
      <div className={styles['bottom-section']}>
        {/* ROW 1: Action buttons + Rater */}
        <div className={styles['rating-block']}>
          <Inline gap="sm" align="center" className="u-w-full">
            <IconButton
              variant="none"
              size="none"
              className={`${styles['sidebar-action']} ${item?.is_favorite ? styles['sidebar-action-fav--active'] : ''}`}
              onClick={handleToggleFavorite}
              title={t('library.details.favorite') || 'Favorite'}
            >
              <Heart size={15} fill={item?.is_favorite ? 'currentColor' : 'none'} />
            </IconButton>
            <IconButton
              variant="none"
              size="none"
              className={`${styles['sidebar-action']} ${item?.is_active ? styles['sidebar-action-act--active'] : ''}`}
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
              className={styles['sidebar-action']}
              onClick={handleOpenReviewModal}
              title={t('library.details.writeReview') || 'Write Review'}
            >
              <PenLine size={15} />
            </IconButton>
          </Inline>

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
            className={styles['rating-container']}
            barClassName={styles['rating-bar']}
            segmentClassName={styles['rating-segment']}
            segmentFillClassName={styles['rating-fill']}
            labelClassName={styles['rating-label']}
            formatLabel={(displayVal) => {
              return displayVal !== null && displayVal !== undefined
                ? `${t('library.details.yourRating') || 'Your Rating'}: ${displayVal.toFixed(1)}`
                : (t('library.details.yourRating') || 'Your Rating');
            }}
          />
        </div>

        {/* ROW 2: Informational grid */}
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
            <div className={styles['info-table']}>
              <div className={styles['info-row']}>
                <div className={styles['info-cell']}>
                  <Text variant="small" color="muted" weight="medium" uppercase letterSpacing="wider">
                    {t('library.details.gender') || 'Gender'}
                  </Text>
                  <Text variant="body" weight="bold" color="primary" truncate>
                    {genderVal || '—'}
                  </Text>
                </div>
                <div className={styles['info-cell']}>
                  <Text variant="small" color="muted" weight="medium" uppercase letterSpacing="wider">
                    {t('library.details.role') || 'Role'}
                  </Text>
                  <Text variant="body" weight="bold" color="primary" truncate>
                    {deptVal}
                  </Text>
                </div>
              </div>
              <div className={styles['info-row']}>
                <div className={styles['info-cell']}>
                  <Text variant="small" color="muted" weight="medium" uppercase letterSpacing="wider">
                    {t('library.details.born') || 'Born'}
                  </Text>
                  <Text variant="body" weight="bold" color="primary" truncate>
                    {item?.birthday || '—'}
                  </Text>
                </div>
                <div className={styles['info-cell']}>
                  <Text variant="small" color="muted" weight="medium" uppercase letterSpacing="wider">
                    {t('library.details.age') || 'Age'}
                  </Text>
                  <Text variant="body" weight="bold" color="primary" truncate>
                    {item?.birthday ? calculateAge(item.birthday) : '—'}
                  </Text>
                </div>
              </div>
              {item?.is_adult && sessionMode === 'nsfw' && (
                <div className={styles['info-row']}>
                  <div className={styles['info-cell']}>
                    <Text variant="small" color="muted" weight="medium" uppercase letterSpacing="wider">
                      {t('library.details.finishes') || 'Finishes'}
                    </Text>
                    <Text variant="body" weight="bold" color="primary" truncate>
                      {item?.finish_count ?? 0}
                    </Text>
                  </div>
                  <div className={styles['info-cell']}>
                    <Text variant="small" color="muted" weight="medium" uppercase letterSpacing="wider">
                      {t('library.details.lastFinish') || 'Last Finish'}
                    </Text>
                    <Text variant="body" weight="bold" color="primary" truncate>
                      {formatLastFinish(item?.last_finish_at)}
                    </Text>
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

        {/* ROW 3: Button */}
        <Button
          variant="secondary-neutral"
          icon={Info}
          onClick={() => setIsDrawerOpen(true)}
          fullWidth
        >
          {t('library.details.needMoreBtn') || 'Biography & Details'}
        </Button>
      </div>

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
