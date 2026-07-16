import PropTypes from 'prop-types';
import styles from './ChoiceField.module.css';

export default function ChoiceField() {
  return null;
}

ChoiceField.Input = function ChoiceInput({ className = '', ...props }) {
  return (
    <input
      className={`${styles.input} ${className}`}
      {...props}
    />
  );
};

ChoiceField.Title = function ChoiceTitle({ isActive, className = '', children, ...props }) {
  return (
    <span
      className={`${styles.title} ${isActive ? styles['is-active'] : ''} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

ChoiceField.Description = function ChoiceDescription({ className = '', children, ...props }) {
  return (
    <span
      className={`${styles.description} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

ChoiceField.LabelText = function ChoiceLabelText({ className = '', children, ...props }) {
  return (
    <span
      className={`${styles['label-text']} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

ChoiceField.Input.propTypes = { className: PropTypes.string };
ChoiceField.Title.propTypes = { isActive: PropTypes.bool, className: PropTypes.string, children: PropTypes.node };
ChoiceField.Description.propTypes = { className: PropTypes.string, children: PropTypes.node };
ChoiceField.LabelText.propTypes = { className: PropTypes.string, children: PropTypes.node };
