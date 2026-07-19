import { useState } from 'react';
import { Plus, Tag, Search, X } from '@/ui/icons';
import Chip from '@/ui/Chip';
import { useAllTagsQuery, useCreateTagMutation } from '@/queries';

import Inline from '@/ui/Inline';
import Popover from '@/ui/Popover';
import Autocomplete from '@/ui/Autocomplete';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';

function TagColorDot({ color }) {
  // eslint-disable-next-line react/forbid-dom-props
  return <span className="u-color-dot" style={{ backgroundColor: color }} />;
}

export default function PeopleTagPopover({ item, t, updatePersonStatusMutation }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: allTags = [] } = useAllTagsQuery(item?.is_adult);
  const createTagMutation = useCreateTagMutation();
  const currentTags = item?.custom_tags || [];
  const isBusy = updatePersonStatusMutation.isPending || createTagMutation.isPending;

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

  const handleAddTag = async (tagName) => {
    if (!item?.id || !tagName) {
      return;
    }
    const trimmedName = tagName.trim();
    if (currentTags.includes(trimmedName)) return;

    const exists = allTags.find((tag) => tag.name.toLowerCase() === trimmedName.toLowerCase());

    if (exists) {
      updatePersonStatusMutation.mutate({
        personId: item.id,
        payload: {
          custom_tags: [...currentTags, exists.name],
        },
      });
      setSearchQuery('');
    } else {
      try {
        await createTagMutation.mutateAsync({
          name: trimmedName,
          color: 'var(--color-accent-blue)',
          is_adult: item?.is_adult || false,
        });

        await updatePersonStatusMutation.mutateAsync({
          personId: item.id,
          payload: {
            custom_tags: [...currentTags, trimmedName],
          },
        });
        setSearchQuery('');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;
      handleAddTag(trimmed);
    }
  };

  const filteredTags = allTags.filter((tag) => {
    const isAssigned = currentTags.some((ct) => ct.toLowerCase() === tag.name.toLowerCase());
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAssigned && matchesSearch;
  });

  return (
    <Popover
      align="right"
      width="min(24rem, calc(100vw - 2.5rem))"
      trigger={
        <button
          type="button"
          className="media-detail-page__side-nav-toggle"
          title={t('library.details.tagger') || 'Tagger'}
        >
          <Tag size={18} />
        </button>
      }
    >
      <Card
        variant="glass-shaded"
        title={t('library.details.tagger') || 'Tagger'}
        headerVariant="shaded"
        padding="md"
        fullWidth
      >
        <Stack gap="md">
          {/* Currently Assigned Tags */}
          <Stack gap="xs">
            <Text variant="caption" weight="bold" color="muted" uppercase>
              {t('library.tags.assignedTitle') || 'Assigned'}
            </Text>
            <Inline gap="sm" align="center" className="u-max-h-10rem u-overflow-y-auto custom-scrollbar">
              {currentTags.map((tagName) => {
                const tagObj = allTags.find((tag) => tag.name === tagName);
                const color = tagObj?.color || 'var(--color-accent)';
                return (
                  <Chip
                    key={tagName}
                    color={color}
                    size="sm"
                    onRemove={() => handleToggleTag(tagName)}
                    disabled={isBusy}
                    title={t('common.remove') || 'Remove'}
                  >
                    {tagName}
                  </Chip>
                );
              })}
              {currentTags.length === 0 && (
                <Text variant="small" color="muted" italic>
                  {t('library.tags.noTagsAssigned') || 'No tags assigned.'}
                </Text>
              )}
            </Inline>
          </Stack>

          {/* Suggested Tags */}
          {item?.suggested_tags && item.suggested_tags.length > 0 && (
            <Stack gap="xs">
              <Text variant="caption" weight="bold" color="muted" uppercase>
                {t('library.details.suggestedTags') || 'Suggested Tags'}
              </Text>
              <Inline gap="sm" align="center" className="u-max-h-10rem u-overflow-y-auto custom-scrollbar">
                {item.suggested_tags.map(tagName => {
                  const isAssigned = currentTags.includes(tagName);
                  if (isAssigned) return null;
                  return (
                    <Chip
                      key={tagName}
                      variant="dashed"
                      size="sm"
                      leftElement={<Plus size={10} />}
                      onClick={() => handleAddTag(tagName)}
                      disabled={isBusy}
                    >
                      {tagName}
                    </Chip>
                  );
                })}
                {item.suggested_tags.every(t => currentTags.includes(t)) && (
                  <Text variant="small" color="muted" italic>
                    {t('library.tags.allTagsAssigned') || 'All suggested tags assigned.'}
                  </Text>
                )}
              </Inline>
            </Stack>
          )}

          {/* Add Tag Autocomplete */}
          <Autocomplete
            size="sm"
            leftElement={<Search size={13} />}
            rightElement={searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="bespoke-tagger-clear-btn"
              >
                <X size={12} />
              </button>
            )}
            placeholder={t('library.tags.searchOrAdd') || 'Search or add tag...'}
            value={searchQuery}
            onChange={setSearchQuery}
            options={filteredTags}
            onSelect={(tag) => handleAddTag(tag.name)}
            onKeyDown={handleKeyDown}
            renderItem={(tag) => (
              <Inline gap="sm" align="center">
                <TagColorDot color={tag.color} />
                <span>{tag.name}</span>
              </Inline>
            )}
            renderFooter={(closeDropdown, itemClass, createClass) => {
              const trimmed = searchQuery.trim();
              const tagExists = allTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
              if (!trimmed || tagExists) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    void handleAddTag(trimmed);
                    closeDropdown();
                  }}
                  className={`${itemClass} ${createClass}`}
                >
                  <Plus size={12} />
                  <span>{t('library.details.createTag', { name: trimmed })}</span>
                </button>
              );
            }}
          />
        </Stack>
      </Card>
    </Popover>
  );
}
