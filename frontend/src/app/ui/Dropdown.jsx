/* eslint-disable react/forbid-dom-props */
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from '@/ui/icons';
import Tooltip from './Tooltip';
import Checkbox from './Checkbox';
import { useTranslation } from '../providers/LanguageContext';
import './Dropdown.css';

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
      className={`ui-dropdown__menu ${searchable ? 'has-search' : ''} ${menuCoords.openUpwards ? 'is-upwards' : ''} ${variant === 'sorter' ? 'ui-dropdown__menu--sorter' : ''} ${className}`.trim()}
      style={themeColor ? { '--list-theme-color': themeColor } : undefined}
    >
      {searchable ? (
        <div className="ui-dropdown__search-container">
          <input
            ref={searchInputRef}
            type="text"
            className="ui-dropdown__search-input"
            placeholder={t('common.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
      <div className="ui-dropdown__items-wrapper" style={multiple ? { maxHeight: '240px', overflowY: 'auto' } : undefined}>
        {filteredOptions.map((opt) => {
          if (multiple) {
            const isChecked = Array.isArray(value) && value.includes(opt.value);
            return (
              <div
                key={opt.value}
                className="ui-dropdown__item tags-dropdown-item"
                style={{ padding: 0, cursor: 'pointer', width: '100%' }}
              >
                <Checkbox
                  checked={isChecked}
                  onChange={() => !opt.disabled && onOptionClick(opt.value)}
                  disabled={Boolean(opt.disabled)}
                >
                  <span style={{
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: opt.color || 'var(--color-text-primary)',
                    fontWeight: 500
                  }}>
                    {opt.label}
                  </span>
                </Checkbox>
              </div>
            );
          }

          return (
            <Tooltip content={opt.label} side="right" key={opt.value}>
              <button
                type="button"
                className={`ui-dropdown__item ${opt.value === value ? 'is-active' : ''}${opt.disabled ? ' is-disabled' : ''}`}
                onClick={() => !opt.disabled && onOptionClick(opt.value)}
                title={null}
                disabled={Boolean(opt.disabled)}
              >
                {opt.label}
              </button>
            </Tooltip>
          );
        })}
        {filteredOptions.length === 0 ? (
          <div className="ui-dropdown__no-results">
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 0 });

  const { t } = useTranslation();
  const displayPlaceholder = placeholder ?? t('common.select');
  const selectedOption = options.find((opt) => opt.value === value);
  const isSorter = variant === 'sorter';

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
        if (event.target.closest('.ui-dropdown__menu')) return;
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  const handleOptionClick = (val) => {
    if (onChange) {
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

  return (
    <div className={`ui-field ${isSorter ? 'ui-field--sorter' : ''} ${className}`.trim()} ref={containerRef}>
      {label ? <span className="ui-field__label">{label}</span> : null}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
      <div
        className={`ui-dropdown ${isSorter ? 'ui-dropdown--sorter' : ''}`}
        style={themeColor ? { '--list-theme-color': themeColor } : undefined}
      >
        
        <div className="ui-dropdown__sorter-wrapper">
          <button
            ref={triggerRef}
            type="button"
            className={`ui-dropdown__trigger ${isSorter ? 'ui-dropdown__trigger--sorter' : ''} ${multiple ? 'ui-dropdown__trigger--sorter-custom' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
          >
            <span className="ui-dropdown__trigger-text" style={multiple ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : undefined}>
              {getTriggerText()}
            </span>
            {(!isSorter || multiple) && (
              <span className={`ui-dropdown__chevron ${isOpen ? 'is-open' : ''}`} style={multiple ? { display: 'flex', alignItems: 'center' } : undefined}>
                <ChevronDown size={12} />
              </span>
            )}
          </button>

          {isSorter && !multiple && onSortDirectionToggle && (
            <Tooltip content={sortDirection === 'asc' ? t('dropdown.ascending') : t('dropdown.descending')} side="top">
              <button
                type="button"
                className="ui-dropdown__direction-btn"
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
          variant={variant}
          className={menuClassName}
          themeColor={themeColor}
          multiple={multiple}
        />
      </div>
    </div>
  );
}
