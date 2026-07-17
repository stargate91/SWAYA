import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Tag } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { useAllTagsQuery, useCreateTagMutation } from '@/queries';

import './PeopleTagPopover.css';
import Inline from '@/ui/Inline';



export default function PeopleTagPopover({ item, t, updatePersonStatusMutation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('var(--color-accent-blue)');
  const [newTagError, setNewTagError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const popoverRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const { data: allTags = [] } = useAllTagsQuery(item?.is_adult);
  const createTagMutation = useCreateTagMutation();
  const currentTags = item?.custom_tags || [];
  const isBusy = updatePersonStatusMutation.isPending || createTagMutation.isPending;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickDropdownOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickDropdownOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickDropdownOutside);
    };
  }, []);

  const handleToggleTag = (tagName) => {
    if (!item?.id || !tagName) {
      return;
    }

    const isAssigned = currentTags.includes(tagName);
    const nextTags = isAssigned
      ? currentTags.filter((name) => name !== tagName)
      : [...currentTags, tagName];

    updatePersonStatusMutation.mutate({
      personId: item.id,
      payload: {
        custom_tags: nextTags,
      },
    });
  };

  const handleCreateTag = async (event) => {
    event.preventDefault();
    const trimmedName = newTagName.trim();
    if (!item?.id || !trimmedName) {
      return;
    }

    const exists = allTags.some((tag) => tag.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setNewTagError(t('library.tags.errorExists') || 'A tag with this name already exists');
      return;
    }

    try {
      await createTagMutation.mutateAsync({
        name: trimmedName,
        color: newTagColor,
        is_adult: item?.is_adult || false,
      });

      await updatePersonStatusMutation.mutateAsync({
        personId: item.id,
        payload: {
          custom_tags: [...currentTags, trimmedName],
        },
      });

      setNewTagName('');
      setNewTagColor('var(--color-accent-blue)');
      setNewTagError('');
    } catch (err) {
      setNewTagError(err.message || 'Failed to create tag');
    }
  };

  return (
    <div ref={popoverRef} className={`entity-detail-page__tag-popover-wrap${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="media-detail-page__side-nav-toggle"
        title={t('library.details.tagger') || 'Tagger'}
        aria-expanded={isOpen}
      >
        <Tag size={18} />
      </button>

      {isOpen ? (
        <div className="entity-detail-page__tag-popover tags-panel">
          {/* Currently Assigned Tags */}
          <div className="tags-panel__assigned-section">
            <span className="tags-panel__section-subtitle">
              {t('library.tags.assignedTitle') || 'Assigned'}
            </span>
            <Inline gap="sm" align="center" className="tags-panel__assigned-list">
              {currentTags.map((tagName) => {
                const tagObj = allTags.find((tag) => tag.name === tagName);
                const color = tagObj?.color || 'var(--color-accent)';
                return (
                  <Pill
                    key={tagName}
                    variant="tag"
                    className="tags-panel__assigned-pill"
                    customStyle={{ '--pill-tag-color': color }}
                  >
                    <span>{tagName}</span>
                    <button
                      type="button"
                      className="tags-panel__assigned-pill-remove"
                      onClick={() => handleToggleTag(tagName)}
                      disabled={isBusy}
                      title={t('common.remove') || 'Remove'}
                    >
                      {String.fromCharCode(0x2715)}
                    </button>
                  </Pill>
                );
              })}
              {currentTags.length === 0 && (
                <div className="tags-panel__no-tags">
                  {t('library.tags.noTagsAssigned') || 'No tags assigned.'}
                </div>
              )}
            </Inline>
          </div>

          {/* Suggested Tags */}
          {item?.suggested_tags && item.suggested_tags.length > 0 && (
            <div className="tags-panel__assigned-section">
              <span className="tags-panel__section-subtitle">
                {t('library.details.suggestedTags') || 'Suggested Tags'}
              </span>
              <Inline gap="sm" align="center" className="tags-panel__assigned-list">
                {item.suggested_tags.map(tagName => {
                  const isAssigned = currentTags.includes(tagName);
                  if (isAssigned) return null;
                  return (
                    <Pill
                      key={tagName}
                      variant="tag"
                      className="tags-panel__assigned-pill tags-panel__assigned-pill--suggested"
                      onClick={() => handleToggleTag(tagName)}
                    >
                      <span>{tagName}</span>
                    </Pill>
                  );
                })}
                {item.suggested_tags.every(t => currentTags.includes(t)) && (
                  <div className="tags-panel__no-tags">
                    {t('library.tags.allTagsAssigned') || 'All suggested tags assigned.'}
                  </div>
                )}
              </Inline>
            </div>
          )}

          {/* Add Tag Dropdown */}
          <div className="tags-panel__select-section" ref={dropdownRef}>
            <span className="tags-panel__section-subtitle">
              {t('library.tags.addTagLabel') || 'Add Tag'}
            </span>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="tags-panel__select-trigger"
            >
              <span>{t('library.tags.addTagPlaceholder') || 'Add Tag...'}</span>
              <ChevronDown size={16} />
            </button>

            {isDropdownOpen && (
              <div className="tags-panel__select-dropdown">
                {allTags
                  .filter(tag => !currentTags.includes(tag.name))
                  .map(tag => {
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.name)}
                        disabled={isBusy}
                        className="tags-panel__dropdown-item"
                      >
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <div className="tags-panel__dropdown-item-color" style={{ backgroundColor: tag.color }} />
                        <span className="tags-panel__dropdown-item-name">{tag.name}</span>
                      </button>
                    );
                  })}
                {allTags.length === 0 && (
                  <div className="tags-panel__dropdown-empty">
                    {t('library.emptyStates.tags.description') || 'No tags created yet.'}
                  </div>
                )}
                {allTags.length > 0 && allTags.filter(tag => !currentTags.includes(tag.name)).length === 0 && (
                  <div className="tags-panel__dropdown-empty">
                    {t('library.tags.allTagsAssigned') || 'All tags assigned.'}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="tags-panel__divider" />

          {/* Create Tag Form */}
          <form onSubmit={handleCreateTag} className="tags-panel__create-form">
            <h5 className="tags-panel__create-title">
              {t('library.tags.modalTitle') || 'Create Tag'}
            </h5>

            <div className="tags-panel__input-row">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => {
                  setNewTagName(e.target.value);
                  setNewTagError('');
                }}
                placeholder={t('library.tags.namePlaceholder') || 'Enter tag name...'}
                className="tags-panel__input"
              />
              <button
                type="submit"
                disabled={!newTagName.trim() || isBusy}
                className="tags-panel__submit-btn"
              >
                <Plus size={16} />
              </button>
            </div>

            {newTagError && (
              <span className="tags-panel__error">
                {newTagError}
              </span>
            )}
          </form>
        </div>
      ) : null}
    </div>
  );
}
