import { useState, useEffect, useCallback } from 'react';
import { useAllTagsQuery, useCreateTagMutation, useUpdateTagMutation } from '@/queries';
import Input from '@/ui/Input';
import Tooltip from '@/ui/Tooltip';
import Button from '@/ui/Button';
import Field from '@/ui/Field';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import Text from '@/ui/Text';
import ColorSwatch from '@/ui/ColorSwatch';
import Thumbnail from '@/ui/Thumbnail';
import { API_BASE } from '@/lib/backend';
import './CreateTagForm.css';

const BULLET_POINT = '• ';

const PREDEFINED_COLORS = [
  'var(--color-accent-blue)',
  'color-mix(in srgb, var(--color-accent-blue) 75%, white)',
  'color-mix(in srgb, var(--color-accent-blue) 75%, black)',
  'var(--color-state-success)',
  'var(--color-state-warning)',
  'var(--color-state-danger)'
];

export default function CreateTagModalContent({ onClose, t, initialTag = null, mode = 'create', onSuccess, defaultColor = 'var(--color-accent-blue)', isAdult = false }) {
  const [name, setName] = useState(initialTag?.name || '');
  const [color, setColor] = useState(initialTag?.color || defaultColor);
  const [customImages, setCustomImages] = useState(
    (initialTag?.custom_images || []).map((img) =>
      typeof img === 'string' ? { path: img, position_x: 50, position_y: 50 } : { position_x: 50, position_y: 50, ...img }
    )
  );
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPercentX, setDragStartPercentX] = useState(50);
  const [dragStartPercentY, setDragStartPercentY] = useState(50);

  const { data: tags = [] } = useAllTagsQuery(isAdult);
  const createTagMutation = useCreateTagMutation();
  const updateTagMutation = useUpdateTagMutation();
  const formId = mode === 'edit' ? 'edit-tag-form' : 'create-tag-form';

  useEffect(() => {
    const formElement = document.getElementById(formId);
    if (formElement) {
      const modalElement = formElement.closest('[data-modal="true"]');
      if (modalElement) {
        modalElement.style.setProperty('--current-tag-color', color);
      }
    }
  }, [color, formId]);

  const handleDragStart = (index, e) => {
    e.preventDefault();
    setDraggingIndex(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStartX(clientX);
    setDragStartY(clientY);
    const currentImg = customImages[index];
    setDragStartPercentX(currentImg.position_x ?? 50);
    setDragStartPercentY(currentImg.position_y ?? 50);
  };

  const handleDragMove = useCallback((e) => {
    if (draggingIndex === null) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    const containerSize = 80;
    const deltaPercentX = (deltaX / containerSize) * 100;
    const deltaPercentY = (deltaY / containerSize) * 100;
    const newPercentX = Math.max(0, Math.min(100, Math.round(dragStartPercentX - deltaPercentX)));
    const newPercentY = Math.max(0, Math.min(100, Math.round(dragStartPercentY - deltaPercentY)));

    setCustomImages((prev) =>
      prev.map((img, idx) => (idx === draggingIndex ? { ...img, position_x: newPercentX, position_y: newPercentY } : img))
    );
  }, [draggingIndex, dragStartX, dragStartY, dragStartPercentX, dragStartPercentY]);

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingIndex, handleDragMove, handleDragEnd]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (customImages.length >= 3) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomImages([...customImages, { path: reader.result, position_x: 50, position_y: 50 }]);
    };
    reader.readAsDataURL(file);
  };

  const handleAddUrl = (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    if (customImages.length >= 3) return;
    setCustomImages([...customImages, { path: newUrl.trim(), position_x: 50, position_y: 50 }]);
    setNewUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.strip ? name.strip() : name.trim();
    if (!trimmedName) {
      setError(t('library.tags.errorNameRequired') || 'Name is required');
      return;
    }

    // Case-insensitive uniqueness check
    const exists = tags.some(
      (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase() && String(tag.id) !== String(initialTag?.id)
    );
    if (exists) {
      setError(t('library.tags.errorExists') || 'A tag with this name already exists');
      return;
    }

    try {
      if (mode === 'edit' && initialTag?.id != null) {
        await updateTagMutation.mutateAsync({ tagId: initialTag.id, payload: { name: trimmedName, color, custom_images: customImages } });
      } else {
        await createTagMutation.mutateAsync({ name: trimmedName, color, is_adult: isAdult, custom_images: customImages });
      }
      onSuccess?.({ id: initialTag?.id, name: trimmedName, color, custom_images: customImages });
      onClose();
    } catch (err) {
      setError(err.message || (mode === 'edit' ? 'Failed to update tag' : 'Failed to create tag'));
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <Stack gap="xl" fullWidth>
        <Input
          label={t('library.tags.nameLabel') || 'Tag Name'}
          placeholder={t('library.tags.namePlaceholder') || 'Enter tag name...'}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          error={error}
          autoFocus
        />

        <Field label={t('library.tags.customImagesLabel') || 'Custom Images (Max 3)'}>
          <Stack gap="sm" fullWidth>
            {customImages.length > 0 && (
              <Inline gap="md">
                {customImages.map((img, idx) => {
                  const imgObj = typeof img === 'string' ? { path: img, position_y: 50 } : img;
                  const imageUrl = imgObj.path.startsWith('data:') || imgObj.path.startsWith('http')
                    ? imgObj.path
                    : `${API_BASE}${imgObj.path}`;
                  return (
                    <Thumbnail
                      key={idx}
                      onRemove={() => setCustomImages(customImages.filter((_, i) => i !== idx))}
                      removeLabel={t('library.tags.removeImage') || 'Remove image'}
                    >
                      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                      <div
                        className="create-tag-form__image-preview"
                        /* eslint-disable-next-line react/forbid-dom-props */
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                          backgroundPosition: `${imgObj.position_x ?? 50}% ${imgObj.position_y ?? 50}%`,
                        }}
                        onMouseDown={(e) => handleDragStart(idx, e)}
                        onTouchStart={(e) => handleDragStart(idx, e)}
                        title={t('library.tags.dragToReposition') || 'Drag to reposition'}
                      />
                    </Thumbnail>
                  );
                })}
              </Inline>
            )}

            {customImages.length < 3 && (
              <Inline gap="sm" align="center">
                <Input
                  placeholder={t('library.tags.imageUrlPlaceholder') || 'Paste image URL...'}
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="create-tag-form__input-wrapper"
                />
                <Button
                  type="button"
                  onClick={handleAddUrl}
                  variant="secondary"
                >
                  {t('library.tags.addImageUrl') || 'Add URL'}
                </Button>
                <Button
                  as="label"
                  variant="secondary"
                >
                  {t('library.tags.uploadImage') || 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    hidden
                  />
                </Button>
              </Inline>
            )}

            <div className="create-tag-form__help-text-wrapper">
              {customImages.length <= 1 ? (
                <Text variant="caption" color="secondary">
                  {BULLET_POINT}{t('library.tags.aspectRatioOne') || 'Ideal aspect ratio is 16:9 (landscape/backdrop)'}
                </Text>
              ) : (
                <Text variant="caption" color="secondary">
                  {BULLET_POINT}{t('library.tags.aspectRatioMultiple') || 'Ideal aspect ratio is 2:3 (portrait/portrait)'}
                </Text>
              )}
            </div>
          </Stack>
        </Field>

        <Field label={t('library.tags.colorLabel') || 'Select Color'}>
          <Inline gap="md" fullWidth>
            {PREDEFINED_COLORS.map((c) => {
              const isSelected = color === c;
              return (
                <Tooltip key={c} content={c} side="top">
                  <ColorSwatch
                    color={c}
                    selected={isSelected}
                    onClick={() => setColor(c)}
                  />
                </Tooltip>
              );
            })}
          </Inline>
        </Field>
      </Stack>
    </form>
  );
}
