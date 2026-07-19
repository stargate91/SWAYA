import { useState, useEffect, useMemo, useRef } from 'react';
import { useSettingsQuery } from '@/queries';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import {
  useLinkPersonSourceMutation,
  useUnlinkPersonSourceMutation,
  useSetPrimaryPersonSourceMutation,
  useDeletePersonMutation
} from '@/queries';
import { usePersonDetailQuery } from '@/queries/metadataQueries';
import api from '@/lib/api';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import IconButton from '@/ui/IconButton';
import Tooltip from '@/ui/Tooltip';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import Spinner from '@/ui/Spinner';
import { Search, Link as LinkIcon, User, Trash2, GitFork, Star, ArrowLeft, AlertTriangle } from '@/ui/icons';
import Modal from '@/ui/Modal';
import Grid from '@/ui/Grid';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import styles from './PerformerLinkingTab.module.css';

const FemaleSilhouette = () => (
  <div className={`${styles['gender-silhouette']} ${styles['gender-silhouette--mask']} ${styles['gender-silhouette--female']}`} />
);

const MaleSilhouette = () => (
  <div className={`${styles['gender-silhouette']} ${styles['gender-silhouette--mask']} ${styles['gender-silhouette--male']}`} />
);

const OtherSilhouette = () => (
  <svg viewBox="0 0 24 24" className={`${styles['gender-silhouette']} ${styles['gender-silhouette--other']}`} fill="currentColor">
    <circle cx="12" cy="8" r="4" />
    <path d="M12 14c-6.1 0-10 4-10 8h20c0-4-3.9-8-10-8zm-7.9 6c.9-2.5 4-4 7.9-4s7 1.5 7.9 4H4.1z" />
  </svg>
);

const SOURCE_BUCKETS = [
  { key: 'tmdb', label: 'TMDb', dbName: 'tmdb' },
  { key: 'stashdb', label: 'StashDB', dbName: 'stashdb' },
  { key: 'fansdb', label: 'FansDB', dbName: 'fansdb' },
  { key: 'theporndb', label: 'THEPornDB', dbName: 'porndb' },
];

