import { useState, useMemo, useEffect } from 'react';
import { ArrowUp, ArrowDown, GripVertical } from '@/ui/icons';
import Dropdown from '../../../ui/Dropdown';
import Input from '../../../ui/Input';
import styles from './OrganizerOverrideModalContent.module.css';
import SelectableCard from '../../../ui/SelectableCard';
import IconButton from '../../../ui/IconButton';
import Tooltip from '../../../ui/Tooltip';
import Checkbox from '../../../ui/Checkbox';
import Radio from '../../../ui/Radio';
import { useTranslation } from '../../../providers/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkUpdateMediaMutation, getOrganizerQueryKey } from '../../../queries';
import BulkOverrideFieldRow from './BulkOverrideFieldRow';
import Inline from '../../../ui/Inline';


import {
  useTranslatedOverrideOptions,
} from './overrideConstants';

const DOT = '.';

export default function OrganizerBulkOverrideModalContent({ rows, onClose, toast, scanMode, sessionMode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isExtra = rows[0]?.rawType === 'extra';
  const category = isExtra ? (rows[0]?.rawPayload?.category || 'video') : 'video';
  const initialMainType = isExtra
    ? (category === 'video' ? 'bonus' : 'extra')
    : rows[0]?.rawType;

  const [mainType, setMainType] = useState(initialMainType);
  const [applyMainType, setApplyMainType] = useState(false);

  const isScenesMode = useMemo(() =>
    rows.some((r) => r.rawPayload?.scan_mode === 'scenes' || r.rawPayload?.parent_scan_mode === 'scenes'),
    [rows]
  );

  const {
    translatedLanguageOptions,
    translatedSubcategoriesByCategory,
    translatedSourceOptions,
    translatedEditionOptions,
    translatedAudioTypeOptions,
    translatedMainTypeOptions,
  } = useTranslatedOverrideOptions(t, isScenesMode);

  const hideLanguage = useMemo(() => {
    const hasAdultMatch = rows.some((r) => {
      const activeMatch = r.rawPayload?.matches?.find((m) => m.is_active) || r.rawPayload?.matches?.[0];
      return activeMatch && ['porndb', 'stashdb', 'fansdb'].includes(activeMatch.provider);
    });
    return isScenesMode || hasAdultMatch;
  }, [rows, isScenesMode]);

  const subcategoryList = translatedSubcategoriesByCategory[mainType === 'bonus' ? 'video' : category] || [];

  // Get parent candidates (movies + tv) from cache
  const organizer = queryClient.getQueryData(getOrganizerQueryKey(scanMode, sessionMode)) || {};
  const movies = organizer.movies || [];
  const tv = organizer.tv || [];

  const isParentCandidateAdult = (item) => {
    const itemScanMode = item.scan_mode || '';
    return item.matches?.some((m) => m.is_adult)
      || String(item.type).toLowerCase() === 'scene'
      || itemScanMode === 'porndb_movie'
      || itemScanMode === 'scenes';
  };

  const firstRow = rows[0] || {};
  const isExtraAdult = sessionMode === 'nsfw';

  const isExtraScene = isExtra
    ? (firstRow.parentType === 'scene' || (firstRow.rawPayload?.parent_scan_mode === 'scenes'))
    : (String(firstRow.type || firstRow.rawType).toLowerCase() === 'scene' || firstRow.scan_mode === 'scenes' || firstRow.rawPayload?.scan_mode === 'scenes');

  const filteredMoviesAndTv = [...movies, ...tv].filter((item) => {
    // 0. Cannot select any of the edited items as parent
    if (rows.some((r) => r.itemId === item.id)) return false;

    const isParentAdult = isParentCandidateAdult(item);
    // 1. Must match SFW/NSFW
    if (isExtraAdult !== isParentAdult) return false;

    // 2. Within NSFW, scenes must go to scenes, and adult movies/tv to adult movies/tv
    if (isExtraAdult) {
      const isParentScene = String(item.type).toLowerCase() === 'scene' || item.scan_mode === 'scenes';
      if (isExtraScene !== isParentScene) return false;
    }

    return true;
  });

  const parentCandidates = filteredMoviesAndTv.map((item) => ({
    value: item.id,
    label: item.filename || item.current_path || `ID: ${item.id}`,
  }));

  // State for properties to apply
  const [applyTargetLanguage, setApplyTargetLanguage] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');

  const [applySource, setApplySource] = useState(false);
  const [source, setSource] = useState('none');

  const [applyEdition, setApplyEdition] = useState(false);
  const [edition, setEdition] = useState('none');

  const [applyAudioType, setApplyAudioType] = useState(false);
  const [audioType, setAudioType] = useState('none');

  const [applySeasonNum, setApplySeasonNum] = useState(false);
  const [seasonNum, setSeasonNum] = useState('');

  const [applyParentId, setApplyParentId] = useState(false);
  const [parentId, setParentId] = useState(parentCandidates[0]?.value || '');

  const [applySubcategory, setApplySubcategory] = useState(false);
  const [subcategory, setSubcategory] = useState('other');

  const [applyLanguage, setApplyLanguage] = useState(false);
  const [language, setLanguage] = useState('en');

  // Auto-numbering and ordering states (for episodes)
  const [orderedItems, setOrderedItems] = useState(() => [...rows]);
  const [applyAutoNumbering, setApplyAutoNumbering] = useState(false);
  const [startEpisodeNum, setStartEpisodeNum] = useState('1');
  const [matchAction, setMatchAction] = useState('keep');

  const hasMatched = useMemo(() => rows.some((row) => row.rawStatus === 'matched'), [rows]);
  const isEpisode = mainType === 'episode';
  const isModifyingSeasonOrEpisode = applySeasonNum || applyAutoNumbering;
  const showMatchActionSelector = hasMatched && initialMainType === 'episode' && isEpisode && isModifyingSeasonOrEpisode;

  const bulkUpdateMutation = useBulkUpdateMediaMutation();

  useEffect(() => {
    const modalElement = document.querySelector('.ui-modal');
    if (modalElement) {
      if (mainType === 'episode' && applyAutoNumbering) {
        modalElement.classList.add('has-side-panel');
      } else {
        modalElement.classList.remove('has-side-panel');
      }
    }
  }, [mainType, applyAutoNumbering]);

  // HTML5 Drag and Drop handlers
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newList = [...orderedItems];
    const draggedItem = newList[draggedIndex];
    newList.splice(draggedIndex, 1);
    newList.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setOrderedItems(newList);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newList = [...orderedItems];
    const item = newList[index];
    newList.splice(index, 1);
    newList.splice(index - 1, 0, item);
    setOrderedItems(newList);
  };

  const handleMoveDown = (index) => {
    if (index === orderedItems.length - 1) return;
    const newList = [...orderedItems];
    const item = newList[index];
    newList.splice(index, 1);
    newList.splice(index + 1, 0, item);
    setOrderedItems(newList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (initialMainType !== 'episode' && mainType === 'episode') {
      if (!applySeasonNum || !String(seasonNum ?? '').trim()) {
        toast(t('organizer.toasts.bulkOverrideSeasonRequired'), 'danger');
        return;
      }
      if (!applyAutoNumbering || !String(startEpisodeNum ?? '').trim()) {
        toast(t('organizer.toasts.bulkOverrideAutoNumberRequired'), 'danger');
        return;
      }
    }

    if (applyMainType && mainType === 'bonus') {
      if (!applyParentId || !parentId) {
        toast(t('organizer.toasts.bulkOverrideParentRequired') || 'A parent item must be selected when converting to bonus videos.', 'danger');
        return;
      }
    }

    if (applyParentId && (mainType === 'bonus' || mainType === 'extra') && rows.some((r) => String(r.itemId) === String(parentId))) {
      toast(t('organizer.toasts.selfParentError') || 'An item cannot be its own parent.', 'danger');
      return;
    }

    const payload = {
      ids: rows.map((r) => r.itemId),
      type: isExtra ? 'extra' : 'media',
    };

    if (showMatchActionSelector && matchAction === 'reset') {
      payload.reset_match = true;
    }

    if (applyMainType) {
      payload.main_type = mainType;
    }

    if (mainType === 'bonus' || mainType === 'extra') {
      if (applyParentId) payload.parent_id = parentId;
      if (category !== 'metadata') {
        if (applySubcategory) payload.subtype = subcategory;
      }
      if (mainType === 'extra') {
        if (category === 'subtitle' || category === 'audio') {
          if (applyLanguage) payload.language = language;
        }
      }
    } else {
      if (applyTargetLanguage) payload.custom_language = targetLanguage;
      if (applyAudioType) payload.custom_audio_type = audioType;
      if (mainType === 'movie' || mainType === 'scene') {
        if (applySource) payload.custom_source = source;
        if (applyEdition) payload.custom_edition = edition;
      } else if (mainType === 'episode') {
        if (applySeasonNum) payload.season = seasonNum;
      }
    }

    // Prepare item-specific updates (e.g. calculated episode numbers)
    const itemUpdates = [];
    if (mainType === 'episode' && applyAutoNumbering) {
      const startNum = parseInt(startEpisodeNum, 10);
      if (Number.isNaN(startNum)) {
        toast(t('organizer.toasts.bulkOverrideStartEpisodeInvalid'), 'danger');
        return;
      }
      orderedItems.forEach((item, index) => {
        itemUpdates.push({
          id: item.itemId,
          updates: {
            episode: String(startNum + index),
          },
        });
      });
    }

    if (itemUpdates.length > 0) {
      payload.item_updates = itemUpdates;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        ...payload,
        scanMode,
        sessionMode,
      });
      toast(t('organizer.toasts.bulkOverrideSuccess'), 'success');
      onClose();
    } catch (err) {
      toast(err.message || t('organizer.toasts.bulkOverrideSaveFailed'), 'danger');
    }
  };



  const isSidebarActive = mainType === 'episode' && applyAutoNumbering;

  return (
    <form id="organizer-bulk-override-form" className={isSidebarActive ? styles['bulk-override-layout'] : styles['organizer-override-modal']} onSubmit={handleSubmit}>
      <div className={isSidebarActive ? styles['bulk-override-layout__form'] : 'contents'}>
        {/* Main Category override (only for movie, episode, bonus) */}
        {(initialMainType === 'movie' || initialMainType === 'episode' || initialMainType === 'bonus' || initialMainType === 'scene') && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.mainCategory')}
            checked={applyMainType}
            onChange={setApplyMainType}
          >
            <Dropdown
              value={mainType}
              onChange={(e) => setMainType(e.target.value)}
              options={translatedMainTypeOptions}
              disabled={!applyMainType}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Target Language override (for Movies & Episodes) */}
        {!hideLanguage && mainType !== 'extra' && mainType !== 'bonus' && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.targetLanguage')}
            checked={applyTargetLanguage}
            onChange={setApplyTargetLanguage}
          >
            <Dropdown
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              options={translatedLanguageOptions}
              disabled={!applyTargetLanguage}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Source override (for Movies & Scenes) */}
        {(mainType === 'movie' || mainType === 'scene') && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.source')}
            checked={applySource}
            onChange={setApplySource}
          >
            <Dropdown
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={translatedSourceOptions}
              disabled={!applySource}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Edition override (for Movies & Scenes) */}
        {(mainType === 'movie' || mainType === 'scene') && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.edition')}
            checked={applyEdition}
            onChange={setApplyEdition}
          >
            <Dropdown
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              options={translatedEditionOptions}
              disabled={!applyEdition}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Audio Type override (for Movies, Episodes, Scenes) */}
        {mainType !== 'extra' && mainType !== 'bonus' && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.audioType')}
            checked={applyAudioType}
            onChange={setApplyAudioType}
          >
            <Dropdown
              value={audioType}
              onChange={(e) => setAudioType(e.target.value)}
              options={translatedAudioTypeOptions}
              disabled={!applyAudioType}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Season Number override (for Episodes) */}
        {mainType === 'episode' && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.seasonNumber')}
            checked={applySeasonNum}
            onChange={setApplySeasonNum}
          >
            <Input
              type="text"
              value={seasonNum}
              onChange={(e) => setSeasonNum(e.target.value)}
              placeholder={t('organizer.overrideModal.placeholders.seasonNumber')}
              disabled={!applySeasonNum}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Subcategory override (for Extras & Bonus videos) */}
        {(mainType === 'extra' || mainType === 'bonus') && category !== 'metadata' && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.extraSubcategory')}
            checked={applySubcategory}
            onChange={setApplySubcategory}
          >
            <Dropdown
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              options={subcategoryList}
              disabled={!applySubcategory}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Parent ID override (for Extras & Bonus videos) */}
        {(mainType === 'bonus' || mainType === 'extra') && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.parentMovieOrEpisode')}
            checked={applyParentId}
            onChange={setApplyParentId}
          >
            <Dropdown
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              options={parentCandidates}
              disabled={!applyParentId}
              searchable={true}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Language override (for Subtitle & Audio extras) */}
        {mainType === 'extra' && (category === 'subtitle' || category === 'audio') && (
          <BulkOverrideFieldRow
            label={t('organizer.overrideModal.labels.language')}
            checked={applyLanguage}
            onChange={setApplyLanguage}
          >
            <Dropdown
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={translatedLanguageOptions}
              disabled={!applyLanguage}
            />
          </BulkOverrideFieldRow>
        )}

        {/* Auto-numbering and sorting panel checkbox (Only for Episodes) */}
        {mainType === 'episode' && (
          <div className={`${styles['organizer-override-bulk-episodes']}${isSidebarActive ? ' ' + styles['organizer-override-bulk-episodes--sidebar-active'] : ''}`}>
            <Checkbox
              checked={applyAutoNumbering}
              onChange={(e) => setApplyAutoNumbering(e.target.checked)}
              className={`${styles['organizer-override-field__checkbox-label']} ${styles['organizer-override-bulk-episodes__header-check']}`}
            >
              <span className={`${styles['organizer-override-field__label-text']} font-semibold`}>{t('organizer.overrideModal.labels.autoNumberCheck')}</span>
            </Checkbox>
          </div>
        )}

        {showMatchActionSelector && (
          <div className={`${styles['organizer-override-modal__section']} ${styles['organizer-override-modal__section--match-actions']}`}>
            <h4 className={`${styles['organizer-override-modal__section-title']} ${styles['organizer-override-modal__section-title--compact']}`}>
              {t('organizer.overrideModal.matchAction.title') || 'Match Action'}
            </h4>
            <p className={`${styles['organizer-override-field__label-text']} ${styles['organizer-override-field__label-text--support']}`}>
              {t('organizer.overrideModal.matchAction.description') || 'Choose what to do with the current tv match since season or episode changed:'}
            </p>

            <div className={styles['organizer-match-action-grid']}>
              <SelectableCard
                as="div"
                className={styles['match-action-option']}
                selected={matchAction === 'keep'}
                onClick={() => setMatchAction('keep')}
              >
                <Radio
                  name="bulkMatchAction"
                  checked={matchAction === 'keep'}
                  onChange={() => setMatchAction('keep')}
                  className={styles['match-action-option__radio-label']}
                >
                  {t('organizer.overrideModal.matchAction.keep') || 'Keep current tv match'}
                </Radio>
                <span className={styles['match-action-option__description']}>
                  {t('organizer.overrideModal.matchAction.keepDesc') || 'Update season/episode under the tv.'}
                </span>
              </SelectableCard>

              <SelectableCard
                as="div"
                className={styles['match-action-option']}
                selected={matchAction === 'reset'}
                onClick={() => setMatchAction('reset')}
              >
                <Radio
                  name="bulkMatchAction"
                  checked={matchAction === 'reset'}
                  onChange={() => setMatchAction('reset')}
                  className={styles['match-action-option__radio-label']}
                >
                  {t('organizer.overrideModal.matchAction.reset') || 'Reset match (Pending)'}
                </Radio>
                <span className={styles['match-action-option__description']}>
                  {t('organizer.overrideModal.matchAction.resetDesc') || 'Remove match and return to Review Needed.'}
                </span>
              </SelectableCard>
            </div>
          </div>
        )}
      </div>

      {isSidebarActive && (
        <div className={`${styles['bulk-override-layout__side-panel']} has-bulk-override-side-panel`}>
          <div className={`${styles['organizer-override-bulk-episodes__panel']} ${styles['organizer-override-bulk-episodes__panel--sidebar']}`}>
            <div className={styles['organizer-override-field']}>
              <span className={styles['organizer-override-field__label-text']}>{t('organizer.overrideModal.labels.startNumbering')}</span>
              <Input
                type="number"
                min="1"
                value={startEpisodeNum}
                onChange={(e) => setStartEpisodeNum(e.target.value)}
                className="w-24"
              />
            </div>

            <span className={styles['organizer-override-bulk-episodes__hint']}>
              {t('organizer.overrideModal.labels.dragAndDropHint')}
            </span>

            <div className={`${styles['organizer-override-bulk-episodes__list']} ${styles['organizer-override-bulk-episodes__list--sidebar']}`}>
              {orderedItems.map((item, index) => {
                return (
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <Inline
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    align="center"
                    className={`${styles['organizer-override-bulk-episodes__item']} ${draggedIndex === index ? styles['is-dragging'] : ''}`}
                  >
                    <Inline gap="sm" align="center" className={styles['organizer-override-bulk-episodes__item-left']}>
                      <GripVertical className={styles['organizer-override-bulk-episodes__grip']} size={14} />
                      <span className={styles['organizer-override-bulk-episodes__index']}>{index + parseInt(startEpisodeNum, 10) || (index + 1)}{DOT}</span>
                      <Tooltip content={item.source} side="top" triggerClassName={styles['tooltip-trigger']}>
                        <span className={styles['organizer-override-bulk-episodes__filename']}>
                          {item.source}
                        </span>
                      </Tooltip>
                    </Inline>
                    <div className={styles['organizer-override-bulk-episodes__item-actions']}>
                      <IconButton
                        type="button"
                        size="xs"
                        className={styles['episode-action-btn']}
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp size={12} />
                      </IconButton>
                      <IconButton
                        type="button"
                        size="xs"
                        className={styles['episode-action-btn']}
                        onClick={() => handleMoveDown(index)}
                        disabled={index === orderedItems.length - 1}
                      >
                        <ArrowDown size={12} />
                      </IconButton>
                    </div>
                  </Inline>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

