import { useState, useRef, useMemo } from 'react';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import { useSettingsField } from '../SettingsFormContext.jsx';
import styles from './TagSafetyFilters.module.css';

// Pre-defined chip recommendations to minimize cognitive load (covering 80%+ of the adult space)
const PRESET_BLACKLIST = [
  'gay', 'bisexual', 'transgender', 'cuckold', 
  'group sex', 'gangbang', 'hentai', 'parody', 'interracial', 'anal', 'bdsm', 'feet',
  'pregnant', 'cartoon', 'anime', 'fetish', 'dp'
];

const PRESET_WHITELIST = [
  'straight', 'lesbian', 'solo', 'pov', 'hardcore', 'softcore', 'amateur', 'reality',
  'college', 'milf', 'cougar', 'petite', 'bbw', 'ebony', 'asian', 'latina',
  'blond', 'brunette', 'redhead', 'tattooed', 'pierced',
  'massage', 'romantic', 'creampie', 'outdoor', 'teen', 'bts',
  'uniform', 'office', 'joi', 'blowjob', 'facial', 'interracial', 'dp', 'anal', 'bdsm', 'feet'
];

export default function TagSafetyFilters({ t }) {
  const blacklistField = useSettingsField('adult_tag_blacklist');
  const whitelistField = useSettingsField('adult_tag_whitelist');
  const boostField = useSettingsField('adult_boost_multiplier');

  const [newBlacklistWord, setNewBlacklistWord] = useState('');
  const [newWhitelistWord, setNewWhitelistWord] = useState('');

  // Normalize string comma-separated tags to array list
  const currentBlacklist = useMemo(() => {
    const val = blacklistField.value || '';
    return val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [blacklistField.value]);

  const currentWhitelist = useMemo(() => {
    const val = whitelistField.value || '';
    return val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [whitelistField.value]);

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

  const handleAddWhitelist = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || currentWhitelist.includes(trimmed)) return;
    const updated = [...currentWhitelist, trimmed].join(', ');
    whitelistField.onChange({ target: { value: updated } });
  };

  const handleRemoveWhitelist = (tag) => {
    const updated = currentWhitelist.filter(t => t !== tag).join(', ');
    whitelistField.onChange({ target: { value: updated } });
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
                  &times;
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
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </Stack>

        <hr className={styles.divider} />

        {/* Whitelist Section */}
        <Stack gap="md" className={styles['filter-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-title']}>
              {t('settingsPage.sections.adultSafety.whitelistTitle') || 'Tag Whitelist'}
            </span>
            <span className={styles['section-hint']}>
              {t('settingsPage.sections.adultSafety.whitelistHint') || 'If configured, only items matching at least one of these tags (or title keywords) will be shown.'}
            </span>
          </div>

          {/* Current Active Whitelist Chips */}
          <div className={styles['chips-container']}>
            {currentWhitelist.map(tag => (
              <span key={tag} className={`${styles.chip} ${styles['chip-success']}`}>
                {tag}
                <button 
                  type="button" 
                  className={styles['remove-btn']} 
                  onClick={() => handleRemoveWhitelist(tag)}
                  title={t('common.remove') || 'Remove'}
                >
                  &times;
                </button>
              </span>
            ))}
            {currentWhitelist.length === 0 && (
              <span className={styles['empty-placeholder']}>
                {t('settingsPage.sections.adultSafety.emptyWhitelist') || 'No whitelist tags configured (displaying all non-blacklisted content).'}
              </span>
            )}
          </div>

          {/* Custom Tag Input */}
          <Inline gap="md" align="center" className={styles['input-row']}>
            <Input
              placeholder={t('settingsPage.sections.adultSafety.addCustomPlaceholder') || 'Add custom tag...'}
              value={newWhitelistWord}
              onChange={(e) => setNewWhitelistWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddWhitelist(newWhitelistWord);
                  setNewWhitelistWord('');
                }
              }}
              className={styles['tag-input']}
            />
            <Button 
              variant="secondary-neutral" 
              onClick={() => {
                handleAddWhitelist(newWhitelistWord);
                setNewWhitelistWord('');
              }}
            >
              {t('common.add') || 'Add'}
            </Button>
          </Inline>

          {/* Recommended Preset Whitelist Chips */}
          <div className={styles['preset-section']}>
            <span className={styles['preset-label']}>
              {t('settingsPage.sections.adultSafety.recommendedWhitelist') || 'Quick-add preferences:'}
            </span>
            <div className={styles['presets-container']}>
              {PRESET_WHITELIST.map(tag => {
                const isAdded = currentWhitelist.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles['preset-chip']} ${isAdded ? styles['preset-chip--active'] : ''}`}
                    onClick={() => isAdded ? handleRemoveWhitelist(tag) : handleAddWhitelist(tag)}
                    disabled={isAdded}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </Stack>

        <hr className={styles.divider} />

        {/* Whitelist Boost Multiplier Slider / Number field */}
        <Stack gap="sm" className={styles['boost-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-title']}>
              {t('settingsPage.sections.adultSafety.boostTitle') || 'Whitelist Boost Multiplier'}
            </span>
            <span className={styles['section-hint']}>
              {t('settingsPage.sections.adultSafety.boostHint') || 'Items matching whitelisted tags will have their recommendation scores multiplied by this factor to bubble them to the top.'}
            </span>
          </div>
          <Inline gap="lg" align="center" className={styles['boost-input-row']}>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={boostField.value ?? 1.5}
              onChange={(e) => boostField.onChange({ target: { value: parseFloat(e.target.value) } })}
              className={styles['boost-slider']}
            />
            <span className={styles['boost-value-badge']}>
              {parseFloat(boostField.value ?? 1.5).toFixed(1)}x
            </span>
          </Inline>
        </Stack>
      </Stack>
    </Card>
  );
}
