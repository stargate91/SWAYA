import { useState } from 'react';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import Radio from '@/ui/Radio';
import Tooltip from '@/ui/Tooltip';

const PRESET_COLORS = [
  'var(--color-accent-blue)',
  'color-mix(in srgb, var(--color-accent-blue) 75%, white)',
  'color-mix(in srgb, var(--color-accent-blue) 75%, black)',
  'var(--color-state-success)',
  'var(--color-state-warning)',
  'var(--color-state-danger)'
];

export default function CreateListModalContent({
  onClose,
  onSave,
  t,
  initialList = null,
  mode = 'create',
  existingNames = [],
}) {
  const [name, setName] = useState(initialList?.name || '');
  const [description, setDescription] = useState(initialList?.description || '');
  const [color, setColor] = useState(initialList?.color || PRESET_COLORS[0]);
  const [listType, setListType] = useState(initialList?.list_type || 'media');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    // Ignore self-name when editing
    const otherNames = mode === 'edit'
      ? existingNames.filter(n => n.toLowerCase() !== initialList?.name?.toLowerCase())
      : existingNames;

    if (otherNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError(t('lists.error_duplicate_name') || 'A list with this name already exists.');
      return;
    }

    onSave({
      name: trimmedName,
      description: description.trim(),
      color,
      list_type: listType,
    });
  };

  return (
    <form id="create-list-form" onSubmit={handleSubmit} className="create-list-form">
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="list-name">
          {t('lists.name_label') || 'Name'}
        </label>
        <Input
          id="list-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder={t('lists.name_placeholder') || 'List name...'}
          autoFocus
          required
        />
        {error && (
          <span className="ui-field__error-text" style={{ color: 'var(--color-state-danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {error}
          </span>
        )}
      </div>

      <div className="ui-field">
        <label className="ui-field__label" htmlFor="list-desc">
          {t('lists.description_label') || 'Description'}
        </label>
        <textarea
          id="list-desc"
          className="ui-input"
          style={{ minHeight: '80px', resize: 'vertical', padding: 'var(--space-md)' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('lists.desc_placeholder') || 'Description...'}
        />
      </div>

      <div className="ui-field">
        <label className="ui-field__label">
          {t('lists.type_label') || 'List Type'}
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-xs)' }}>
          <Radio
            name="listType"
            value="media"
            checked={listType === 'media'}
            onChange={() => setListType('media')}
            disabled={mode === 'edit'}
          >
            {t('lists.type_media') || 'Media'}
          </Radio>
          <Radio
            name="listType"
            value="person"
            checked={listType === 'person'}
            onChange={() => setListType('person')}
            disabled={mode === 'edit'}
          >
            {t('lists.type_person') || 'People'}
          </Radio>
        </div>
      </div>

      <div className="ui-field">
        <label className="ui-field__label">
          {t('lists.theme_color_label') || 'Theme Color'}
        </label>
        <div className="create-list-form__colors">
          {PRESET_COLORS.map((c) => {
            const isSelected = color === c;
            return (
              <Tooltip key={c} content={c} side="top">
                <button
                  type="button"
                  className="create-list-form__color-btn"
                  style={{
                    backgroundColor: c,
                    border: isSelected ? '2px solid var(--color-accent-blue, #1493ff)' : '2px solid transparent',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: isSelected ? '0 0 8px rgba(20, 147, 255, 0.4)' : 'none',
                  }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              </Tooltip>
            );
          })}
        </div>
      </div>
    </form>
  );
}
