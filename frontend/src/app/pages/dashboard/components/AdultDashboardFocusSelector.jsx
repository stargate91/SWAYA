import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Autocomplete from '@/ui/Autocomplete';
import Inline from '@/ui/Inline';
import { X, Search } from '@/ui/icons';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

import stashdbTags from './stashdb_tags.json';
import fansdbTags from './fansdb_tags.json';

import styles from './AdultDashboardFocusSelector.module.css';

export default function AdultDashboardFocusSelector({ provider, currentFocus, t }) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState(currentFocus || '');

  const settingKey = `adult_${provider?.toLowerCase()}_focus_tag`;

  // Load correct tags list based on provider
  const tagsList = useMemo(() => {
    const rawList = provider?.toLowerCase() === 'fansdb' ? fansdbTags : stashdbTags;
    return rawList || [];
  }, [provider]);

  // Filter autocomplete options (case-insensitive contains check, return plain string array)
  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) {
      return tagsList.slice(0, 10);
    }
    const term = inputValue.toLowerCase();
    return tagsList
      .filter(tag => tag.toLowerCase().includes(term))
      .slice(0, 10);
  }, [inputValue, tagsList]);

  const handleSelect = async (tag) => {
    try {
      const selectedTag = typeof tag === 'string' ? tag : (tag?.name || tag?.label || String(tag));
      setInputValue(selectedTag);
      await api.settings.update({ [settingKey]: selectedTag });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    } catch (err) {
      console.error('Failed to update focus tag:', err);
    }
  };

  const handleClear = async () => {
    try {
      setInputValue('');
      await api.settings.update({ [settingKey]: '' });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    } catch (err) {
      console.error('Failed to clear focus tag:', err);
    }
  };

  return (
    <Inline gap="xs" align="center" className={styles['selector-row']}>
      <Autocomplete
        value={inputValue}
        onChange={setInputValue}
        options={filteredOptions}
        onSelect={handleSelect}
        placeholder={t('dashboard.search_tag_placeholder') || 'Search categories...'}
        size="sm"
        className={styles['focus-autocomplete']}
        leftElement={<Search size={14} className={styles['search-icon']} />}
        rightElement={
          currentFocus ? (
            <button
              type="button"
              onClick={handleClear}
              className={styles['clear-btn']}
              title={t('common.clear') || 'Clear Focus'}
            >
              <X size={14} />
            </button>
          ) : null
        }
      />
    </Inline>
  );
}

AdultDashboardFocusSelector.propTypes = {
  provider: PropTypes.string,
  currentFocus: PropTypes.string,
  t: PropTypes.func.isRequired,
};
