import { useState } from 'react';
import Input from '@/ui/Input';
import Radio from '@/ui/Radio';
import Tooltip from '@/ui/Tooltip';
import Field from '@/ui/Field';
import ColorSwatch from '@/ui/ColorSwatch';
import styles from './CreateListModalContent.module.css';

const PRESET_COLORS = [
  'var(--color-accent-blue)',
  'color-mix(in srgb, var(--color-accent-blue) 75%, white)',
  'color-mix(in srgb, var(--color-accent-blue) 75%, black)',
  'var(--color-state-success)',
  'var(--color-state-warning)',
  'var(--color-state-danger)'
];

export default function CreateListModalContent({
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
    <form id="create-list-form" onSubmit={handleSubmit} className={styles['create-list-form']}>
      <Input
        id="list-name"
        type="text"
        label={t('lists.name_label') || 'Name'}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
        placeholder={t('lists.name_placeholder') || 'List name...'}
        autoFocus
        required
        error={error}
      />

      <Field
        label={t('lists.description_label') || 'Description'}
        htmlFor="list-desc"
      >
        <textarea
          id="list-desc"
          className={`ui-input ${styles['create-list-form__desc-textarea']}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('lists.desc_placeholder') || 'Description...'}
        />
      </Field>

      <Field label={t('lists.type_label') || 'List Type'}>
        <div className={styles['create-list-form__type-radio-group']}>
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
      </Field>

      <Field label={t('lists.theme_color_label') || 'Theme Color'}>
        <div className={styles['create-list-form__colors']}>
          {PRESET_COLORS.map((c) => {
            const isSelected = color === c;
            return (
              <Tooltip key={c} content={c} side="top">
                <ColorSwatch
                  color={c}
                  selected={isSelected}
                  onClick={() => setColor(c)}
                  shape="square"
                />
              </Tooltip>
            );
          })}
        </div>
      </Field>
    </form>
  );
}