export default function PerformerLinkingTab({ personId, defaultQuery = '', person: initialPerson }) {
  const { data: fetchedPerson } = usePersonDetailQuery(personId);
  const person = fetchedPerson || initialPerson;
  const { data: settings } = useSettingsQuery();
  const { t } = useTranslation();
  const { toast } = useUi();
  const [activeSearchSource, setActiveSearchSource] = useState(null);
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState([]);

  const filteredResults = useMemo(() => {
    if (!person?.is_adult || !settings?.adult_gender_preference || settings.adult_gender_preference === 'all') {
      return results;
    }
    const pref = settings.adult_gender_preference;
    return results.filter((item) => {
      const g = item.gender;
      if (pref === 'female') return g === 1 || g === '1';
      if (pref === 'male') return g === 2 || g === '2';
      return true;
    });
  }, [results, person?.is_adult, settings?.adult_gender_preference]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkingSource, setLinkingSource] = useState(null);
  const [oldProfileUrl, setOldProfileUrl] = useState(null);
  const [isWaitingForImage, setIsWaitingForImage] = useState(false);
  const showSuccessToastPendingRef = useRef(false);
  const safetyTimeoutRef = useRef(null);

  const currentProfileUrl = person?.profile_path ? resolveMediaImageUrl(person.profile_path, 'personThumb') : null;

  useEffect(() => {
    if (!isWaitingForImage || !linkingSource) return;

    // Check if the target source has linked successfully in the updated person details
    const targetDbName = SOURCE_BUCKETS.find(b => b.key === linkingSource)?.dbName;
    const linkedInfo = person?.external_links?.find(x => x.provider === targetDbName);

    if (linkedInfo) {
      const handleFinish = () => {
        setLinkingSource(null);
        setIsWaitingForImage(false);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        if (showSuccessToastPendingRef.current) {
          toast(t('library.details.sourceLinked') || 'Source linked successfully!', 'success');
          showSuccessToastPendingRef.current = false;
        }
      };

      if (currentProfileUrl !== oldProfileUrl && currentProfileUrl) {
        const img = new Image();
        img.src = currentProfileUrl;
        img.onload = handleFinish;
        img.onerror = handleFinish;
      } else {
        handleFinish();
      }
    }
  }, [person, currentProfileUrl, oldProfileUrl, isWaitingForImage, linkingSource, t, toast]);

  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  const navigate = useNavigate();
  const linkMutation = useLinkPersonSourceMutation();
  const unlinkMutation = useUnlinkPersonSourceMutation();
  const setPrimaryMutation = useSetPrimaryPersonSourceMutation();
  const deleteMutation = useDeletePersonMutation();

  const handleSetPrimary = async (sourceKey) => {
    try {
      await setPrimaryMutation.mutateAsync({
        personId,
        source: sourceKey,
      });
      toast(t('library.details.primarySourceSet') || 'Primary source updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.primarySourceSetFailed') || 'Failed to set primary source', 'danger');
    }
  };

  const getLinkedInfo = (bucket) => {
    if (!person) return null;
    if (person.external_links && person.external_links.length > 0) {
      const link = person.external_links.find(
        (l) => l.provider === bucket.dbName || l.provider === bucket.key
      );
      if (link) return link;
    }
    const extIds = person.external_ids || {};
    const idValue = extIds[bucket.key] || extIds[bucket.dbName] || extIds[`${bucket.key}_id`] || extIds[`${bucket.dbName}_id`];
    if (idValue) {
      return {
        provider: bucket.dbName,
        external_id: idValue,
        profile_url: null
      };
    }
    return null;
  };

  const renderSilhouette = (gender) => {
    if (gender === 1 || gender === '1') return <FemaleSilhouette />;
    if (gender === 2 || gender === '2') return <MaleSilhouette />;
    return <OtherSilhouette />;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || !activeSearchSource) return;

    setIsSearching(true);
    setError('');
    try {
      const res = await api.people.searchTmdb(query.trim(), { adultOnly: true, source: activeSearchSource });
      setResults(res || []);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (defaultQuery && activeSearchSource) {
      const performSearch = async () => {
        setIsSearching(true);
        setError('');
        try {
          const res = await api.people.searchTmdb(defaultQuery.trim(), { adultOnly: true, source: activeSearchSource });
          setResults(res || []);
          setHasSearched(true);
        } catch (err) {
          setError(err.message || 'Search failed');
        } finally {
          setIsSearching(false);
        }
      };
      performSearch();
    }
  }, [defaultQuery, activeSearchSource]);

  const handleLink = async (item) => {
    let cleanId = item.id;
    if (typeof cleanId === 'string' && cleanId.includes(':')) {
      cleanId = cleanId.split(':')[1] || cleanId;
    }
    const sourceKey = activeSearchSource;
    setLinkingSource(sourceKey);
    setOldProfileUrl(currentProfileUrl);
    setIsWaitingForImage(true);
    
    // Close search results view immediately so the user sees the card pulsing in the grid
    setActiveSearchSource(null);
    setResults([]);
    setHasSearched(false);

    try {
      await linkMutation.mutateAsync({
        personId,
        source: sourceKey,
        externalId: String(cleanId),
        overrides: {},
        profileUrl: item.profile_path || item.poster_path || null,
      });
      showSuccessToastPendingRef.current = true;
      
      // Safety timeout: stop pulsing after 8 seconds if image fails to change or load
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = setTimeout(() => {
        setLinkingSource(null);
        setIsWaitingForImage(false);
        if (showSuccessToastPendingRef.current) {
          toast(t('library.details.sourceLinked') || 'Source linked successfully!', 'success');
          showSuccessToastPendingRef.current = false;
        }
      }, 8000);
    } catch (err) {
      toast(err.message || t('library.performerEdit.linking.link_source_failed') || 'Failed to link source', 'danger');
      setLinkingSource(null);
      setIsWaitingForImage(false);
      showSuccessToastPendingRef.current = false;
    }
  };

  const executeDelete = () => {
    deleteMutation.mutate(personId, {
      onSuccess: () => {
        toast(t('library.performerEdit.linking.performer_deleted') || 'Performer removed from database successfully.', 'success');
        navigate('/library', { replace: true });
      },
      onError: (err) => {
        toast(err.message || t('library.performerEdit.linking.delete_performer_failed') || 'Failed to delete performer', 'danger');
      },
      onSettled: () => {
        setShowDeleteConfirm(false);
      }
    });
  };

  const handleUnlink = (sourceKey, action) => {
    const linkedSourcesCount = SOURCE_BUCKETS.filter(bucket => !!getLinkedInfo(bucket)).length;
    if (action === 'remove' && linkedSourcesCount === 1) {
      setShowDeleteConfirm(true);
      return;
    }

    unlinkMutation.mutate(
      { personId, source: sourceKey, action },
      {
        onSuccess: () => {
          toast(
            t('library.details.unlinkSuccess', { source: sourceKey }) || `Successfully unlinked from ${sourceKey}.`,
            'success'
          );
        },
        onError: (err) => {
          toast(
            err.message || t('library.details.unlinkSourceFailed') || 'Failed to unlink source',
            'danger'
          );
        },
      }
    );
  };

  if (activeSearchSource) {
    return (
      <Stack gap="xl" className="u-w-full">
        <Inline gap="lg" align="center">
          <Button
            variant="secondary-neutral"
            leftIcon={<ArrowLeft size={14} />}
            animateIcon
            onClick={() => {
              setActiveSearchSource(null);
              setResults([]);
              setHasSearched(false);
            }}
          >
            {t('library.performerEdit.backToSources') || 'Back to Sources'}
          </Button>
          <Text variant="title" weight="semibold">
            {t('common.search') || 'Search'} {SOURCE_BUCKETS.find((b) => b.key === activeSearchSource)?.label}
          </Text>
        </Inline>

        <Inline as="form" onSubmit={handleSearch} gap="md" align="center" className={styles['search-form']}>
          <div className="u-flex-1">
            <Input
              type="text"
              placeholder={t('library.addPeople.adultTmdbSearchPlaceholder') || 'Search performer...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <Tooltip content={isSearching ? (t('library.performerEdit.searching') || 'Searching...') : (t('common.search') || 'Search')} side="top">
            <IconButton
              type="submit"
              variant="secondary"
              disabled={isSearching}
            >
              <Search size={16} />
            </IconButton>
          </Tooltip>
        </Inline>

        <div>
          {isSearching ? (
            <Stack align="center" justify="center" className="u-py-sm">
              <Spinner size="md" />
            </Stack>
          ) : error ? (
            <div className={`${styles['placeholder-board']} ${styles['placeholder-board--error']}`}>{error}</div>
          ) : filteredResults.length > 0 ? (
            <Grid variant="auto-poster">
              {filteredResults.map((item) => {
                const rawProfileUrl = item.profile_path || item.poster_path;
                const profileUrl = rawProfileUrl ? resolveMediaImageUrl(rawProfileUrl, 'personThumb') : null;
                return (
                  <div key={item.id} className={styles['result-card']}>
                    <div className={styles['result-image-wrapper']}>
                      {profileUrl ? (
                        <img src={profileUrl} alt={item.name} className={styles['result-img']} />
                      ) : (
                        <div className={styles['result-avatar-placeholder']}>
                          {renderSilhouette(item.gender !== undefined ? item.gender : person?.gender)}
                        </div>
                      )}
                    </div>
                    <div className={styles['result-content']}>
                      <Stack gap="2xs">
                        <Text variant="small" weight="semibold" clamp={2} color="primary" title={item.name}>
                          {item.name}
                        </Text>
                        {item.disambiguation && (
                          <Text variant="2xs" color="muted" truncate title={item.disambiguation}>
                            {item.disambiguation}
                          </Text>
                        )}
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLink(item)}
                        disabled={linkMutation.isPending}
                        icon={LinkIcon}
                        fullWidth
                      >
                        {t('library.performerEdit.link') || 'Link'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Grid>
          ) : hasSearched ? (
            <div className={styles['placeholder-board']}>{t('library.performerEdit.noResultsMatch') || 'No results match the query. Try a different name.'}</div>
          ) : (
            <div className={styles['placeholder-board']}>
              {t('library.performerEdit.typeANameHint') || 'Type a name above and press search to locate performer data.'}
            </div>
          )}
        </div>
      </Stack>
    );
  }

  return (
    <Stack gap="md" className="u-w-full">
      <Grid variant="scene">
        {SOURCE_BUCKETS.map((bucket) => {
          const linkedInfo = getLinkedInfo(bucket);
          const isLinked = !!linkedInfo;
          const isPrimary = person?.primary_provider === bucket.dbName;
          const profileImg = isLinked ? (linkedInfo.profile_url ? resolveMediaImageUrl(linkedInfo.profile_url, 'personThumb') : (person.profile_path ? resolveMediaImageUrl(person.profile_path, 'personThumb') : null)) : null;
          const isLinking = linkingSource === bucket.key;

          const cardClass = `
            ${styles['linker-card']}
            ${styles[`linker-card--${bucket.key}`]}
            ${isLinked ? styles['linker-card--linked'] : styles['linker-card--unlinked']}
            ${isPrimary ? styles['linker-card--primary'] : ''}
            ${isLinking ? styles['linker-card--linking'] : ''}
          `.trim().replace(/\s+/g, ' ');

          return (
            <div key={bucket.key} className={cardClass}>
              <div className={styles['image-wrapper']}>
                {isLinking ? (
                  <div className={styles['silhouette-container']}>
                    {renderSilhouette(person?.gender)}
                  </div>
                ) : isLinked ? (
                  profileImg ? (
                    <img src={profileImg} alt={person.name} className={styles['card-img']} />
                  ) : (
                    <div className={styles['avatar-placeholder']}>
                      <User size={32} />
                    </div>
                  )
                ) : (
                  <div className={styles['silhouette-container']}>
                    {renderSilhouette(person?.gender)}
                  </div>
                )}
                <div className={styles['card-badge']}>{bucket.label}</div>
              </div>

              <div className={styles['card-content']}>
                <Stack gap="2xs">
                  {isLinking ? (
                    <div className={styles['linking-msg']}>
                      <Spinner label={t('library.performerEdit.linkingEnriching') || 'Linking & Enriching...'} />
                    </div>
                  ) : isLinked ? (
                    <>
                      <Text variant="small" weight="semibold" truncate color="primary">
                        {person.name}
                      </Text>
                      <Text variant="2xs" color="muted" title={linkedInfo.external_id}>
                        {t('library.performerEdit.idLabel') || 'ID:'} {linkedInfo.external_id}
                      </Text>
                    </>
                  ) : (
                    <Text variant="small" color="muted" italic>
                      {t('library.performerEdit.notConnected') || 'Not Connected'}
                    </Text>
                  )}
                </Stack>

                <Stack gap="sm">
                  {isLinking ? null : isLinked ? (
                    <Stack gap="sm">
                      <Grid variant="split">
                        <Tooltip content="Separate profile connection" side="top">
                          <Button
                            variant="secondary-neutral"
                            size="sm"
                            onClick={() => handleUnlink(bucket.key, 'split')}
                            disabled={unlinkMutation.isPending}
                            icon={GitFork}
                            fullWidth
                          >
                            {t('library.performerEdit.split') || 'Split'}
                          </Button>
                        </Tooltip>
                        <Tooltip content="Remove profile link" side="top">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleUnlink(bucket.key, 'remove')}
                            disabled={unlinkMutation.isPending}
                            icon={Trash2}
                            fullWidth
                          >
                            {t('common.remove') || 'Remove'}
                          </Button>
                        </Tooltip>
                      </Grid>

                      <Button
                        variant={isPrimary ? "primary" : "secondary-neutral"}
                        size="sm"
                        onClick={() => handleSetPrimary(isPrimary ? "none" : bucket.key)}
                        disabled={setPrimaryMutation.isPending}
                        icon={Star}
                        fullWidth
                      >
                        {isPrimary ? (t('library.performerEdit.primarySource') || "Primary Source") : (t('library.performerEdit.setPrimary') || "Set Primary")}
                      </Button>
                    </Stack>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActiveSearchSource(bucket.key);
                        setQuery(person?.name || '');
                      }}
                      icon={Search}
                      fullWidth
                    >
                      {t('library.performerEdit.connect') || 'Connect'}
                    </Button>
                  )}
                </Stack>
              </div>
            </div>
          );
        })}
      </Grid>
      <Modal
        open={showDeleteConfirm}
        title={t('library.details.deletePerformerTitle') || 'Delete Performer?'}
        onClose={() => setShowDeleteConfirm(false)}
        variant="danger"
        icon={AlertTriangle}
        footer={
          <Inline gap="md" align="center" justify="end">
            <Button
              variant="secondary-neutral"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteMutation.isPending}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="danger"
              onClick={executeDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (t('library.details.deleting') || 'Deleting...') : (t('library.details.deletePerformerConfirmBtn') || 'Delete Performer')}
            </Button>
          </Inline>
        }
      >
        <Text as="p" variant="body" color="secondary">
          {t('library.details.deletePerformerWarning') || 'Are you sure you want to permanently delete this performer? All manually entered attributes, custom biographies, overrides, and ratings will be lost.'}
        </Text>
      </Modal>
    </Stack>
  );
}

