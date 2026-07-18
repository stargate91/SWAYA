import { useState } from 'react';
import PropTypes from 'prop-types';
import { Plus, X, Search } from '@/ui/icons';
import Chip from '@/ui/Chip';
import { useAllTagsQuery } from '@/queries/libraryQueries';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Autocomplete from '@/ui/Autocomplete';
import ScrollRow from '@/ui/ScrollRow';

function TagColorDot({ color }) {
  // eslint-disable-next-line react/forbid-dom-props
  return <span className="u-color-dot" style={{ backgroundColor: color }} />;
}

TagColorDot.propTypes = {
  color: PropTypes.string,
};

export default function BespokeTagManager({
  customTags = [],
  suggestedTags = [],
  isAdult = false,
  onUpdateTags,
  t,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allTags = [] } = useAllTagsQuery(isAdult);

  const unassignedSuggestions = suggestedTags.filter(
    (tag) => !customTags.some((ct) => ct.toLowerCase() === tag.toLowerCase())
  );

  const filteredTags = allTags.filter((tag) => {
    const isAssigned = customTags.some((ct) => ct.toLowerCase() === tag.name.toLowerCase());
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAssigned && matchesSearch;
  });

  const handleToggleTag = (tagName) => {
    const isAssigned = customTags.includes(tagName);
    const nextTags = isAssigned
      ? customTags.filter((name) => name !== tagName)
      : [...customTags, tagName];
    onUpdateTags(nextTags);
  };

  const handleAddTag = (tagName) => {
    if (customTags.includes(tagName)) return;
    const nextTags = [...customTags, tagName];
    onUpdateTags(nextTags);
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      const existing = allTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
      const tagNameToAdd = existing ? existing.name : trimmed;
      handleAddTag(tagNameToAdd);
    }
  };

  return (
    <Stack gap="md">
      {/* Active Tags */}
      <Stack gap="sm">
        <Text variant="caption" weight="bold" color="muted" uppercase>
          {t('library.details.activeTags') || 'Active Tags'}
        </Text>
        {customTags.length > 0 ? (
          <ScrollRow size="sm">
            {customTags.map((tagName) => {
              const tagColor = allTags.find((t) => t.name === tagName)?.color || 'var(--color-accent-blue)';
              return (
                <Chip
                  key={tagName}
                  color={tagColor}
                  size="sm"
                  onRemove={() => handleToggleTag(tagName)}
                  title={`Remove tag: ${tagName}`}
                >
                  {tagName}
                </Chip>
              );
            })}
          </ScrollRow>
        ) : (
          <Text size="xs" color="muted" italic>
            {t('library.details.noTagsAssigned') || 'No tags assigned.'}
          </Text>
        )}
      </Stack>

      {/* Add Tag Autocomplete Input */}
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
                handleAddTag(trimmed);
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

      {/* Suggested Tags / Keywords */}
      {unassignedSuggestions.length > 0 && (
        <Stack gap="sm">
          <Text variant="caption" weight="bold" color="muted" uppercase>
            {t('library.details.suggestedTags') || 'Suggested Tags'}
          </Text>
          <ScrollRow size="sm">
            {unassignedSuggestions.map((tag) => (
              <Chip
                key={tag}
                variant="dashed"
                size="sm"
                leftElement={<Plus size={10} />}
                onClick={() => handleAddTag(tag)}
                title={t('library.details.addTag') || 'Add tag'}
              >
                {tag}
              </Chip>
            ))}
          </ScrollRow>
        </Stack>
      )}
    </Stack>
  );
}

BespokeTagManager.propTypes = {
  customTags: PropTypes.arrayOf(PropTypes.string),
  suggestedTags: PropTypes.arrayOf(PropTypes.string),
  isAdult: PropTypes.bool,
  onUpdateTags: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};
