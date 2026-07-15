import { useState } from 'react';
import UtilityButton from '../../ui/UtilityButton';
import Button from '../../ui/Button';
import Tooltip from '../../ui/Tooltip';

import Stack from '../../ui/Stack';
import PosterCard from '../../ui/PosterCard';
import Lightbox from '../../ui/Lightbox';
import EmptyState from '../../ui/EmptyState';
import { ChevronLeft, ChevronRight, FileJson, Info } from '@/ui/icons';
import { API_BASE } from '../../lib/backend';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { useTranslation } from '../../providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import { useFullMetadataQuery } from '../../queries';
import styles from './OrganizerDetailsPanel.module.css';

const resolveOrganizerImageUrl = (path) => resolveMediaImageUrl(path, 'poster', API_BASE);
const SLASH_CHAR = ' / ';

export default function OrganizerDetailsPanel({
  activeImage,
  activeImageIndex,
  activeImages,
  activeRow,
  isDetailsCollapsed,
  onSelectImage,
  onToggleDetails,
  shouldShowDetailsCarousel,
  shouldShowDetailsPoster,
}) {
  const { t } = useTranslation();
  const { openModal, toast } = useUi();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { refetch: refetchFullMetadata } = useFullMetadataQuery(activeRow?.itemId, undefined, {
    enabled: false,
  });

  const activeImageUrl = activeImage ? resolveOrganizerImageUrl(activeImage.path) : undefined;

  const buildInspectPayload = async () => {
    if (!activeRow) {
      return '';
    }

    if (activeRow.rawType === 'extra') {
      return JSON.stringify({
        kind: 'extra',
        summary: {
          id: activeRow.itemId,
          source: activeRow.source,
          target: activeRow.target,
          source_path: activeRow.sourcePath,
          target_path: activeRow.targetPath,
        },
        organizer: activeRow.rawPayload,
      }, null, 2);
    }

    const { data: metadata, error } = await refetchFullMetadata();
    if (error) {
      throw error;
    }

    return JSON.stringify({
      kind: activeRow.rawType,
      summary: {
        id: activeRow.itemId,
        source: activeRow.source,
        target: activeRow.target,
        source_path: activeRow.sourcePath,
        target_path: activeRow.targetPath,
        status: activeRow.rawStatus,
        action: activeRow.rawAction || null,
        has_collision: activeRow.hasCollision,
      },
      organizer: activeRow.rawPayload,
      metadata,
    }, null, 2);
  };

  const handleOpenLightbox = () => {
    if (!activeImageUrl) {
      return;
    }
    setIsLightboxOpen(true);
  };

  const handleSelectRelativeImage = (direction) => {
    if (!onSelectImage || activeImages.length <= 1) {
      return;
    }
    const nextIndex = (activeImageIndex + direction + activeImages.length) % activeImages.length;
    onSelectImage(nextIndex);
  };

  const handleOpenInspect = async () => {
    if (!activeRow) {
      return;
    }

    try {
      const inspectJson = await buildInspectPayload();

      const handleCopyInspect = async () => {
        try {
          await navigator.clipboard.writeText(inspectJson);
          toast(t('organizer.toasts.inspectCopySuccess'), 'success');
        } catch {
          toast(t('organizer.toasts.inspectCopyFailed'), 'danger');
        }
      };

      const handleDownloadInspect = () => {
        const blob = new Blob([inspectJson], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${activeRow.source || 'organizer-item'}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      };

      openModal({
        title: t('organizer.details.inspect.title'),
        description: t('organizer.details.inspect.description'),
        icon: FileJson,
        content: (
          <pre className={styles['organizer-details__inspect-json']}>
            {inspectJson}
          </pre>
        ),
        footer: (
          <>
            <Button type="button" variant="secondary-neutral" onClick={handleCopyInspect}>
              {t('organizer.details.inspect.copy')}
            </Button>
            <Button type="button" variant="secondary-neutral" onClick={handleDownloadInspect}>
              {t('organizer.details.inspect.download')}
            </Button>
          </>
        ),
      });
    } catch (error) {
      toast(error.message || t('organizer.toasts.inspectLoadFailed'), 'danger');
    }
  };

  const renderImageNavigation = () => shouldShowDetailsCarousel ? (
    <>
      <button
        type="button"
        className="ui-carousel-arrow is-left"
        aria-label="Previous image"
        onClick={(event) => {
          event.stopPropagation();
          handleSelectRelativeImage(-1);
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        className="ui-carousel-arrow is-right"
        aria-label="Next image"
        onClick={(event) => {
          event.stopPropagation();
          handleSelectRelativeImage(1);
        }}
      >
        <ChevronRight size={18} />
      </button>
      <div className={styles['organizer-details__image-count']} aria-hidden="true">
        {activeImageIndex + 1}{SLASH_CHAR}{activeImages.length}
      </div>
    </>
  ) : null;
  return (
    <aside className={styles['organizer-details']} aria-label={t('organizer.details.title')}>
      <div className={styles['organizer-details__toggle-row']}>
        <Tooltip content={isDetailsCollapsed ? t('organizer.details.expand') : t('organizer.details.collapse')} side="left">
          <UtilityButton
            type="button"
            className={styles['organizer-details__toggle']}
            size="sm"
            aria-label={isDetailsCollapsed ? t('organizer.details.expand') : t('organizer.details.collapse')}
            onClick={onToggleDetails}
          >
            {isDetailsCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </UtilityButton>
        </Tooltip>
      </div>

      <div className={styles['organizer-details__sticky-container']}>
        <div className={styles['organizer-details__panel']}>
          {activeRow ? (
            <>
              <div className={styles['organizer-details__header']}>
                <span className={styles['organizer-details__title']}>{t('organizer.details.title')}</span>
              </div>
              <div className={styles['organizer-details__content']}>
                {shouldShowDetailsPoster ? (
                  activeRow?.rawType === 'scene' ? (
                    <PosterCard
                      aspect="landscape"
                      className={styles['organizer-details__backdrop-card']}
                      imageUrl={activeImageUrl}
                      onClick={activeImageUrl ? handleOpenLightbox : undefined}
                    >
                      {renderImageNavigation()}
                    </PosterCard>
                  ) : (
                    <PosterCard
                      className={`${styles['organizer-details__poster-card']} ${activeImageUrl ? styles['has-image'] : ''}`}
                      imageUrl={activeImageUrl}
                      placeholderText={!activeImage ? t('organizer.details.posterPlaceholder') : undefined}
                      onClick={activeImageUrl ? handleOpenLightbox : undefined}
                    >
                      {renderImageNavigation()}
                    </PosterCard>
                  )
                ) : null}
                <div className={styles['organizer-details__field']}>
                  <Stack size="sm">
                    <span className={styles['organizer-details__label']}>{t('organizer.details.fields.source')}</span>
                    <Tooltip content={activeRow.sourcePath} side="top">
                      <span className={styles['organizer-details__value']}>{activeRow.sourcePath}</span>
                    </Tooltip>
                  </Stack>
                </div>
                {(() => {
                  const unmatchedStatuses = ['new', 'no_match', 'uncertain', 'multiple', 'error'];
                  const isUnmatchedExtra = activeRow.rawType === 'extra' && activeRow.parentStatus && unmatchedStatuses.includes(activeRow.parentStatus.toLowerCase());
                  const isUnmatchedMedia = activeRow.rawType !== 'extra' && unmatchedStatuses.includes(activeRow.rawStatus);

                  if (isUnmatchedMedia || isUnmatchedExtra) {
                    return null;
                  }

                  return (
                    <div className={styles['organizer-details__field']}>
                      <Stack size="sm">
                        <span className={styles['organizer-details__label']}>{t('organizer.details.fields.target')}</span>
                        <Tooltip content={activeRow.targetPath} side="top">
                          <span className={styles['organizer-details__value']}>{activeRow.targetPath}</span>
                        </Tooltip>
                      </Stack>
                    </div>
                  );
                })()}
                <div className={styles['organizer-details__actions']}>
                  <Button
                    type="button"
                    variant="secondary-neutral"
                    size="sm"
                    className={styles['organizer-details__inspect-button']}
                    onClick={handleOpenInspect}
                  >
                    {t('organizer.details.inspect.open')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              variant="panel"
              title={t('organizer.details.title')}
              description={t('organizer.details.empty')}
              icon={Info}
              className={styles['organizer-details__empty-state']}
              hasBorder={false}
              animateIcon={true}
            />
          )}
        </div>
      </div>
      {isLightboxOpen && (
        <Lightbox
          imageUrl={activeImageUrl}
          onClose={() => setIsLightboxOpen(false)}
          t={t}
        />
      )}
    </aside>
  );
}
