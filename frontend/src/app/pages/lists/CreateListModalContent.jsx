import { useState } from 'react';
import Input from '@/ui/Input';
import Radio from '@/ui/Radio';
import Checkbox from '@/ui/Checkbox';
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
  defaultIsAdult = false,
}) {
  const getInitialListType = () => {
    if (initialList?.list_type) {
      if (initialList.list_type === 'media') {
        return initialList.is_adult ? 'video_scene' : 'movie_tv';
      }
      return initialList.list_type;
    }
    return defaultIsAdult ? 'video_scene' : 'movie_tv';
  };
  const [name, setName] = useState(initialList?.name || '');
  const [description, setDescription] = useState(initialList?.description || '');
  const [color, setColor] = useState(initialList?.color || PRESET_COLORS[0]);
  const [listType, setListType] = useState(getInitialListType);
  const [isAdult, setIsAdult] = useState(initialList ? !!initialList.is_adult : defaultIsAdult);
  const [error, setError] = useState('');

  const handleIsAdultChange = (checked) => {
    setIsAdult(checked);
    if (mode === 'create') {
      if (checked && listType === 'movie_tv') {
        setListType('video_scene');
      } else if (!checked && listType === 'video_scene') {
        setListType('movie_tv');
      }
    }
  };

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
      is_adult: isAdult,
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

      <Input
        id="list-desc"
        label={t('lists.description_label') || 'Description'}
        multiline={true}
        resizable="vertical"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('lists.desc_placeholder') || 'Description...'}
        rows={3}
      />

      <Field label={t('lists.type_label') || 'List Type'}>
        <div className={styles['create-list-form__type-radio-group']}>
          {isAdult ? (
            <Radio
              name="listType"
              value="video_scene"
              checked={listType === 'video_scene'}
              onChange={() => setListType('video_scene')}
              disabled={mode === 'edit'}
            >
              {t('lists.type_video_scene') || 'Videos & Scenes'}
            </Radio>
          ) : (
            <Radio
              name="listType"
              value="movie_tv"
              checked={listType === 'movie_tv'}
              onChange={() => setListType('movie_tv')}
              disabled={mode === 'edit'}
            >
              {t('lists.type_movie_tv') || 'Movies & TV'}
            </Radio>
          )}
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

      <Checkbox
        id="list-is-adult"
        checked={isAdult}
        onChange={(e) => handleIsAdultChange(e.target.checked)}
      >
        {t('lists.is_adult_label') || 'NSFW / Adult List'}
      </Checkbox>
    </form>
  );
}
