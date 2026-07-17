import { useState } from 'react';
import { X } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { useAllTagsQuery, useCreateTagMutation } from '@/queries';
import { useMediaDetailContext } from '../MediaDetailContext';
import Inline from '@/ui/Inline';
import Divider from '@/ui/Divider';
import Input from '@/ui/Input';
import IconButton from '@/ui/IconButton';
import Stack from '@/ui/Stack';
import Card from '@/ui/Card';
import Dropdown from '@/ui/Dropdown';
import Text from '@/ui/Text';
import Alert from '@/ui/Alert';

export default function TagsPanel() {
  const { state, mutations, type, t } = useMediaDetailContext();
  const {
    item,
    cleanId,
    effectiveId
  } = state;

  const {
    updateStatusMutation
  } = mutations;

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('var(--color-accent-blue)');
  const [newTagError, setNewTagError] = useState('');

  const { data: allTags = [] } = useAllTagsQuery(item?.is_adult);
  const createTagMutation = useCreateTagMutation();

  const currentTags = item?.custom_tags || [];

  const handleToggleTag = (tagName) => {
    const isAssigned = currentTags.includes(tagName);
    const nextTags = isAssigned
      ? currentTags.filter(name => name !== tagName)
      : [...currentTags, tagName];

    updateStatusMutation.mutate({
      itemId: effectiveId,
      tvId: cleanId,
      payload: {
        custom_tags: nextTags,
        media_type: type
      }
    });
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    const exists = allTags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setNewTagError(t('library.tags.errorExists') || 'A tag with this name already exists');
      return;
    }

    try {
      await createTagMutation.mutateAsync({
        name: trimmedName,
        color: newTagColor,
        is_adult: item?.is_adult || false
      });

      await updateStatusMutation.mutateAsync({
        itemId: effectiveId,
        tvId: cleanId,
        payload: {
          custom_tags: [...currentTags, trimmedName],
          media_type: type
        }
      });

      setNewTagName('');
      setNewTagColor('var(--color-accent-blue)');
      setNewTagError('');
    } catch (err) {
      setNewTagError(err.message || 'Failed to create tag');
    }
  };

  const assignableOptions = allTags
    .filter(tag => !currentTags.includes(tag.name))
    .map(tag => ({ value: tag.name, label: tag.name }));

  return (
    <Stack gap="lg">
      <Text as="h4" variant="caption" uppercase color="muted">
        {t('library.details.tagger') || 'Tagger'}
      </Text>

      {/* Currently Assigned Tags */}
      <Stack gap="xs">
        <Text variant="caption" uppercase color="muted">
          {t('library.tags.assignedTitle') || 'Assigned'}
        </Text>
        <Card variant="default" padding="md">
          <Inline gap="sm" align="center">
            {currentTags.map(tagName => {
              const tagObj = allTags.find(t => t.name === tagName);
              const color = tagObj?.color || 'var(--color-accent)';
              return (
                <Pill
                  key={tagName}
                  variant="tag"
                  customStyle={{ '--pill-tag-color': color }}
                >
                  <span>{tagName}</span>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    onClick={() => handleToggleTag(tagName)}
                    title={t('common.remove') || 'Remove'}
                  >
                    <X size={10} />
                  </IconButton>
                </Pill>
              );
            })}
            {currentTags.length === 0 && (
              <Text variant="small" color="muted" italic>
                {t('library.tags.noTagsAssigned') || 'No tags assigned.'}
              </Text>
            )}
          </Inline>
        </Card>
      </Stack>

      {/* Suggested Tags */}
      {item?.suggested_tags && item.suggested_tags.length > 0 && (
        <Stack gap="xs">
          <Text variant="caption" uppercase color="muted">
            {t('library.details.suggestedTags') || 'Suggested Tags'}
          </Text>
          <Card variant="default" padding="md">
            <Inline gap="sm" align="center">
              {item.suggested_tags.map(tagName => {
                const isAssigned = currentTags.includes(tagName);
                if (isAssigned) return null;
                return (
                  <Pill
                    key={tagName}
                    variant="tag"
                    onClick={() => handleToggleTag(tagName)}
                  >
                    <span>{tagName}</span>
                  </Pill>
                );
              })}
              {item.suggested_tags.every(t => currentTags.includes(t)) && (
                <Text variant="small" color="muted" italic>
                  {t('library.tags.allTagsAssigned') || 'All suggested tags assigned.'}
                </Text>
              )}
            </Inline>
          </Card>
        </Stack>
      )}

      {/* Add Tag Dropdown */}
      <Dropdown
        label={t('library.tags.addTagLabel') || 'Add Tag'}
        placeholder={t('library.tags.addTagPlaceholder') || 'Add Tag...'}
        options={assignableOptions}
        value=""
        onChange={(e) => handleToggleTag(e.target.value)}
      />

      <Divider />

      <form onSubmit={handleCreateTag}>
        <Card variant="default" padding="xl" title={t('library.tags.modalTitle') || 'Create Tag'}>
          <Stack gap="md">
            <Inline gap="sm" align="end" fullWidth>
              <Inline flex={1} fullWidth>
                <Input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value);
                    setNewTagError('');
                  }}
                  placeholder={t('library.tags.namePlaceholder') || 'Enter tag name...'}
                />
              </Inline>
              <IconButton
                type="submit"
                disabled={!newTagName.trim() || createTagMutation.isPending}
                variant="secondary-neutral"
                size="md-btn"
              >
                {String.fromCharCode(0x002B)}
              </IconButton>
            </Inline>

            {newTagError && <Alert>{newTagError}</Alert>}
          </Stack>
        </Card>
      </form>
    </Stack>
  );
}
