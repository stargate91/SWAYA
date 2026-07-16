import PropTypes from 'prop-types';
import { useId, useState } from 'react';
import { Eye, EyeOff } from '@/ui/icons';
import { useTranslation } from '../providers/LanguageContext';
import Field from './Field';
import styles from './Input.module.css';

export default function Input({
  label,
  hint,
  error,
  required,
  type,
  className = '',
  size = 'md',
  inputRef,
  leftElement,
  rightElement,
  expandOnFocus = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const { t } = useTranslation();

  const wrapperClass = `${styles['input-wrapper']} ${styles[`input-wrapper--${size}`]} ${
    error ? styles['input-wrapper--error'] : ''
  }`.trim();

  const fieldClass = `${styles['input-field']} ${
    expandOnFocus ? styles['input-field--expand-on-focus'] : ''
  } ${className}`.trim();

  const inputClass = `${styles['input']} ${styles[`input--${size}`]}`.trim();

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={fieldClass}
    >
      <div className={wrapperClass}>
        {leftElement && (
          <div className={styles['left-element']}>
            {leftElement}
          </div>
        )}
        <input
          id={inputId}
          ref={inputRef}
          className={inputClass}
          type={inputType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[
            hint ? hintId : null,
            error ? errorId : null,
          ].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles['input-toggle']}
            tabIndex={-1}
            aria-label={showPassword ? t('input.hidePassword') : t('input.showPassword')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {!isPassword && rightElement && (
          <div className={styles['right-element']}>
            {rightElement}
          </div>
        )}
      </div>
      {hint ? <span id={hintId} className={styles['sr-only']}>{hint}</span> : null}
    </Field>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
  leftElement: PropTypes.node,
  rightElement: PropTypes.node,
  expandOnFocus: PropTypes.bool,
};
