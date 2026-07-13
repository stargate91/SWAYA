import PropTypes from 'prop-types';
import './Field.css';

const REQUIRED_MARK = ' *';

export default function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className = '',
  children,
  ref,
}) {
  return (
    <div className={`ui-field ${className}`.trim()} ref={ref}>
      {label && (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-field__required" aria-hidden="true">{REQUIRED_MARK}</span>}
        </label>
      )}
      {hint && (
        <span className="ui-field__hint">
          {hint}
        </span>
      )}
      {children}
      {error && (
        <span className="ui-field__error">
          {error}
        </span>
      )}
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  error: PropTypes.node,
  required: PropTypes.bool,
  htmlFor: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
  ref: PropTypes.any,
};
