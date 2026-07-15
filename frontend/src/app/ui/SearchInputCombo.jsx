import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from '@/ui/icons';
import Input from './Input';
import styles from './SearchInputCombo.module.css';

export default function SearchInputCombo({
  value,
  onChange,
  placeholder,
  selectedOption,
  onOptionChange,
  options = [],
  sources = [],
  selectedSource,
  onSourceChange,
  sourceLabel,
  optionLabel,
  rightElement,
  className = '',
  size = 'md',
  showSearchIcon = true,
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

  const activeOption = options.find(o => (o.value || o.id) === selectedOption) || options[0];
  const ActiveIcon = activeOption?.icon;
  const hasOptions = options.length > 0;
  const hasSources = sources && sources.length > 0;

  const normalizedSources = (sources || []).map(s => ({
    value: s.value || s.id,
    label: s.label || s.name,
  }));

  const iconSizeMap = {
    xs: 10,
    sm: 12,
    md: 12,
    lg: 14,
  };
  const activeIconSize = iconSizeMap[size] || 12;

  // Custom leftElement configuration
  const leftElement = (hasOptions || hasSources) ? (
    <div className={styles['left-wrapper']}>
      <button
        type="button"
        className={styles['selector-btn']}
        onClick={() => setIsOpen(!isOpen)}
      >
        {ActiveIcon && <ActiveIcon size={activeIconSize} className={styles['active-icon']} />}
        <span>{activeOption?.label || activeOption?.name}</span>
        <ChevronDown className={`${styles['chevron']} ${isOpen ? styles['is-open'] : ''}`} size={activeIconSize} />
      </button>
      <div className={styles['divider']} />
    </div>
  ) : showSearchIcon ? (
    <Search size={14} />
  ) : null;

  const wrapperClass = `${styles['search-input-combo-wrapper']} ${styles[`size-${size}`]} ${className}`.trim();

  return (
    <div className={wrapperClass} ref={containerRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        size={size}
        leftElement={leftElement}
        rightElement={rightElement}
        {...props}
      />
      {(hasOptions || hasSources) && isOpen && (
        <div className={`${styles['dropdown']} ${hasSources ? styles['dropdown--cascading'] : ''}`}>
          {hasSources ? (
            <>
              {/* Left Column: Sources */}
              <div className={`${styles['dropdown-column']} ${styles['dropdown-column--sources']}`}>
                {sourceLabel && <div className={styles['dropdown-header']}>{sourceLabel}</div>}
                {normalizedSources.map(source => (
                  <button
                    key={source.value}
                    type="button"
                    className={`${styles['dropdown-item']} ${selectedSource === source.value ? styles.isActive : ''}`}
                    onClick={() => onSourceChange?.(source.value)}
                  >
                    {source.label}
                  </button>
                ))}
              </div>

              {/* Right Column: Types */}
              <div className={`${styles['dropdown-column']} ${styles['dropdown-column--types']}`}>
                {optionLabel && <div className={styles['dropdown-header']}>{optionLabel}</div>}
                {options.map(option => {
                  const Icon = option.icon;
                  const optVal = option.value || option.id;
                  const optLabel = option.label || option.name;
                  return (
                    <button
                      key={optVal}
                      type="button"
                      className={`${styles['dropdown-item']} ${selectedOption === optVal ? styles.isActive : ''}`}
                      onClick={() => {
                        onOptionChange?.(optVal);
                        setIsOpen(false);
                      }}
                    >
                      {Icon && <Icon size={activeIconSize} className={styles['item-icon']} />}
                      <span>{optLabel}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            options.map(option => {
              const Icon = option.icon;
              const optVal = option.value || option.id;
              const optLabel = option.label || option.name;
              return (
                <button
                  key={optVal}
                  type="button"
                  className={`${styles['dropdown-item']} ${selectedOption === optVal ? styles.isActive : ''}`}
                  onClick={() => {
                    onOptionChange?.(optVal);
                    setIsOpen(false);
                  }}
                >
                  {Icon && <Icon size={activeIconSize} className={styles['item-icon']} />}
                  <span>{optLabel}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

SearchInputCombo.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  selectedOption: PropTypes.string,
  onOptionChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      id: PropTypes.string,
      label: PropTypes.string,
      name: PropTypes.string,
      icon: PropTypes.elementType,
    })
  ),
  sources: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      id: PropTypes.string,
      label: PropTypes.string,
      name: PropTypes.string,
    })
  ),
  selectedSource: PropTypes.string,
  onSourceChange: PropTypes.func,
  sourceLabel: PropTypes.string,
  optionLabel: PropTypes.string,
  rightElement: PropTypes.node,
  className: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  showSearchIcon: PropTypes.bool,
};
