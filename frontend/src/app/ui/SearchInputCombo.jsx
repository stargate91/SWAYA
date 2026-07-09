import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from '@/ui/icons';
import './SearchInputCombo.css';

export default function SearchInputCombo({
  value,
  onChange,
  placeholder,
  selectedOption,
  onOptionChange,
  options = [],
  rightElement,
  className = '',
  size = 'md',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = options.find(o => o.value === selectedOption) || options[0];
  const ActiveIcon = activeOption?.icon;

  return (
    <div className={`search-input-combo search-input-combo--${size} ${className}`.trim()} ref={containerRef}>
      <div className="search-input-combo__bar">
        {/* Selector Dropdown */}
        {options.length > 0 && (
          <div className="search-input-combo__selector-wrapper">
            <button
              type="button"
              className="search-input-combo__selector-btn"
              onClick={() => setIsOpen(!isOpen)}
            >
              {ActiveIcon && <ActiveIcon size={12} className="search-input-combo__active-icon" />}
              <span className="search-input-combo__active-label">
                {activeOption?.label}
              </span>
              <ChevronDown className={`search-input-combo__chevron ${isOpen ? 'is-open' : ''}`} size={12} />
            </button>

            {isOpen && (
              <div className="search-input-combo__dropdown">
                {options.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`search-input-combo__dropdown-item ${selectedOption === option.value ? 'is-active' : ''}`}
                      onClick={() => {
                        onOptionChange(option.value);
                        setIsOpen(false);
                      }}
                    >
                      {Icon && <Icon size={12} className="search-input-combo__item-icon" />}
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {options.length > 0 && <div className="search-input-combo__divider" />}

        {/* Input area */}
        <div className="search-input-combo__input-wrapper">
          <Search className="search-input-combo__search-icon" size={14} />
          <input
            type="text"
            className="search-input-combo__input"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            {...props}
          />
          {rightElement && (
            <div className="search-input-combo__right-element">
              {rightElement}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
