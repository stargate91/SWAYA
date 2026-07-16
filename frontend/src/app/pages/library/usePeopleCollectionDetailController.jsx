import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/ui/Button';
import { useTranslation } from '@/providers/LanguageContext';
import { useUpdatePersonStatusMutation } from '@/queries';
import { useOverrideBackdropMutation, useUploadBackdropMutation } from '@/queries';
import {
  useLibraryCollectionDetailQuery,
  usePersonDetailQuery,
} from '@/queries/metadataQueries';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { API_BASE } from '@/lib/backend';
import { resolveDetailsImageUrl } from './utils/detailUtils';
import {
  buildPersonExternalLinks,
  resolveSocialLinks,
} from './utils/externalLinksUtils';
import { getPosterImagePath, getProfileImagePath } from '@/lib/imageUrls';
import UniversalImagePicker from './components/UniversalImagePicker';
import ReviewModalContent from './components/detail/modals/ReviewModalContent';

export default function usePeopleCollectionDetailController({
  id,
  isPeople,
  t,
  openModal,
  closeModal,
  toast,
}) {
  const { locale } = useTranslation();
  const metadataLanguage = locale === 'en' ? 'en-US' : locale;
  const [isActivateHovered, setIsActivateHovered] = useState(false);

  const personQuery = usePersonDetailQuery(id, { enabled: isPeople && Boolean(id) });
  const collectionQuery = useLibraryCollectionDetailQuery(id, {
    enabled: !isPeople && Boolean(id),
    language: metadataLanguage,
  });
  const updatePersonStatusMutation = useUpdatePersonStatusMutation();
  const overrideBackdropMutation = useOverrideBackdropMutation();
  const uploadBackdropMutation = useUploadBackdropMutation();

  const item = isPeople ? personQuery.data : collectionQuery.data;
  const isLoading = isPeople ? personQuery.isLoading : collectionQuery.isLoading;
  const queryError = isPeople ? personQuery.error : collectionQuery.error;
  const hasError = isPeople ? personQuery.isError : collectionQuery.isError;

  const navigate = useNavigate();

  const { data: settings } = useSettingsQuery();

  useEffect(() => {
    if (!isLoading && item && item.is_adult && !settings?.include_adult) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, item, settings?.include_adult, navigate]);

  const overviewTitle = isPeople
    ? (t('library.details.biographyTitle') || 'Biography')
    : '';
  const overviewText = item?.biography || item?.overview || '';
  const overviewEmptyText = t('library.details.noOverviewAvailable') || 'No overview available.';
  const externalLinks = useMemo(
    () => (isPeople ? buildPersonExternalLinks(item, t) : []),
    [isPeople, item, t]
  );
  const profileLinks = useMemo(
    () => [],
    []
  );
  const extraLinks = useMemo(
    () => {
      if (!isPeople) return [];
      const profileLinkKeys = profileLinks.map((pl) => pl.key);
      return externalLinks.filter((link) => !profileLinkKeys.includes(link.key));
    },
    [isPeople, externalLinks, profileLinks]
  );
  const socialLinks = useMemo(() => {
    if (!isPeople || !item) return [];
    const uniqueLinks = resolveSocialLinks(externalLinks);
    console.log('uniqueLinks keys sorted LTR:', uniqueLinks.map(l => l.key));
    return uniqueLinks;
  }, [isPeople, externalLinks, item]);
  const backdropUrl = resolveDetailsImageUrl(item?.backdrop_path, API_BASE, 'backdrop');
  const mediaUrl = resolveDetailsImageUrl(
    isPeople ? getProfileImagePath(item) : getPosterImagePath(item),
    API_BASE,
    isPeople ? 'person' : 'poster'
  );
  const canChoosePeopleBackdrop = isPeople;
  const canChooseCollectionBackdrop = Boolean(
    item?.collection_backdrops?.some((bd) => !bd?.iso_639_1 || bd.iso_639_1 === 'null' || bd.iso_639_1 === '')
  );

  const handleToggleFavorite = () => {
    if (!isPeople || !item?.id) {
      return;
    }
    updatePersonStatusMutation.mutate({
      personId: item.id,
      routeId: id,
      payload: {
        is_favorite: !item?.is_favorite,
      },
    });
  };

  const handleToggleActive = () => {
    if (!isPeople || !item?.id) {
      return;
    }
    updatePersonStatusMutation.mutate({
      personId: item.id,
      routeId: id,
      payload: {
        is_active: !item?.is_active,
      },
    });
  };

  const handleOpenReviewModal = () => {
    if (!isPeople || !item?.id) {
      return;
    }

    openModal({
      title: t('library.details.writeReview') || 'Write Review',
      content: (
        <ReviewModalContent
          initialComment={item?.user_comment}
          onSave={(newComment) => {
            updatePersonStatusMutation.mutate({
              personId: item.id,
              routeId: id,
              payload: {
                user_comment: newComment || null,
              },
            });
            closeModal();
          }}
          t={t}
        />
      ),
      footer: (
        <div className="modal-footer-row">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.close') || 'Close'}
          </Button>
          <Button variant="primary" type="submit" form="review-modal-form">
            {t('common.save') || 'Save'}
          </Button>
        </div>
      ),
    });
  };

  return {
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
    overrideBackdropMutation,
    uploadBackdropMutation,
  };
}
