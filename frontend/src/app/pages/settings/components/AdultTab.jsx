import { useState } from 'react';
import Stack from '@/ui/Stack';
import Card from '@/ui/Card';
import IconButton from '@/ui/IconButton';
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import './ScraperOrder.css';
import { useSettingsField, useSettingsViewContext, useSettingsFormContext } from '../SettingsFormContext.jsx';
import SettingsSectionRenderer from './SettingsSectionRenderer.jsx';
import {
  createAdultGeneralSection,
  createAdultStashdbSection,
  createAdultFansdbSection,
  createAdultTheporndbSection,
} from '../settingsSectionConfigs.jsx';

export default function AdultTab({ form, setForm }) {
  const { adultGenderPreferenceOptions, t } = useSettingsViewContext();
  const { renderContext } = useSettingsFormContext();
  const isScanActive = Boolean(renderContext?.isBackgroundActive);
  const includeAdultField = useSettingsField('include_adult');
  const context = { include_adult: includeAdultField.checked };

  const currentOrderStr = form?.scenes_scraper_order || 'stashdb,porndb,fansdb';
  const scrapers = currentOrderStr.split(',').map((s) => s.trim().toLowerCase());

  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const nextScrapers = [...scrapers];
    const temp = nextScrapers[draggedIndex];
    nextScrapers.splice(draggedIndex, 1);
    nextScrapers.splice(index, 0, temp);

    setDraggedIndex(index);
    const newOrder = nextScrapers.join(',');
    setForm((current) => ({ ...current, scenes_scraper_order: newOrder }));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveScraper = (index, direction) => {
    const nextScrapers = [...scrapers];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextScrapers.length) return;

    const temp = nextScrapers[index];
    nextScrapers[index] = nextScrapers[targetIndex];
    nextScrapers[targetIndex] = temp;

    const newOrder = nextScrapers.join(',');
    setForm((current) => ({ ...current, scenes_scraper_order: newOrder }));
  };

  const scraperNames = {
    stashdb: 'StashDB',
    porndb: 'ThePornDB',
    fansdb: 'FansDB',
  };

  return (
    <Stack gap="xl">
      <SettingsSectionRenderer
        section={createAdultGeneralSection(t, adultGenderPreferenceOptions)}
        context={context}
      />
      {includeAdultField.checked && (
        <>
          <Card title={t('settingsPage.sections.scenes.scraperOrderTitle')} eyebrow={t('settingsPage.sections.scenes.scanEyebrow')}>
            <Stack gap="md">
              <span className="ui-field__hint settings-hint--tight-top">
                {t('settingsPage.sections.scenes.scraperOrderHint')}
              </span>
              <div className="scraper-order-list">
                {scrapers.map((scraper, index) => (
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div
                    key={scraper}
                    className="scraper-order-row"
                    draggable={!isScanActive}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="scraper-order-info">
                      <div className="scraper-order-drag-handle">
                        <GripVertical size={16} />
                      </div>
                      <div className="scraper-order-badge">
                        {index + 1}
                      </div>
                      <span className="scraper-order-name">
                        {scraperNames[scraper] || scraper}
                      </span>
                    </div>
                    <div className="scraper-order-actions">
                      <IconButton
                        size="sm"
                        disabled={index === 0 || isScanActive}
                        onClick={() => moveScraper(index, -1)}
                        label={t('settingsPage.sections.scenes.moveUp')}
                      >
                        <ArrowUp size={14} />
                      </IconButton>
                      <IconButton
                        size="sm"
                        disabled={index === scrapers.length - 1 || isScanActive}
                        onClick={() => moveScraper(index, 1)}
                        label={t('settingsPage.sections.scenes.moveDown')}
                      >
                        <ArrowDown size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </Stack>
          </Card>

          <SettingsSectionRenderer
            section={createAdultStashdbSection(t)}
            context={context}
          />
          <SettingsSectionRenderer
            section={createAdultFansdbSection(t)}
            context={context}
          />
          <SettingsSectionRenderer
            section={createAdultTheporndbSection(t)}
            context={context}
          />
        </>
      )}
    </Stack>
  );
}
