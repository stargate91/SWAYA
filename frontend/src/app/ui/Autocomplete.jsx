import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import Input from './Input';
import styles from './Autocomplete.module.css';

/**
 * Autocomplete (Combobox) component that shows search suggestions under an Input field.
 */
export default function Autocomplete({
  value,
  onChange,
  options = [],
  onSelect,
  renderItem,
  renderFooter,
  size = 'md',
  placeholder,
  leftElement,
  rightElement,
  className = '',
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

  const handleSelectOption = (opt) => {
    onSelect(opt);
    setIsOpen(false);
  };

  return (
    <div className={`${styles.wrapper} ${className}`.trim()} ref={containerRef}>
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        size={size}
        placeholder={placeholder}
        leftElement={leftElement}
        rightElement={rightElement}
        {...props}
      />
      {isOpen && (options.length > 0 || renderFooter) && (
        <div className={styles.dropdown}>
          {options.map((opt, index) => (
            <button
              key={opt.id || opt.value || opt.name || index}
              type="button"
              className={styles.item}
              onClick={() => handleSelectOption(opt)}
            >
              {renderItem ? renderItem(opt) : (opt.name || opt.label || String(opt))}
            </button>
          ))}
          {renderFooter && renderFooter(() => setIsOpen(false), styles.item, styles['item-create'])}
        </div>
      )}
    </div>
  );
}

Autocomplete.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array,
  onSelect: PropTypes.func.isRequired,
  renderItem: PropTypes.func,
  renderFooter: PropTypes.func,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  placeholder: PropTypes.string,
  leftElement: PropTypes.node,
  rightElement: PropTypes.node,
  className: PropTypes.string,
};
