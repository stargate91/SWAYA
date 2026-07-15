import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from '@/ui/icons';
import Tooltip from './Tooltip';
import Checkbox from './Checkbox';
import { useTranslation } from '../providers/LanguageContext';
import Field from './Field';
import styles from './Dropdown.module.css';

function DropdownOptionItem({ opt, value, onOptionClick }) {
  const [isTruncated, setIsTruncated] = useState(false);
  const buttonRef = useRef(null);

  const checkTruncation = () => {
    if (buttonRef.current) {
      const isTextTruncated = buttonRef.current.scrollWidth > buttonRef.current.clientWidth;
      setIsTruncated(isTextTruncated);
    }
  };

  useEffect(() => {
    checkTruncation();
  }, [opt.label]);

  return (
    <Tooltip content={isTruncated ? opt.label : null} side="right" triggerClassName={styles.tooltipTrigger}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.item} ${opt.value === value ? styles.isActive : ''} ${opt.disabled ? styles.isDisabled : ''}`.trim()}
        onClick={() => !opt.disabled && onOptionClick(opt.value)}
        onMouseEnter={checkTruncation}
        title={null}
        disabled={Boolean(opt.disabled)}
      >
        {opt.label}
      </button>
    </Tooltip>
  );
}

function DropdownMenu({
  isOpen,
  menuCoords,
  options,
  value,
  onOptionClick,
  searchable,
  variant,
  className = '',
  themeColor = '',
  multiple = false,
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!menuRef.current || !menuCoords) return;
    menuRef.current.style.setProperty('--dropdown-menu-top', `${menuCoords.top}px`);
    menuRef.current.style.setProperty('--dropdown-menu-left', `${menuCoords.left}px`);
    menuRef.current.style.setProperty('--dropdown-menu-width', `${menuCoords.width}px`);
  }, [menuCoords]);

  if (!isOpen) {
    return null;
  }

  const filteredOptions = options.filter((opt) =>
    String(opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return createPortal(
    <div
      ref={menuRef}
      className={`${styles.menu} ${searchable ? styles.hasSearch : ''} ${menuCoords.openUpwards ? styles.isUpwards : ''} ${variant === 'sorter' ? styles.menuSorter : ''} ${className}`.trim()}
      // eslint-disable-next-line react/forbid-dom-props
      style={themeColor ? { '--list-theme-color': themeColor } : undefined}
    >
      {searchable ? (
        <div className={styles.searchContainer}>
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder={t('common.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
      <div className={`${styles.itemsWrapper} ${multiple ? styles.itemsWrapperMultiple : ''}`.trim()}>
        {filteredOptions.map((opt) => {
          if (multiple) {
            const isChecked = Array.isArray(value) && value.includes(opt.value);
            return (
              <div
                key={opt.value}
                className={`${styles.item} tags-dropdown-item ${styles.itemCheckbox}`}
              >
                <Checkbox
                  checked={isChecked}
                  onChange={() => !opt.disabled && onOptionClick(opt.value)}
                  disabled={Boolean(opt.disabled)}
                >
                  <span
                    className={styles.itemLabel}
                    // eslint-disable-next-line react/forbid-dom-props
                    style={opt.color ? { color: opt.color } : undefined}
                  >
                    {opt.label}
                  </span>
                </Checkbox>
              </div>
            );
          }

          return (
            <DropdownOptionItem
              key={opt.value}
              opt={opt}
              value={value}
              onOptionClick={onOptionClick}
            />
          );
        })}
        {filteredOptions.length === 0 ? (
          <div className={styles.noResults}>
            {t('common.noResults')}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default function Dropdown({
  label,
  options = [],
  value,
  onChange,
  hint,
  className = '',
  placeholder,
  searchable = false,
  disabled = false,
  variant = 'default',
  sortDirection = 'asc',
  onSortDirectionToggle,
  menuClassName = '',
  themeColor = '',
  multiple = false,
  layout = 'stacked',
  onFilterChange,
  setCurrentPage,
  size = 'md',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 0 });
  const generatedId = useId();

  const { t } = useTranslation();
  const displayPlaceholder = placeholder ?? t('common.select');
  const selectedOption = options.find((opt) => opt.value === value);

  const isSorter = variant === 'sorter' || layout === 'inline';
  const controlSize = isSorter ? 'xs' : size;

  const chevronSizeMap = {
    xs: 10,
    sm: 12,
    md: 12,
    lg: 14,
  };
  const chevronSize = chevronSizeMap[controlSize] || 12;

  const updateMenuCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const threshold = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < threshold && rect.top > spaceBelow;

      setMenuCoords({
        top: openUpwards
          ? rect.top + window.scrollY - 6
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: isSorter && multiple ? Math.max(rect.width, 220) : rect.width,
        openUpwards,
      });
    }
  }, [isSorter, multiple]);

  useEffect(() => {
    if (isOpen) {
      updateMenuCoords();
      window.addEventListener('scroll', updateMenuCoords, true);
      window.addEventListener('resize', updateMenuCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateMenuCoords, true);
      window.removeEventListener('resize', updateMenuCoords);
    };
  }, [isOpen, updateMenuCoords]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (event.target.closest(`.${styles.menu}`)) return;
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  const handleOptionClick = (val) => {
    if (onFilterChange) {
      onFilterChange(val);
    } else if (onChange) {
      let newValue;
      if (multiple) {
        const currentArray = Array.isArray(value) ? value : [];
        if (currentArray.includes(val)) {
          newValue = currentArray.filter((v) => v !== val);
        } else {
          newValue = [...currentArray, val];
        }
      } else {
        newValue = val;
      }
      onChange({ target: { value: newValue } });
    }
    if (setCurrentPage) {
      setCurrentPage(1);
    }
    if (!multiple) {
      setIsOpen(false);
    }
  };

  const getTriggerText = () => {
    if (multiple) {
      const selectedLabels = options
        .filter((opt) => Array.isArray(value) && value.includes(opt.value))
        .map((opt) => opt.label);
      if (selectedLabels.length === 0) {
        return placeholder ?? (t('library.filter.allTags') || 'All Tags');
      }
      return selectedLabels.join(', ');
    }
    return selectedOption ? selectedOption.label : displayPlaceholder;
  };

  const dropdownContent = (
    <div
      className={`${styles.dropdown} ${isSorter ? styles.dropdownSorter : ''}`.trim()}
      // eslint-disable-next-line react/forbid-dom-props
      style={themeColor ? { '--list-theme-color': themeColor } : undefined}
    >
      
      <div className={styles.sorterWrapper}>
        <button
          ref={triggerRef}
          type="button"
          className={`${styles.trigger} ${styles['trigger--' + controlSize]} ${multiple ? 'ui-dropdown__trigger--sorter-custom' : ''} ${disabled ? styles.isDisabled : ''} ${isOpen ? styles.isOpen : ''}`.trim()}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={styles.triggerText}>
            {getTriggerText()}
          </span>
          {(!isSorter || multiple) && (
            <span className={`${styles.chevron} ${isOpen ? styles.isOpen : ''} ${multiple ? styles.chevronMultiple : ''}`.trim()}>
              <ChevronDown size={chevronSize} />
            </span>
          )}
        </button>

        {isSorter && !multiple && onSortDirectionToggle && (
          <Tooltip content={sortDirection === 'asc' ? t('dropdown.ascending') : t('dropdown.descending')} side="top">
            <button
              type="button"
              className={styles.directionBtn}
              onClick={(e) => {
                e.stopPropagation();
                if (onSortDirectionToggle) onSortDirectionToggle();
              }}
              title={null}
            >
              {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </Tooltip>
        )}
      </div>

      <DropdownMenu
        isOpen={isOpen}
        menuCoords={menuCoords}
        options={options}
        value={value}
        onOptionClick={handleOptionClick}
        searchable={searchable}
        variant={variant === 'default' && layout === 'inline' ? 'sorter' : variant}
        className={menuClassName}
        themeColor={themeColor}
        multiple={multiple}
      />
    </div>
  );

  if (layout === 'inline') {
    return (
      <div ref={containerRef} className={`${styles.inlineContainer} ${className}`.trim()}>
        {label && <span className={styles.inlineLabel}>{label}</span>}
        {dropdownContent}
      </div>
    );
  }

  return (
    <Field
      label={label}
      hint={hint}
      className={`${isSorter ? styles.fieldSorter : ''} ${className}`.trim()}
      htmlFor={generatedId}
      ref={containerRef}
    >
      {dropdownContent}
    </Field>
  );
}
