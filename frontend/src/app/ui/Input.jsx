import { useId, useState } from 'react';
import { Eye, EyeOff } from '@/ui/icons';
import { useTranslation } from '../providers/LanguageContext';
import Field from './Field';
import './Input.css';

export default function Input({ label, hint, error, required, type, className = '', size = 'md', inputRef, leftElement, rightElement, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasRightElement = isPassword || rightElement;
  const hasLeftElement = !!leftElement;

  const { t } = useTranslation();

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={`ui-input-field ${className}`.trim()}
    >
      <div className="ui-input__wrapper">
        {leftElement && (
          <div className="ui-input__left-element">
            {leftElement}
          </div>
        )}
        <input
          id={inputId}
          ref={inputRef}
          className={`ui-input ui-input--${size}${hasRightElement ? ' ui-input--has-right-element' : ''}${hasLeftElement ? ' ui-input--has-left-element' : ''}${error ? ' ui-input--error' : ''}`}
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
            className="ui-input__toggle"
            tabIndex={-1}
            aria-label={showPassword ? t('input.hidePassword') : t('input.showPassword')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {!isPassword && rightElement && (
          <div className="ui-input__right-element">
            {rightElement}
          </div>
        )}
      </div>
      {hint ? <span id={hintId} className="ui-field__sr-only">{hint}</span> : null}
    </Field>
  );
}
