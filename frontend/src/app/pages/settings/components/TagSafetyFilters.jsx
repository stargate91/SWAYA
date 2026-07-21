import { useState, useMemo } from 'react';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import { X } from '@/ui/icons';
import { useSettingsField } from '../SettingsFormContext.jsx';
import styles from './TagSafetyFilters.module.css';

const PRESET_BLACKLIST = [
  'gay', 'bisexual', 'transgender', 'cuckold', 
  'group sex', 'gangbang', 'hentai', 'parody', 'anal', 'pegging', 'bdsm', 'feet',
  'pregnant', 'cartoon', 'anime', 'fetish',
  'ebony', 'black man', 'black woman', 'asian', 'latina', 'interracial'
];

export default function TagSafetyFilters({ t }) {
  const blacklistField = useSettingsField('adult_tag_blacklist');
  const [newBlacklistWord, setNewBlacklistWord] = useState('');

  // Normalize string comma-separated tags to array list
  const currentBlacklist = useMemo(() => {
    const val = blacklistField.value || '';
    return val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [blacklistField.value]);

  // Handlers to add/remove tags
  const handleAddBlacklist = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || currentBlacklist.includes(trimmed)) return;
    const updated = [...currentBlacklist, trimmed].join(', ');
    blacklistField.onChange({ target: { value: updated } });
  };

  const handleRemoveBlacklist = (tag) => {
    const updated = currentBlacklist.filter(t => t !== tag).join(', ');
    blacklistField.onChange({ target: { value: updated } });
  };

  return (
    <Card 
      title={t('settingsPage.sections.adultSafety.title') || 'Adult Content Safety Filters'} 
      eyebrow={t('settingsPage.sections.adultSafety.eyebrow') || 'SAFETY'}
    >
      <Stack gap="xl">
        {/* Blacklist Section */}
        <Stack gap="md" className={styles['filter-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-title']}>
              {t('settingsPage.sections.adultSafety.blacklistTitle') || 'Tag Blacklist'}
            </span>
            <span className={styles['section-hint']}>
              {t('settingsPage.sections.adultSafety.blacklistHint') || 'Items containing any of these tags (or title keywords) will be hidden completely.'}
            </span>
          </div>

          {/* Current Active Blacklist Chips */}
          <div className={styles['chips-container']}>
            {currentBlacklist.map(tag => (
              <span key={tag} className={`${styles.chip} ${styles['chip-danger']}`}>
                {tag}
                <button 
                  type="button" 
                  className={styles['remove-btn']} 
                  onClick={() => handleRemoveBlacklist(tag)}
                  title={t('common.remove') || 'Remove'}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {currentBlacklist.length === 0 && (
              <span className={styles['empty-placeholder']}>
                {t('settingsPage.sections.adultSafety.emptyBlacklist') || 'No blacklisted tags.'}
              </span>
            )}
          </div>

          {/* Custom Tag Input */}
          <Inline gap="md" align="center" className={styles['input-row']}>
            <Input
              placeholder={t('settingsPage.sections.adultSafety.addCustomPlaceholder') || 'Add custom tag...'}
              value={newBlacklistWord}
              onChange={(e) => setNewBlacklistWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBlacklist(newBlacklistWord);
                  setNewBlacklistWord('');
                }
              }}
              className={styles['tag-input']}
            />
            <Button 
              variant="secondary-neutral" 
              onClick={() => {
                handleAddBlacklist(newBlacklistWord);
                setNewBlacklistWord('');
              }}
            >
              {t('common.add') || 'Add'}
            </Button>
          </Inline>

          {/* Recommended Preset Chips */}
          <div className={styles['preset-section']}>
            <span className={styles['preset-label']}>
              {t('settingsPage.sections.adultSafety.recommendedBlacklist') || 'Recommended blocks:'}
            </span>
            <div className={styles['presets-container']}>
              {PRESET_BLACKLIST.map(tag => {
                const isAdded = currentBlacklist.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles['preset-chip']} ${isAdded ? styles['preset-chip--active'] : ''}`}
                    onClick={() => isAdded ? handleRemoveBlacklist(tag) : handleAddBlacklist(tag)}
                    disabled={isAdded}
                  >
                    {['+ ', tag]}
                  </button>
                );
              })}
            </div>
          </div>
        </Stack>
      </Stack>
    </Card>
  );
}
