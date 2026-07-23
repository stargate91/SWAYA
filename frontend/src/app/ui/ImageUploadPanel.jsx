import { useRef, useState } from 'react';
import { Link2, Upload } from './icons';
import Input from './Input';
import Button from './Button';
import FileDropZone from './FileDropZone';
import styles from './ImageUploadPanel.module.css';

export default function ImageUploadPanel({
  imageType,
  isPending,
  t,
  onSaveUrl,
  onUploadFile,
}) {
  const fileInputRef = useRef(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [urlInput, setUrlInput] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result);
    };
    reader.readAsDataURL(file);

    void onUploadFile(file);
  };

  const handleSaveUrl = () => {
    const trimmedUrl = urlInput.trim();
    if (trimmedUrl) {
      void onSaveUrl(trimmedUrl);
    }
  };

  const hasUploadPreview = Boolean(uploadPreview);

  return (
    <FileDropZone
      disabled={isPending}
      onDropFiles={(files) => {
        const file = files?.[0];
        if (file && file.type.startsWith('image/')) {
          setUploadFile(file);

          const reader = new FileReader();
          reader.onloadend = () => {
            setUploadPreview(reader.result);
          };
          reader.readAsDataURL(file);

          void onUploadFile(file);
        }
      }}
      label={t?.('dropzone.label') || 'Drop image here'}
      description={t?.('dropzone.description') || 'to upload as custom cover'}
      className={styles.panel}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isPending}
        className={styles['file-input']}
      />

      <div className={styles['url-row']}>
        <Input
          placeholder="https://example.com/image.jpg"
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          disabled={isPending}
          className={styles['url-input']}
          leftElement={<Link2 size={15} />}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSaveUrl();
            }
          }}
        />

        <div className={styles['button-row']}>
          <Button
            type="button"
            onClick={handleSaveUrl}
            disabled={!urlInput.trim() || isPending}
            variant="secondary-neutral"
            size="md"
            className={styles['save-button']}
          >
            {t?.('common.save') || 'Save'}
          </Button>

          <Button
            type="button"
            variant="secondary-neutral"
            size="md"
            className={styles['upload-button']}
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>{t?.('library.details.uploadCustom') || 'Upload Custom'}</span>
          </Button>
        </div>
      </div>

      {hasUploadPreview || uploadFile || isPending ? (
        <div className={styles['upload-status']}>
          {hasUploadPreview ? (
            <div className={`${styles.preview} ${imageType === 'logo' ? styles.logo : ''} ${imageType === 'backdrop' ? styles.backdrop : ''} ${imageType === 'square' ? styles.square : ''}`.trim()}>
              <img
                src={uploadPreview}
                alt="Upload preview"
                className={styles['preview-image']}
              />
            </div>
          ) : null}

          <div className={styles['status-copy']}>
            <strong>{uploadFile?.name || (t?.('common.uploading') || 'Uploading...')}</strong>
            <span>
              {isPending
                ? (t?.('common.uploading') || 'Uploading...')
                : (t?.('library.details.imageUploaded') || 'Image uploaded and updated successfully!')}
            </span>
          </div>
        </div>
      ) : null}
    </FileDropZone>
  );
}
