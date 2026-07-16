import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../providers/LanguageContext';
import Button from './Button';
import styles from './PaginationBar.module.css';

const SLASH_SEPARATOR = '/ ';
const SLASH_SPACED = ' / ';


function PaginationPageSizes({ pageSize, pageSizeOptions, onPageSizeChange, ariaLabel }) {
  return (
    <div className={styles.sizes} role="group" aria-label={ariaLabel}>
      {pageSizeOptions.map((option) => (
        <Button
          key={option}
          type="button"
          variant="secondary-neutral"
          size="sm"
          className={`${styles.size} ${pageSize === option ? styles.isActive : ''}`.trim()}
          onClick={() => onPageSizeChange?.(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

function PaginationPageEditor({ currentPage, totalPages, onPageChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pageValue, setPageValue] = useState(String(currentPage));
  const [prevCurrentPage, setPrevCurrentPage] = useState(currentPage);
  const inputRef = useRef(null);

  if (currentPage !== prevCurrentPage) {
    setPrevCurrentPage(currentPage);
    setPageValue(String(currentPage));
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const submitPage = () => {
    const parsed = Number.parseInt(pageValue, 10);
    if (Number.isNaN(parsed)) {
      setPageValue(String(currentPage));
      setIsEditing(false);
      return;
    }

    onPageChange?.(Math.min(totalPages, Math.max(1, parsed)));
    setIsEditing(false);
  };

  return (
    <div className={`${styles.page} ${styles['page-editable']}`}>
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="number"
            min="1"
            max={totalPages}
            value={pageValue}
            onChange={(event) => setPageValue(event.target.value)}
            onBlur={submitPage}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submitPage();
              }
              if (event.key === 'Escape') {
                setPageValue(String(currentPage));
                setIsEditing(false);
              }
            }}
          />
          <span>{SLASH_SEPARATOR}{totalPages}</span>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles['page-display']}
          onClick={() => setIsEditing(true)}
        >
          {currentPage}{SLASH_SPACED}{totalPages}
        </Button>
      )}
    </div>
  );
}

export default function PaginationBar({
  summaryText,
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions = [],
  showPageSizes = false,
  onPageChange,
  onPageSizeChange,
  labels = {},
  paginationMode = 'pages',
  onPaginationModeChange,
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.meta}>
        <span>{summaryText}</span>
      </div>
      <div className={styles.controls}>
        {showPageSizes && paginationMode !== 'infinite' ? (
          <PaginationPageSizes
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
            ariaLabel={labels.pageSizesAriaLabel ?? t('pagination.rowsPerPage')}
          />
        ) : null}
        
        {paginationMode === 'infinite' ? (
          <div className={styles.nav}>
            {onPaginationModeChange ? (
              <div className={styles.modes}>
                <Button
                  type="button"
                  variant="secondary-neutral"
                  size="sm"
                  className={styles.button}
                  onClick={() => onPaginationModeChange('pages')}
                >
                  {t('pagination.modePages') || 'Pages'}
                </Button>
                <Button
                  type="button"
                  variant="secondary-neutral"
                  size="sm"
                  className={`${styles.button} ${styles.isActive}`}
                  onClick={() => onPaginationModeChange('infinite')}
                >
                  {t('pagination.modeInfinite') || 'Infinite'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles.nav}>
            {onPaginationModeChange ? (
              // eslint-disable-next-line react/forbid-dom-props
              <div className={styles.modes} style={{ marginRight: '16px' }}>
                <Button
                  type="button"
                  variant="secondary-neutral"
                  size="sm"
                  className={`${styles.button} ${styles.isActive}`}
                  onClick={() => onPaginationModeChange('pages')}
                >
                  {t('pagination.modePages') || 'Pages'}
                </Button>
                <Button
                  type="button"
                  variant="secondary-neutral"
                  size="sm"
                  className={styles.button}
                  onClick={() => onPaginationModeChange('infinite')}
                >
                  {t('pagination.modeInfinite') || 'Infinite'}
                </Button>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary-neutral"
              size="sm"
              className={styles.button}
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
            >
              {(labels.first ?? t('pagination.first')) || 'First'}
            </Button>
            <Button
              type="button"
              variant="secondary-neutral"
              size="sm"
              className={styles.button}
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {(labels.prev ?? t('pagination.prev')) || 'Prev'}
            </Button>
            <PaginationPageEditor currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            <Button
              type="button"
              variant="secondary-neutral"
              size="sm"
              className={styles.button}
              onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {(labels.next ?? t('pagination.next')) || 'Next'}
            </Button>
            <Button
              type="button"
              variant="secondary-neutral"
              size="sm"
              className={styles.button}
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage === totalPages}
            >
              {(labels.last ?? t('pagination.last')) || 'Last'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
